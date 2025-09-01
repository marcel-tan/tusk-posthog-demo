import { dayjs } from 'lib/dayjs'
import { formatUserTimeZone, getCommonBusinessTimeZones, observesDaylightSaving } from './formatUserTimeZone'

// Mock dayjs.tz.guess for consistent testing
jest.mock('lib/dayjs', () => {
    const actualDayjs = jest.requireActual('lib/dayjs')
    return {
        ...actualDayjs,
        dayjs: {
            ...actualDayjs.dayjs,
            tz: {
                ...actualDayjs.dayjs.tz,
                guess: jest.fn(() => 'America/New_York')
            }
        }
    }
})

describe('formatUserTimeZone', () => {
    const fixedDate = new Date('2023-07-15T12:00:00Z') // Summer time for DST testing

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('formatUserTimeZone', () => {
        it('formats UTC timezone correctly', () => {
            const result = formatUserTimeZone('UTC', fixedDate)
            
            expect(result.name).toBe('UTC')
            expect(result.offset).toBe('+00:00')
            expect(result.offsetMinutes).toBe(0)
            expect(result.formatted).toContain('UTC')
            expect(result.formatted).toContain('+00:00')
        })

        it('formats Eastern timezone correctly during summer', () => {
            const result = formatUserTimeZone('America/New_York', fixedDate)
            
            expect(result.name).toBe('New York (Americas)')
            expect(result.offset).toBe('-04:00') // EDT in summer
            expect(result.offsetMinutes).toBe(-240)
            expect(result.formatted).toContain('New York (Americas)')
        })

        it('formats European timezone correctly', () => {
            const result = formatUserTimeZone('Europe/London', fixedDate)
            
            expect(result.name).toBe('London (Europe)')
            expect(result.offset).toBe('+01:00') // BST in summer
            expect(result.offsetMinutes).toBe(60)
            expect(result.formatted).toContain('London (Europe)')
        })

        it('handles timezone with underscores in city name', () => {
            const result = formatUserTimeZone('America/Los_Angeles', fixedDate)
            
            expect(result.name).toBe('Los Angeles (Americas)')
            expect(result.formatted).toContain('Los Angeles (Americas)')
        })

        it('handles complex timezone names', () => {
            const result = formatUserTimeZone('America/Argentina/Buenos_Aires', fixedDate)
            
            expect(result.name).toBe('Buenos Aires (Americas)')
            expect(result.formatted).toContain('Buenos Aires (Americas)')
        })

        it('uses auto-detected timezone when none provided', () => {
            const result = formatUserTimeZone(undefined, fixedDate)
            
            expect(result.name).toBe('Auto-detected')
            expect(result.formatted).toContain('Auto-detected')
        })

        it('handles positive timezone offsets correctly', () => {
            const result = formatUserTimeZone('Asia/Tokyo', fixedDate)
            
            expect(result.name).toBe('Tokyo (Asia)')
            expect(result.offset).toBe('+09:00')
            expect(result.offsetMinutes).toBe(540)
        })

        it('handles half-hour timezone offsets', () => {
            const result = formatUserTimeZone('Asia/Kolkata', fixedDate)
            
            expect(result.name).toBe('Kolkata (Asia)')
            expect(result.offset).toBe('+05:30')
            expect(result.offsetMinutes).toBe(330)
        })

        it('handles quarter-hour timezone offsets', () => {
            const result = formatUserTimeZone('Australia/Eucla', fixedDate)
            
            expect(result.name).toBe('Eucla (Australia)')
            expect(result.offset).toBe('+08:45')
            expect(result.offsetMinutes).toBe(525)
        })

        it('uses current date when no date provided', () => {
            const result = formatUserTimeZone('UTC')
            
            expect(result.name).toBe('UTC')
            expect(result.offset).toBe('+00:00')
            expect(typeof result.formatted).toBe('string')
        })

        it('formats negative offsets correctly', () => {
            const result = formatUserTimeZone('Pacific/Honolulu', fixedDate)
            
            expect(result.name).toBe('Honolulu (Pacific)')
            expect(result.offset).toBe('-10:00')
            expect(result.offsetMinutes).toBe(-600)
        })
    })

    describe('getCommonBusinessTimeZones', () => {
        it('returns array of common business timezones', () => {
            const result = getCommonBusinessTimeZones(fixedDate)
            
            expect(result).toHaveLength(11)
            expect(result[0].name).toBe('UTC')
            expect(result.some(tz => tz.name.includes('New York'))).toBe(true)
            expect(result.some(tz => tz.name.includes('London'))).toBe(true)
            expect(result.some(tz => tz.name.includes('Tokyo'))).toBe(true)
        })

        it('all returned timezones have required properties', () => {
            const result = getCommonBusinessTimeZones(fixedDate)
            
            result.forEach(tz => {
                expect(tz.name).toBeDefined()
                expect(tz.offset).toBeDefined()
                expect(typeof tz.offsetMinutes).toBe('number')
                expect(tz.formatted).toBeDefined()
            })
        })

        it('works without providing a date', () => {
            const result = getCommonBusinessTimeZones()
            
            expect(result).toHaveLength(11)
            expect(result[0].name).toBe('UTC')
        })
    })

    describe('observesDaylightSaving', () => {
        it('returns true for timezones that observe DST', () => {
            expect(observesDaylightSaving('America/New_York')).toBe(true)
            expect(observesDaylightSaving('Europe/London')).toBe(true)
            expect(observesDaylightSaving('Australia/Sydney')).toBe(true)
        })

        it('returns false for timezones that do not observe DST', () => {
            expect(observesDaylightSaving('UTC')).toBe(false)
            expect(observesDaylightSaving('Asia/Tokyo')).toBe(false)
            expect(observesDaylightSaving('Asia/Kolkata')).toBe(false)
        })

        it('handles Arizona (no DST) correctly', () => {
            expect(observesDaylightSaving('America/Phoenix')).toBe(false)
        })
    })

    describe('edge cases', () => {
        it('handles invalid timezone gracefully', () => {
            // dayjs will fall back to local timezone for invalid input
            const result = formatUserTimeZone('Invalid/Timezone', fixedDate)
            
            expect(result.name).toBe('Timezone (Invalid)')
            expect(typeof result.offset).toBe('string')
            expect(typeof result.offsetMinutes).toBe('number')
        })

        it('handles single-part timezone names', () => {
            const result = formatUserTimeZone('UTC', fixedDate)
            
            expect(result.name).toBe('UTC')
            expect(result.formatted).toContain('UTC')
        })
    })
})
