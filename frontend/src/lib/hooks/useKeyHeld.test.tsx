import { renderHook, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import { useKeyHeld } from './useKeyHeld'

describe('useKeyHeld', () => {
    it('should return true when the specified key is pressed and held, and false when the key is released', () => {
        // 1. Initial state: Render the hook and expect the key to not be held.
        const { result } = renderHook(() => useKeyHeld('Shift'))
        expect(result.current).toBe(false)

        // 2. Key down: Simulate the 'Shift' key being pressed.
        act(() => {
            fireEvent.keyDown(window, { key: 'Shift' })
        })

        // Assert the hook now returns true.
        expect(result.current).toBe(true)

        // 3. Key up: Simulate the 'Shift' key being released.
        act(() => {
            fireEvent.keyUp(window, { key: 'Shift' })
        })

        // Assert the hook returns to false.
        expect(result.current).toBe(false)
    })

    it('should not change its state when a different key is pressed or released', () => {
        const { result } = renderHook(() => useKeyHeld('Shift'))
        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'Control' })
        })

        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyUp(window, { key: 'Control' })
        })

        expect(result.current).toBe(false)
    })

    it('should return true only when the specified key is pressed, even if other keys are pressed', () => {
        const { result } = renderHook(() => useKeyHeld('a'))
        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'b' })
        })

        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'a' })
        })

        expect(result.current).toBe(true)

        act(() => {
            fireEvent.keyUp(window, { key: 'a' })
        })

        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyUp(window, { key: 'b' })
        })

        expect(result.current).toBe(false)
    })

    it('should return false after unmount when the key is held down', () => {
        // 1. Render the hook
        const { unmount } = renderHook(() => useKeyHeld('Shift'))

        // 2. Simulate keydown event
        act(() => {
            fireEvent.keyDown(window, { key: 'Shift' })
        })

        // 3. Unmount the component
        unmount()

        // 4. Simulate keyup event after unmount
        act(() => {
            fireEvent.keyUp(window, { key: 'Shift' })
        })

        // 5. Render the hook again
        const { result: newResult } = renderHook(() => useKeyHeld('Shift'))

        // 6. Assert that the hook returns to false after unmount and remount, meaning the event listener was removed
        expect(newResult.current).toBe(false)
    })

    it('should return true indefinitely if keyup event is missed', () => {
        const { result } = renderHook(() => useKeyHeld('Shift'))
        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'Shift' })
        })

        expect(result.current).toBe(true)

        // Simulate the browser tab losing focus, preventing keyup event.
        // No keyup event is fired.

        // Assert that the hook continues to return true.
        expect(result.current).toBe(true)
    })

    it('should handle case sensitivity correctly when matching key names', () => {
        // 1. Initial state: Render the hook with a specific case and expect the key to not be held.
        const { result } = renderHook(() => useKeyHeld('Alt'))
        expect(result.current).toBe(false)

        // 2. Key down (incorrect case): Simulate the 'alt' key (lowercase) being pressed.
        act(() => {
            fireEvent.keyDown(window, { key: 'alt' })
        })

        // Assert the hook still returns false because the case is different.
        expect(result.current).toBe(false)

        // 3. Key down (correct case): Simulate the 'Alt' key (uppercase) being pressed.
        act(() => {
            fireEvent.keyDown(window, { key: 'Alt' })
        })

        // Assert the hook now returns true.
        expect(result.current).toBe(true)

        // 4. Key up: Simulate the 'Alt' key being released.
        act(() => {
            fireEvent.keyUp(window, { key: 'Alt' })
        })

        // Assert the hook returns to false.
        expect(result.current).toBe(false)
    })

    it('should handle browser-specific key naming differences for arrow keys', () => {
        const { result } = renderHook(() => useKeyHeld('ArrowRight'))
        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'ArrowRight' })
        })

        expect(result.current).toBe(true)

        act(() => {
            fireEvent.keyUp(window, { key: 'ArrowRight' })
        })

        expect(result.current).toBe(false)

        // Simulate pressing the 'Right' key (without 'Arrow')
        act(() => {
            fireEvent.keyDown(window, { key: 'Right' })
        })

        // It should still return true, as we are checking for ArrowRight
        expect(result.current).toBe(false)

        act(() => {
            fireEvent.keyUp(window, { key: 'Right' })
        })

        expect(result.current).toBe(false)

        const { result: result2 } = renderHook(() => useKeyHeld('Right'))
        expect(result2.current).toBe(false)

        act(() => {
            fireEvent.keyDown(window, { key: 'Right' })
        })

        expect(result2.current).toBe(true)

        act(() => {
            fireEvent.keyUp(window, { key: 'Right' })
        })

        expect(result2.current).toBe(false)
    })

    it('should return true when the specified key is pressed and held, even with other keys pressed simultaneously', () => {
        // 1. Initial state: Render the hook and expect the key to not be held.
        const { result } = renderHook(() => useKeyHeld('Alt'))
        expect(result.current).toBe(false)

        // 2. Key down (Alt): Simulate the 'Alt' key being pressed.
        act(() => {
            fireEvent.keyDown(window, { key: 'Alt' })
        })

        // Assert the hook now returns true.
        expect(result.current).toBe(true)

        // 3. Key down (Control): Simulate the 'Control' key being pressed while 'Alt' is already held.
        act(() => {
            fireEvent.keyDown(window, { key: 'Control' })
        })

        // Assert the hook still returns true for 'Alt'.
        expect(result.current).toBe(true)

        // 4. Key up (Alt): Simulate the 'Alt' key being released while 'Control' is still held.
        act(() => {
            fireEvent.keyUp(window, { key: 'Alt' })
        })

        // Assert the hook returns to false for 'Alt'.
        expect(result.current).toBe(false)

        // 5. Key up (Control): Simulate the 'Control' key being released.
        act(() => {
            fireEvent.keyUp(window, { key: 'Control' })
        })
    })
})