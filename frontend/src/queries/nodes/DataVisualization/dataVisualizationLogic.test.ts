import { formatDataWithSettings, AxisSeriesSettings, convertTableValue } from './dataVisualizationLogic'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

describe('formatDataWithSettings', () => {
    it('should format a number to the specified decimal places when settings.formatting.decimalPlaces is provided', () => {
        const data = 123.4567
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 2,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('123.46')
    })

    // [Tusk] FAILING TEST
    it('should format a number as a percentage string when settings.formatting.style is \'percent\', respecting decimalPlaces', () => {
        const data = 0.789
        const settings: AxisSeriesSettings = {
            formatting: {
                style: 'percent',
                decimalPlaces: 1,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('78.9%')
    })

    // [Tusk] FAILING TEST
    it('should not duplicate percentage symbols when style is percent and suffix contains %', () => {
        const data = 0.5
        const settings: AxisSeriesSettings = {
            formatting: {
                style: 'percent',
                suffix: '%',
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('50%')
    })

    // [Tusk] FAILING TEST
    it('should correctly round up a number to the specified decimal places', () => {
        const data = 123.455
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 2,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('123.46')
    })

    // [Tusk] FAILING TEST
    it('should round the number to an integer when settings.formatting.decimalPlaces is 0', () => {
        const data = 123.567
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 0,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('124')
    })

    it('should return null when data is null, regardless of settings', () => {
        const data = null
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 2,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe(null)
    })

    it('should return the number as a string when data is a number and no formatting settings are provided', () => {
        const data = 1234
        const result = formatDataWithSettings(data)
        expect(result).toBe('1234')
    })

    it('should format a number using locale string formatting when settings.formatting.style is "number", respecting decimalPlaces', () => {
        const data = 1234.567
        const settings: AxisSeriesSettings = {
            formatting: {
                style: 'number',
                decimalPlaces: 2,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe(data.toLocaleString(undefined, { maximumFractionDigits: 2 }))
    })

    it('should prepend the prefix to the formatted value when settings.formatting.prefix is provided', () => {
        const data = 123.45
        const settings: AxisSeriesSettings = {
            formatting: {
                prefix: '$',
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('$123.45')
    })

    it('should apply both prefix and suffix simultaneously when both are provided in the settings', () => {
        const data = 42
        const settings: AxisSeriesSettings = {
            formatting: {
                prefix: 'pre-',
                suffix: '-post',
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('pre-42-post')
    })

    it('should produce consistent output when formatting the same number with style "number" across different locales', () => {
        const data = 1234.56
        const settings: AxisSeriesSettings = {
            formatting: {
                style: 'number',
            },
        }

        // Mock toLocaleString to return a consistent value
        const toLocaleStringMock = jest.spyOn(Number.prototype, 'toLocaleString');
        toLocaleStringMock.mockReturnValue('1,234.56');

        const result = formatDataWithSettings(data, settings);
        expect(result).toBe('1,234.56');

        toLocaleStringMock.mockRestore(); // Restore the original function
    });

    it('should handle very large numbers with specified decimal places', () => {
        const data = 1e20
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 2,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('100000000000000000000.00')
    })

    it('should handle very small numbers with specified decimal places', () => {
        const data = 1e-10
        const settings: AxisSeriesSettings = {
            formatting: {
                decimalPlaces: 12,
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('0.000000000100')
    })

    it('should format a number that is already a percentage correctly when style is percent', () => {
        const data = 45
        const settings: AxisSeriesSettings = {
            formatting: {
                style: 'percent',
            },
        }
        const result = formatDataWithSettings(data, settings)
        expect(result).toBe('45%')
    })
})

describe('convertTableValue', () => {
    it("should return the Unix timestamp when value is a string or number and type is 'DATE' or 'DATETIME'", () => {
        const dateString = '2023-10-26T12:00:00.000Z'
        const dateNumber = new Date(dateString).getTime() // Milliseconds timestamp: 1698321600000
        const expectedUnixTimestamp = 1698321600 // Seconds timestamp

        // Test with string value
        expect(convertTableValue(dateString, 'DATE')).toBe(expectedUnixTimestamp)
        expect(convertTableValue(dateString, 'DATETIME')).toBe(expectedUnixTimestamp)

        // Test with number value (milliseconds)
        expect(convertTableValue(dateNumber, 'DATE')).toBe(expectedUnixTimestamp)
        expect(convertTableValue(dateNumber, 'DATETIME')).toBe(expectedUnixTimestamp)
    })

    it('should return null when value is null for any type', () => {
        const types: ColumnScalar[] = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'DECIMAL']
        types.forEach((type) => {
            expect(convertTableValue(null, type)).toBe(null)
        })
    })

    it("should return the string representation of the value when type is 'STRING'", () => {
        expect(convertTableValue(123, 'STRING')).toBe('123')
        expect(convertTableValue(true, 'STRING')).toBe('true')
    })

    it('should return the number as-is when value is a number and type is "INTEGER"', () => {
        const value = 123
        const type = 'INTEGER'
        const result = convertTableValue(value, type)
        expect(result).toBe(123)
    })

    it('should return the parsed integer when value is a string and type is "INTEGER"', () => {
        const value = '123'
        const type = 'INTEGER'
        const result = convertTableValue(value, type)
        expect(result).toBe(123)
    })

    it('should return NaN when value is a non-numeric string and type is INTEGER', () => {
        const value = 'abc'
        const type = 'INTEGER'
        const result = convertTableValue(value, type)
        expect(Number.isNaN(result)).toBe(true)
    })

    it('should return the number as-is when value is a number and type is \'FLOAT\' or \'DECIMAL\'', () => {
        const numberValue = 123.45
        expect(convertTableValue(numberValue, 'FLOAT')).toBe(numberValue)
        expect(convertTableValue(numberValue, 'DECIMAL')).toBe(numberValue)
    })

    it('should return the parsed float when value is a string and type is \'FLOAT\' or \'DECIMAL\'', () => {
        const stringValue = '123.45'

        expect(convertTableValue(stringValue, 'FLOAT')).toBe(123.45)
        expect(convertTableValue(stringValue, 'DECIMAL')).toBe(123.45)
    })

    it("should return NaN when value is a non-numeric string and type is 'FLOAT'", () => {
        const value = 'abc'
        const result = convertTableValue(value, 'FLOAT')
        expect(Number.isNaN(result as number)).toBe(true)
    })

    it("should return NaN when value is a non-numeric string and type is 'DECIMAL'", () => {
        const value = 'abc'
        const result = convertTableValue(value, 'DECIMAL')
        expect(Number.isNaN(result as number)).toBe(true)
    })

    it('should convert edge case values to boolean correctly when type is BOOLEAN', () => {
        expect(convertTableValue('0', 'BOOLEAN')).toBe(true)
        expect(convertTableValue(0, 'BOOLEAN')).toBe(false)
        expect(convertTableValue('', 'BOOLEAN')).toBe(false)
    })

    it('should handle string representations of boolean values consistently when type is BOOLEAN', () => {
        expect(convertTableValue('true', 'BOOLEAN')).toBe(true)
        expect(convertTableValue('TRUE', 'BOOLEAN')).toBe(true)
        expect(convertTableValue('yes', 'BOOLEAN')).toBe(true)
        expect(convertTableValue('YES', 'BOOLEAN')).toBe(true)
        expect(convertTableValue('1', 'BOOLEAN')).toBe(true)

        expect(convertTableValue('false', 'BOOLEAN')).toBe(true) // Tricky case: Boolean('false') === true
        expect(convertTableValue('FALSE', 'BOOLEAN')).toBe(true) // Tricky case: Boolean('FALSE') === true
        expect(convertTableValue('no', 'BOOLEAN')).toBe(true) // Tricky case: Boolean('no') === true
        expect(convertTableValue('NO', 'BOOLEAN')).toBe(true) // Tricky case: Boolean('NO') === true
        expect(convertTableValue('0', 'BOOLEAN')).toBe(true) // Tricky case: Boolean('0') === true
        expect(convertTableValue('', 'BOOLEAN')).toBe(false) // Boolean('') === false
    })

    // [Tusk] FAILING TEST
    it("should return the boolean representation of the value when type is 'BOOLEAN'", () => {
        expect(convertTableValue('true', 'BOOLEAN')).toBe(true)
        expect(convertTableValue(1, 'BOOLEAN')).toBe(true)
        expect(convertTableValue('false', 'BOOLEAN')).toBe(false)
        expect(convertTableValue(0, 'BOOLEAN')).toBe(false)
    })

    // [Tusk] FAILING TEST
    it('should correctly handle scientific notation strings when converting to INTEGER type', () => {
        expect(convertTableValue('1e10', 'INTEGER')).toBe(10000000000)
        expect(convertTableValue('1.23e5', 'INTEGER')).toBe(123000)
    })

    // [Tusk] FAILING TEST
    it('should correctly handle scientific notation strings when converting to FLOAT type', () => {
        expect(convertTableValue('1e-5', 'FLOAT')).toBe(0.00001)
        expect(convertTableValue('2.5e3', 'FLOAT')).toBe(2500)
    })

    // [Tusk] FAILING TEST
    it('should handle different date string formats when type is DATE or DATETIME', () => {
        const isoDate = '2024-01-20T10:30:00.000Z'
        const usDate = '01/20/2024'
        const europeanDate = '20.01.2024'

        const expectedIsoUnix = dayjs(isoDate).utc().unix()
        const expectedUsUnix = dayjs(usDate, 'MM/DD/YYYY').utc().unix()
        const expectedEuropeanUnix = dayjs(europeanDate, 'DD.MM.YYYY').utc().unix()

        expect(convertTableValue(isoDate, 'DATE')).toBe(expectedIsoUnix)
        expect(convertTableValue(isoDate, 'DATETIME')).toBe(expectedIsoUnix)

        expect(convertTableValue(usDate, 'DATE')).toBe(expectedUsUnix)
        expect(convertTableValue(usDate, 'DATETIME')).toBe(expectedUsUnix)

        expect(convertTableValue(europeanDate, 'DATE')).toBe(expectedEuropeanUnix)
        expect(convertTableValue(europeanDate, 'DATETIME')).toBe(expectedEuropeanUnix)
    })
})