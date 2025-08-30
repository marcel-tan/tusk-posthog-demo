import { wrapConsole } from './wrapConsole'

describe('wrapConsole', () => {
    // Store the original console methods to ensure they are restored correctly
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
    }

    afterEach(() => {
        // Restore all mocks and original console methods after each test
        jest.restoreAllMocks()
        console.log = originalConsole.log
        console.warn = originalConsole.warn
        console.error = originalConsole.error
    })

    it('should call the original console method with the provided arguments when the supplied fn returns true', () => {
        // Arrange
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        const mockFn = jest.fn().mockReturnValue(true)
        const testArgs = ['This is a test message', { data: 123 }]

        // Act
        const cleanup = wrapConsole('log', mockFn)
        console.log(...testArgs)

        // Assert
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith(testArgs)
        expect(consoleLogSpy).toHaveBeenCalledTimes(1)
        expect(consoleLogSpy).toHaveBeenCalledWith(...testArgs)

        // Cleanup
        cleanup()
    })

    it('should restore the original console method when the returned cleanup function is called', () => {
        // Arrange
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        const mockFn = jest.fn().mockReturnValue(true)
        const testArgs = ['This is a test message', { data: 123 }]

        const cleanup = wrapConsole('log', mockFn)
        console.log(...testArgs)

        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(consoleLogSpy).toHaveBeenCalledTimes(1)

        // Act
        cleanup()
        console.log(...testArgs)

        // Assert
        expect(mockFn).toHaveBeenCalledTimes(1) // Ensure mockFn is still only called once (before cleanup)
        expect(consoleLogSpy).toHaveBeenCalledTimes(2) // Ensure consoleLogSpy is called again after cleanup, meaning it's the original console.log
    })

    it('should not call the original console method when the supplied fn returns false', () => {
        // Arrange
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        const mockFn = jest.fn().mockReturnValue(false)
        const testArgs = ['This is a test message', { data: 123 }]

        // Act
        const cleanup = wrapConsole('log', mockFn)
        console.log(...testArgs)

        // Assert
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith(testArgs)
        expect(consoleLogSpy).not.toHaveBeenCalled()

        // Cleanup
        cleanup()
    })

    it('should call the original console method directly if the wrapped console method is called recursively (inWrap is true)', () => {
        // Arrange
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        const mockFn = jest.fn().mockImplementation((args: any[]) => {
            // Simulate a recursive call to console.log
            console.log(...args);
            return true;
        });
        const testArgs = ['This is a test message'];

        // Act
        const cleanup = wrapConsole('log', mockFn);
        console.log(...testArgs);

        // Assert
        expect(mockFn).toHaveBeenCalledTimes(1); // Ensure mockFn is only called once from the original call
        expect(consoleLogSpy).toHaveBeenCalledTimes(2); // Ensure console.log is called twice (once directly, once recursively)
        expect(consoleLogSpy).toHaveBeenCalledWith(...testArgs);

        // Cleanup
        cleanup();
    });
})