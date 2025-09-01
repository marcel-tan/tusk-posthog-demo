import { dayjs } from 'lib/dayjs'
import { shortTimeZone } from '../utils'

export interface UserTimeZoneInfo {
    name: string
    abbreviation: string | null
    offset: string
    offsetMinutes: number
    formatted: string
}

/**
 * Formats timezone information for display to users
 * @param timeZone IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @param atDate Optional date to calculate timezone info for (defaults to now)
 * @returns Formatted timezone information object
 */
export function formatUserTimeZone(timeZone?: string, atDate?: Date): UserTimeZoneInfo {
    const effectiveTimeZone = timeZone || dayjs.tz.guess()
    const date = atDate || new Date()
    
    // Get timezone abbreviation (e.g., 'EST', 'PST', 'UTC+2')
    const abbreviation = shortTimeZone(effectiveTimeZone, date)
    
    // Calculate offset
    const dayjsDate = dayjs(date).tz(effectiveTimeZone)
    const offsetMinutes = dayjsDate.utcOffset()
    const offsetHours = offsetMinutes / 60
    const offsetFormatted = formatTimeZoneOffset(offsetHours)
    
    // Create human-readable name from IANA identifier
    const friendlyName = timeZone ? formatTimeZoneName(effectiveTimeZone) : 'Auto-detected'
    
    // Combine into formatted string
    const formatted = abbreviation 
        ? `${friendlyName} (${abbreviation}, ${offsetFormatted})`
        : `${friendlyName} (${offsetFormatted})`

    return {
        name: friendlyName,
        abbreviation,
        offset: offsetFormatted,
        offsetMinutes,
        formatted
    }
}

/**
 * Formats a timezone offset as a string (e.g., '+05:30', '-08:00', '+00:00')
 */
export function formatTimeZoneOffset(offsetHours: number): string {
    const sign = offsetHours >= 0 ? '+' : '-'
    const absOffset = Math.abs(offsetHours)
    const hours = Math.floor(absOffset)
    const minutes = Math.round((absOffset - hours) * 60)
    
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Converts IANA timezone identifier to human-readable name
 * @param timeZone IANA timezone identifier
 * @returns Human-readable timezone name
 */
export function formatTimeZoneName(timeZone: string): string {
    // Handle special cases
    if (timeZone === 'UTC') {
        return 'UTC'
    }
    
    // Extract city/region from IANA identifier
    const parts = timeZone.split('/')
    if (parts.length < 2) {
        return timeZone
    }
    
    const region = parts[0]
    const city = parts[parts.length - 1]
    
    // Format city name (replace underscores with spaces, capitalize)
    const formattedCity = city
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    
    // Special handling for some regions
    const regionMap: Record<string, string> = {
        'America': 'Americas',
        'Europe': 'Europe',
        'Asia': 'Asia',
        'Africa': 'Africa',
        'Australia': 'Australia',
        'Pacific': 'Pacific',
        'Atlantic': 'Atlantic',
        'Indian': 'Indian Ocean'
    }
    
    const formattedRegion = regionMap[region] || region
    
    return `${formattedCity} (${formattedRegion})`
}

/**
 * Gets timezone information for common business timezones
 * @param atDate Optional date to calculate timezone info for
 * @returns Array of timezone info for common business zones
 */
export function getCommonBusinessTimeZones(atDate?: Date): UserTimeZoneInfo[] {
    const commonZones = [
        'UTC',
        'America/New_York',    // Eastern Time
        'America/Chicago',     // Central Time  
        'America/Denver',      // Mountain Time
        'America/Los_Angeles', // Pacific Time
        'Europe/London',       // GMT/BST
        'Europe/Berlin',       // CET/CEST
        'Asia/Tokyo',          // JST
        'Asia/Shanghai',       // CST
        'Asia/Kolkata',        // IST
        'Australia/Sydney'     // AEST/AEDT
    ]
    
    return commonZones.map(zone => formatUserTimeZone(zone, atDate))
}

/**
 * Determines if a timezone observes daylight saving time
 * @param timeZone IANA timezone identifier
 * @returns true if timezone observes DST
 */
export function observesDaylightSaving(timeZone: string): boolean {
    const winter = new Date(2023, 0, 1) // January 1st
    const summer = new Date(2023, 6, 1) // July 1st
    
    const winterOffset = dayjs(winter).tz(timeZone).utcOffset()
    const summerOffset = dayjs(summer).tz(timeZone).utcOffset()
    
    return winterOffset !== summerOffset
}
