import { renderHook, act } from '@testing-library/react'
import { useAsyncHandler } from './useAsyncHandler'

describe('useAsyncHandler', () => {
    it('should set loading to true while the async onEvent handler is pending and set it back to false after the promise resolves', async () => {
        // 1. Setup a controllable promise
        let resolvePromise: (value?: unknown) => void
        const promise = new Promise((resolve) => {
            resolvePromise = resolve
        })

        // 2. Create a mock event handler that returns our promise
        const mockAsyncEventHandler = jest.fn(() => promise)

        // 3. Render the hook with our mock handler
        const { result } = renderHook(() => useAsyncHandler(mockAsyncEventHandler))

        // 4. Assert initial state: loading should be false before the event is triggered
        expect(result.current.loading).toBe(false)
        expect(result.current.onEvent).toBeDefined()

        // 5. Trigger the event handler within `act` to handle the resulting state update
        act(() => {
            // The event object can be a simple mock as it's not used by the handler in this test
            result.current.onEvent?.({} as React.UIEvent)
        })

        // 6. Assert that loading is now true and the handler was called
        expect(mockAsyncEventHandler).toHaveBeenCalledTimes(1)
        expect(result.current.loading).toBe(true)

        // 7. Resolve the promise and wait for the state update using `act`
        await act(async () => {
            resolvePromise()
            // We await the promise itself to ensure all microtasks like .finally() have completed
            await promise
        })

        // 8. Assert that loading is back to false after the promise has resolved
        expect(result.current.loading).toBe(false)
    })

    it('should keep loading as false when the onEvent handler is synchronous and does not return a promise', () => {
        // 1. Define a synchronous event handler
        const mockSyncEventHandler = jest.fn(() => {
            // Do nothing
        })

        // 2. Render the hook with our mock handler
        const { result } = renderHook(() => useAsyncHandler(mockSyncEventHandler))

        // 3. Assert initial state: loading should be false before the event is triggered
        expect(result.current.loading).toBe(false)
        expect(result.current.onEvent).toBeDefined()

        // 4. Trigger the event handler within `act`
        act(() => {
            // The event object can be a simple mock as it's not used by the handler in this test
            result.current.onEvent?.({} as React.UIEvent)
        })

        // 5. Assert that the handler was called and loading remains false
        expect(mockSyncEventHandler).toHaveBeenCalledTimes(1)
        expect(result.current.loading).toBe(false)
    })

    it('should return loading as false and onEvent as undefined if no onEvent handler is provided', () => {
        const { result } = renderHook(() => useAsyncHandler(undefined))

        expect(result.current.loading).toBe(false)
        expect(result.current.onEvent).toBeUndefined()
    })

    it('should work correctly when the handler does not use the event parameter', async () => {
        // 1. Setup a controllable promise
        let resolvePromise: (value?: unknown) => void
        const promise = new Promise((resolve) => {
            resolvePromise = resolve
        })

        // 2. Create a mock event handler that returns our promise, but does not use the event
        const mockAsyncEventHandler = jest.fn(() => promise)

        // 3. Render the hook with our mock handler
        const { result } = renderHook(() => useAsyncHandler(mockAsyncEventHandler))

        // 4. Assert initial state: loading should be false before the event is triggered
        expect(result.current.loading).toBe(false)
        expect(result.current.onEvent).toBeDefined()

        // 5. Trigger the event handler within `act` to handle the resulting state update
        act(() => {
            // Call the event handler without any arguments
            result.current.onEvent?.({} as React.UIEvent)
        })

        // 6. Assert that loading is now true and the handler was called
        expect(mockAsyncEventHandler).toHaveBeenCalledTimes(1)
        expect(result.current.loading).toBe(true)

        // 7. Resolve the promise and wait for the state update using `act`
        await act(async () => {
            resolvePromise()
            // We await the promise itself to ensure all microtasks like .finally() have completed
            await promise
        })

        // 8. Assert that loading is back to false after the promise has resolved
        expect(result.current.loading).toBe(false)
    })
})