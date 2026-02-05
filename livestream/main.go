package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/spf13/viper"
)

func main() {
	loadConfigs()

	isProd := viper.GetBool("prod")

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              viper.GetString("sentry.dsn"),
		Debug:            isProd,
		AttachStacktrace: true,
	})
	if err != nil {
		sentry.CaptureException(err)
		log.Fatalf("sentry.Init: %s", err)
	}
	// Flush buffered events before the program terminates.
	// Set the timeout to the maximum duration the program can afford to wait.
	defer sentry.Flush(2 * time.Second)

	mmdb := viper.GetString("mmdb.path")
	if mmdb == "" {
		sentry.CaptureException(errors.New("mmdb.path must be set"))
		log.Fatal("mmdb.path must be set")
	}
	brokers := viper.GetString("kafka.brokers")
	if brokers == "" {
		sentry.CaptureException(errors.New("kafka.brokers must be set"))
		log.Fatal("kafka.brokers must be set")
	}
	topic := viper.GetString("kafka.topic")
	if topic == "" {
		sentry.CaptureException(errors.New("kafka.topic must be set"))
		log.Fatal("kafka.topic must be set")
	}
	groupID := viper.GetString("kafka.group_id")
	if groupID == "" {
		sentry.CaptureException(errors.New("kafka.group_id must be set"))
		log.Fatal("kafka.group_id must be set")
	}

	geolocator, err := NewMaxMindGeoLocator(mmdb)
	if err != nil {
		sentry.CaptureException(err)
		log.Fatalf("Failed to open MMDB: %v", err)
	}

	// Create a context that will be cancelled on shutdown signals
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	stats := newStatsKeeper()

	phEventChan := make(chan PostHogEvent)
	statsChan := make(chan PostHogEvent)
	subChan := make(chan Subscription)
	unSubChan := make(chan Subscription)

	// WaitGroup to track goroutines for graceful shutdown
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		stats.keepStats(ctx, statsChan)
	}()

	kafkaSecurityProtocol := "SSL"
	if !isProd {
		kafkaSecurityProtocol = "PLAINTEXT"
	}
	consumer, err := NewPostHogKafkaConsumer(brokers, kafkaSecurityProtocol, groupID, topic, geolocator, phEventChan, statsChan)
	if err != nil {
		sentry.CaptureException(err)
		log.Fatalf("Failed to create Kafka consumer: %v", err)
	}
	defer consumer.Close()

	wg.Add(1)
	go func() {
		defer wg.Done()
		consumer.Consume(ctx)
	}()

	filter := NewFilter(subChan, unSubChan, phEventChan)

	wg.Add(1)
	go func() {
		defer wg.Done()
		filter.Run(ctx)
	}()

	// Echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Level: 9, // Set compression level to maximum
	}))

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead},
	}))
	e.File("/", "./index.html")

	// Routes
	e.GET("/", index)

	e.GET("/served", servedHandler(stats))

	e.GET("/stats", statsHandler(stats))

	e.GET("/events", func(c echo.Context) error {
		e.Logger.Printf("SSE client connected, ip: %v", c.RealIP())

		var teamId string
		eventType := c.QueryParam("eventType")
		distinctId := c.QueryParam("distinctId")
		geo := c.QueryParam("geo")

		teamIdInt := 0
		token := ""
		geoOnly := false

		if strings.ToLower(geo) == "true" || geo == "1" {
			geoOnly = true
		} else {
			teamId = ""

			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return errors.New("authorization header is required")
			}

			claims, err := decodeAuthToken(authHeader)
			if err != nil {
				return err
			}
			teamId = strconv.Itoa(int(claims["team_id"].(float64)))
			token = fmt.Sprint(claims["api_token"])

			if teamId == "" {
				return errors.New("teamId is required unless geo=true")
			}
		}

		eventTypes := []string{}
		if eventType != "" {
			eventTypes = strings.Split(eventType, ",")
		}

		subscription := Subscription{
			TeamId:      teamIdInt,
			Token:       token,
			ClientId:    c.Response().Header().Get(echo.HeaderXRequestID),
			DistinctId:  distinctId,
			Geo:         geoOnly,
			EventTypes:  eventTypes,
			EventChan:   make(chan interface{}, 100),
			ShouldClose: &atomic.Bool{},
		}

		subChan <- subscription

		w := c.Response()
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		for {
			select {
			case <-c.Request().Context().Done():
				e.Logger.Printf("SSE client disconnected, ip: %v", c.RealIP())
				filter.unSubChan <- subscription
				subscription.ShouldClose.Store(true)
				return nil
			case payload := <-subscription.EventChan:
				jsonData, err := json.Marshal(payload)
				if err != nil {
					sentry.CaptureException(err)
					log.Println("Error marshalling payload", err)
					continue
				}

				event := Event{
					Data: jsonData,
				}
				if err := event.WriteTo(w); err != nil {
					return err
				}
				w.Flush()
			}
		}
	})

	e.GET("/jwt", func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return errors.New("authorization header is required")
		}

		claims, err := decodeAuthToken(authHeader)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, claims)
	})

	e.GET("/sse", func(c echo.Context) error {
		e.Logger.Printf("Map client connected, ip: %v", c.RealIP())

		w := c.Response()
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-c.Request().Context().Done():
				e.Logger.Printf("SSE client disconnected, ip: %v", c.RealIP())
				return nil
			case <-ticker.C:
				event := Event{
					Data: []byte("ping: " + time.Now().Format(time.RFC3339Nano)),
				}
				if err := event.WriteTo(w); err != nil {
					return err
				}
				w.Flush()
			}
		}
	})

	// Start server in a goroutine
	go func() {
		if err := e.Start(":8080"); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server")
		}
	}()

	// Wait for shutdown signal
	sig := <-sigChan
	log.Printf("Received signal %v, initiating graceful shutdown...", sig)

	// Create a deadline for graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	// Shutdown Echo server gracefully
	if err := e.Shutdown(shutdownCtx); err != nil {
		e.Logger.Error(err)
	}
	log.Println("HTTP server shutdown complete")

	// Cancel the main context to signal all goroutines to stop
	cancel()

	// Close channels to unblock goroutines
	close(phEventChan)
	close(statsChan)
	close(subChan)
	close(unSubChan)

	// Wait for all goroutines to finish with a timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("All goroutines stopped gracefully")
	case <-time.After(5 * time.Second):
		log.Println("Timeout waiting for goroutines to stop")
	}

	log.Println("Shutdown complete")
}
