import { eventUsageLogic } from './eventUsageLogic'
import { AnyPartialFilterType, InsightType, Experiment, PropertyFilterType } from '~/types'
import { resetContext } from 'kea'
import { initKea } from '~/initKea'
import posthog from 'posthog-js'
import { NodeKind } from '~/queries/schema'
import { FunnelsQuery, InsightVizNode, PropertyGroupFilter, TrendsQuery } from '~/queries/schema/types'

// The function under test, sanitizeFilterParams, is not exported from its module.
// To test it, we must do so via the exported `eventUsageLogic` which uses it.
// We will trigger an action whose listener calls `sanitizeFilterParams` and then
// assert that the side-effect (a `posthog.capture` call) is as expected.

jest.mock('posthog-js', () => ({
    capture: jest.fn(),
}))

describe('sanitizeFilterParams', () => {
    beforeEach(() => {
        resetContext()
        initKea()
        eventUsageLogic.mount()
        ;(posthog.capture as jest.Mock).mockClear()
    })

    it('should return an object containing top-level fields when they are present in the input', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            interval: 'week',
            date_from: '2023-01-01',
            date_to: '2023-01-31',
            filter_test_accounts: true,
            insight: InsightType.FUNNELS,
        }

        // We use a mock experiment object to pass the filters to a listener that uses sanitizeFilterParams
        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        // We call an action that uses `sanitizeFilterParams` internally
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        // We check that posthog.capture was called with the sanitized data
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    interval: 'week',
                    date_from: '2023-01-01',
                    date_to: '2023-01-31',
                    filter_test_accounts: true,
                    insight: InsightType.FUNNELS,
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.interval).toBe('week')
        expect(sanitizedFilters.date_from).toBe('2023-01-01')
        expect(sanitizedFilters.date_to).toBe('2023-01-31')
        expect(sanitizedFilters.filter_test_accounts).toBe(true)
        expect(sanitizedFilters.insight).toBe(InsightType.FUNNELS)
    })

    it('should correctly count and flatten properties, events, and actions into filters_count, events_count, actions_count, properties_global, properties_local, and properties_all when these arrays are present in the input filters', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            properties: [{ key: 'prop1', value: 'val1', type: PropertyFilterType.Person }],
            events: [{ id: 1, name: 'event1' }],
            actions: [{ id: 2, name: 'action1' }],
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    filters_count: 1,
                    events_count: 1,
                    actions_count: 1,
                    properties_global: ['redacted'],
                    properties_local: [],
                    properties_all: ['redacted'],
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.filters_count).toBe(1)
        expect(sanitizedFilters.events_count).toBe(1)
        expect(sanitizedFilters.actions_count).toBe(1)
        expect(sanitizedFilters.properties_global).toEqual(['redacted'])
        expect(sanitizedFilters.properties_local).toEqual([])
        expect(sanitizedFilters.properties_all).toEqual(['redacted'])
    })

    it('should include the formula field in the output when the input filters represent a trends insight', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            insight: InsightType.TRENDS,
            formula: 'A + B',
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    formula: 'A + B',
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.formula).toBe('A + B')
    })

    it('should include funnel_viz_type, funnel_from_step, and funnel_to_step in the output when the input filters represent a funnels insight', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            insight: InsightType.FUNNELS,
            funnel_viz_type: 'steps',
            funnel_from_step: 1,
            funnel_to_step: 3,
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    funnel_viz_type: 'steps',
                    funnel_from_step: 1,
                    funnel_to_step: 3,
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.funnel_viz_type).toBe('steps')
        expect(sanitizedFilters.funnel_from_step).toBe(1)
        expect(sanitizedFilters.funnel_to_step).toBe(3)
    })

    it('should set aggregating_by_groups and breakdown_by_groups to true when aggregation_group_type_index or breakdown_group_type_index are present', () => {
        const inputFilters: AnyPartialFilterType = {
            aggregation_group_type_index: 0,
            breakdown_group_type_index: 1,
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    aggregating_by_groups: true,
                    breakdown_by_groups: true,
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.aggregating_by_groups).toBe(true)
        expect(sanitizedFilters.breakdown_by_groups).toBe(true)
    })

    it('should extract and return used_cohort_filter_ids when properties with type cohort are present', () => {
        // Arrange
        const cohortId = 123
        const inputFilters: AnyPartialFilterType = {
            properties: [
                {
                    key: 'some_property',
                    value: cohortId,
                    type: PropertyFilterType.Cohort,
                    operator: 'exact',
                },
            ],
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    used_cohort_filter_ids: [cohortId],
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.used_cohort_filter_ids).toEqual([cohortId])
    })

    it('should handle entities with null properties gracefully', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            events: [
                {
                    id: '$pageview',
                    name: '$pageview',
                    type: 'events',
                    properties: null,
                },
            ],
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    properties_local: [],
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters
        expect(sanitizedFilters.properties_local).toEqual([])
    })

    it('should handle undefined or null filters.events and filters.actions gracefully', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            events: undefined,
            actions: null,
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    events_count: 0,
                    actions_count: 0,
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.events_count).toBe(0)
        expect(sanitizedFilters.actions_count).toBe(0)
    })

    it('should handle non-numeric cohort IDs', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            properties: [
                {
                    key: 'cohort_id',
                    value: 'not a number',
                    type: PropertyFilterType.Cohort,
                },
            ],
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    used_cohort_filter_ids: ['not a number'],
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.used_cohort_filter_ids).toEqual(['not a number'])
    })

    it('should correctly count custom properties in properties_global_custom_count and properties_local_custom_count when both core and custom properties are present', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            properties: [
                { key: 'name', value: 'John', type: PropertyFilterType.Person },
                { key: 'custom_property', value: 'value', type: PropertyFilterType.Person },
            ],
            events: [
                {
                    id: '$pageview',
                    name: '$pageview',
                    properties: [
                        { key: 'os', value: 'Windows', type: PropertyFilterType.Event },
                        { key: 'custom_event_property', value: 'value', type: PropertyFilterType.Event },
                    ],
                },
            ],
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    properties_global_custom_count: 1,
                    properties_local_custom_count: 1,
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.properties_global_custom_count).toBe(1)
        expect(sanitizedFilters.properties_local_custom_count).toBe(1)
    })

    it('should handle filters with breakdown specified but no breakdown_type', () => {
        // Arrange
        const inputFilters: AnyPartialFilterType = {
            breakdown: '$browser',
        }

        const mockExperiment = {
            id: 1,
            name: 'Test Experiment',
            filters: inputFilters,
            created_at: '2023-01-01T00:00:00Z',
            created_by: { id: 1, uuid: 'uuid', first_name: 'test' },
            start_date: '2023-01-01T00:00:00Z',
            parameters: {},
            secondary_metrics: [],
        } as Experiment

        // Act
        eventUsageLogic.actions.reportExperimentArchived(mockExperiment)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'experiment archived',
            expect.objectContaining({
                filters: expect.objectContaining({
                    breakdown: '$browser',
                }),
            })
        )

        const capturedPayload = (posthog.capture as jest.Mock).mock.calls[0][1]
        const sanitizedFilters = capturedPayload.filters

        expect(sanitizedFilters.breakdown).toBe('$browser')
    })
})

describe('sanitizeQuery', () => {
    beforeEach(() => {
        resetContext()
        initKea()
        eventUsageLogic.mount()
        ;(posthog.capture as jest.Mock).mockClear()
    })

    it('should return an object with all expected analytics fields for a full InsightVizNode', () => {
        // Arrange
        const mockQuerySource: FunnelsQuery = {
            kind: NodeKind.FunnelsQuery,
            dateRange: { date_from: '2023-01-01', date_to: '2023-01-31' },
            interval: 'day',
            series: [
                { kind: NodeKind.EventsNode, event: '$pageview' },
                { kind: NodeKind.ActionsNode, id: 1 },
                { kind: NodeKind.DataWarehouseNode, table_name: 'my_table' },
            ],
            properties: { type: 'AND', values: [] } as PropertyGroupFilter,
            filterTestAccounts: true,
            breakdownFilter: {
                breakdown_type: 'event',
                breakdown: '$current_url',
                breakdown_limit: 10,
                breakdown_hide_other_aggregation: true,
            },
            funnelsFilter: {
                funnelVizType: 'Steps',
                funnelOrderType: 'Strict',
                layout: 'FunnelViz',
            },
        }

        const mockInsightVizNode: InsightVizNode = {
            kind: NodeKind.InsightVizNode,
            source: mockQuerySource,
        }

        // Act
        // We call an action that uses `sanitizeQuery` internally
        eventUsageLogic.actions.reportInsightSaved(mockInsightVizNode, true)

        // Assert
        // We check that posthog.capture was called with the sanitized data
        const expectedSanitizedQuery = {
            query_kind: NodeKind.InsightVizNode,
            query_source_kind: NodeKind.FunnelsQuery,
            date_from: '2023-01-01',
            date_to: '2023-01-31',
            interval: 'day',
            series_length: 3,
            event_entity_count: 1,
            action_entity_count: 1,
            data_warehouse_entity_count: 1,
            has_data_warehouse_series: true,
            has_properties: true,
            filter_test_accounts: true,
            breakdown_type: 'event',
            breakdown_limit: 10,
            breakdown_hide_other_aggregation: true,
            has_formula: false, // Not a TrendsQuery, so this is false
            funnel_viz_type: 'Steps',
            funnel_order_type: 'Strict',
        }

        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                ...expectedSanitizedQuery,
                is_new_insight: true,
            })
        )
    })

    // [Tusk] FAILING TEST
    it('should return an object with all expected analytics fields when the input query is an InsightQueryNode with all relevant properties set', () => {
        const mockTrendsQuery: TrendsQuery = {
            kind: NodeKind.TrendsQuery,
            dateRange: { date_from: '2023-02-01', date_to: '2023-02-28' },
            interval: 'week',
            series: [
                { kind: NodeKind.EventsNode, event: '$pageview' },
                { kind: NodeKind.ActionsNode, id: 2 },
            ],
            properties: { type: 'AND', values: [] } as PropertyGroupFilter,
            filterTestAccounts: false,
            breakdownFilter: {
                breakdown_type: 'property',
                breakdown: 'country',
                breakdown_limit: 5,
                breakdown_hide_other_aggregation: false,
            },
            trendsFilter: {
                formula: 'A + B',
                display: 'Stacked',
            },
        }

        // Act
        eventUsageLogic.actions.reportInsightSaved(mockTrendsQuery, false)

        // Assert
        const expectedSanitizedQuery = {
            query_kind: NodeKind.TrendsQuery,
            date_from: '2023-02-01',
            date_to: '2023-02-28',
            interval: 'week',
            series_length: 2,
            event_entity_count: 1,
            action_entity_count: 1,
            data_warehouse_entity_count: 0,
            has_data_warehouse_series: false,
            has_properties: true,
            filter_test_accounts: false,
            breakdown_type: 'property',
            breakdown_limit: 5,
            breakdown_hide_other_aggregation: false,
            has_formula: true,
            display: 'Stacked',
        }

        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                ...expectedSanitizedQuery,
                is_new_insight: false,
            })
        )
    })

    it('should properly clean the payload of any undefined or null values, especially for complex nested query structures', () => {
        // Arrange
        const mockQuerySource: FunnelsQuery = {
            kind: NodeKind.FunnelsQuery,
            dateRange: { date_from: '2023-01-01', date_to: null },
            interval: undefined,
            series: [
                { kind: NodeKind.EventsNode, event: '$pageview' },
                { kind: NodeKind.ActionsNode, id: 1 },
                { kind: NodeKind.DataWarehouseNode, table_name: 'my_table' },
            ],
            properties: { type: 'AND', values: [] } as PropertyGroupFilter,
            filterTestAccounts: true,
            breakdownFilter: {
                breakdown_type: 'event',
                breakdown: '$current_url',
                breakdown_limit: null,
                breakdown_hide_other_aggregation: true,
            },
            funnelsFilter: {
                funnelVizType: 'Steps',
                funnelOrderType: undefined,
                layout: 'FunnelViz',
            },
        }

        const mockInsightVizNode: InsightVizNode = {
            kind: NodeKind.InsightVizNode,
            source: mockQuerySource,
        }

        // Act
        eventUsageLogic.actions.reportInsightSaved(mockInsightVizNode, true)

        // Assert
        const expectedSanitizedQuery = {
            query_kind: NodeKind.InsightVizNode,
            query_source_kind: NodeKind.FunnelsQuery,
            date_from: '2023-01-01',
            has_data_warehouse_series: true,
            has_properties: true,
            filter_test_accounts: true,
            breakdown_type: 'event',
            breakdown_hide_other_aggregation: true,
            has_formula: false,
            funnel_viz_type: 'Steps',
            series_length: 3,
            event_entity_count: 1,
            action_entity_count: 1,
            data_warehouse_entity_count: 1,
        }

        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                ...expectedSanitizedQuery,
                is_new_insight: true,
            })
        )
    })

    it('should handle InsightVizNode with malformed source property', () => {
        // Arrange
        const malformedInsightVizNode: InsightVizNode = {
            kind: NodeKind.InsightVizNode,
            // @ts-expect-error
            source: {
                // Missing or malformed source properties
            },
        }

        // Act
        eventUsageLogic.actions.reportInsightSaved(malformedInsightVizNode, true)

        // Assert
        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                query_kind: NodeKind.InsightVizNode,
                has_data_warehouse_series: false,
                has_formula: false,
                has_properties: false,
                is_new_insight: true
            })
        )
    })

    // [Tusk] FAILING TEST
    it('should handle InsightVizNode where getSeries() returns undefined', () => {
        const mockQuerySource: FunnelsQuery = {
            kind: NodeKind.FunnelsQuery,
        }

        const mockInsightVizNode: InsightVizNode = {
            kind: NodeKind.InsightVizNode,
            source: mockQuerySource,
        }

        eventUsageLogic.actions.reportInsightSaved(mockInsightVizNode, true)

        const expectedSanitizedQuery = {
            query_kind: NodeKind.InsightVizNode,
            query_source_kind: NodeKind.FunnelsQuery,
            series_length: undefined,
            event_entity_count: undefined,
            action_entity_count: undefined,
            data_warehouse_entity_count: undefined,
            has_data_warehouse_series: false,
            has_properties: false,
            filter_test_accounts: undefined,
            breakdown_type: undefined,
            breakdown_limit: undefined,
            breakdown_hide_other_aggregation: undefined,
            has_formula: false,
            funnel_viz_type: undefined,
            funnel_order_type: undefined,
            date_from: undefined,
            date_to: undefined,
            interval: undefined,
            samplingFactor: undefined,
        }

        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                ...expectedSanitizedQuery,
                is_new_insight: true,
            })
        )
    })

    // [Tusk] FAILING TEST
    it('should handle query objects with unexpected property types (number instead of string)', () => {
        // Arrange
        const mockQuerySource: FunnelsQuery = {
            kind: NodeKind.FunnelsQuery,
            dateRange: { date_from: 20230101 as any, date_to: '2023-01-31' }, // date_from is a number
            interval: 'day',
            series: [{ kind: NodeKind.EventsNode, event: '$pageview' }],
            properties: { type: 'AND', values: [] } as PropertyGroupFilter,
            filterTestAccounts: true,
        }

        const mockInsightVizNode: InsightVizNode = {
            kind: NodeKind.InsightVizNode,
            source: mockQuerySource,
        }

        // Act
        eventUsageLogic.actions.reportInsightSaved(mockInsightVizNode, true)

        // Assert
        const expectedSanitizedQuery = {
            query_kind: NodeKind.InsightVizNode,
            query_source_kind: NodeKind.FunnelsQuery,
            date_from: '20230101', // Should be converted to string
            date_to: '2023-01-31',
            interval: 'day',
            series_length: 1,
            event_entity_count: 1,
            action_entity_count: 0,
            data_warehouse_entity_count: 0,
            has_data_warehouse_series: false,
            has_properties: true,
            filter_test_accounts: true,
            has_formula: false,
        }

        expect(posthog.capture).toHaveBeenCalledWith(
            'insight saved',
            expect.objectContaining({
                ...expectedSanitizedQuery,
                is_new_insight: true,
            })
        )
    })
})