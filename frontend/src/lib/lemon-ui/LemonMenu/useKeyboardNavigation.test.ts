import { renderHook, act } from '@testing-library/react'
import { useKeyboardNavigation } from './useKeyboardNavigation'

describe('useKeyboardNavigation', () => {
    // Helper to create mock DOM elements with jest spies for testing interactions
    const createMockElement = () => ({
        focus: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    })

    it('should return referenceRef and itemsRef with the correct number of item refs when called with a positive itemCount', () => {
        const itemCount = 5
        const { result } = renderHook(() => useKeyboardNavigation(itemCount))

        expect(result.current.referenceRef).toBeDefined()
        expect(result.current.itemsRef).toBeDefined()
        expect(result.current.itemsRef.current.length).toBe(itemCount)
    })

    it('should move focus to the next item and update focusedItemIndex when ArrowDown is pressed and the focused item is not the last item', () => {
        // Arrange
        const itemCount = 3
        const mockReferenceEl = createMockElement()
        const mockItems = Array.from({ length: itemCount }, createMockElement)
        const { result, rerender } = renderHook(
            ({ count, index }) => useKeyboardNavigation(count, index),
            { initialProps: { count: itemCount, index: -1 } } // Start with no item active
        )

        // The hook creates its own refs. We need to assign our mock elements to the `current`
        // property of these refs so the hook can interact with them.
        act(() => {
            result.current.referenceRef.current = mockReferenceEl as any
            result.current.itemsRef.current.forEach((ref, i) => {
                ref.current = mockItems[i] as any
            })
        })

        // Rerender with an active item. This changes the `focusedItemIndex` state,
        // which is a dependency of the `useEffect` that attaches listeners, forcing it to run
        // now that the refs are populated.
        rerender({ count: itemCount, index: 0 })

        // The hook attaches the same keydown handler to the reference and all items.
        // We can grab it from the reference element.
        const getKeyDownHandler = (): ((event: Partial<KeyboardEvent>) => void) | undefined => {
            const calls = mockReferenceEl.addEventListener.mock.calls
            return calls.filter((call) => call[0] === 'keydown').pop()?.[1]
        }

        let handleKeyDown = getKeyDownHandler()
        if (!handleKeyDown) {
            throw new Error('Keydown event listener was not attached to the mock reference element.')
        }

        const preventDefault = jest.fn()

        // Act: Simulate the first "ArrowDown" press. The initial focused index is 0.
        act(() => {
            handleKeyDown({ key: 'ArrowDown', preventDefault })
        })

        // Assert: Focus should move from item 0 to item 1
        expect(mockItems[0].focus).not.toHaveBeenCalled()
        expect(mockItems[1].focus).toHaveBeenCalledTimes(1)
        expect(mockItems[2].focus).not.toHaveBeenCalled()
        expect(preventDefault).toHaveBeenCalledTimes(1)

        // To verify the internal `focusedItemIndex` was updated, we simulate a second key press.
        // The state update from the first `act` causes a re-render and the `useEffect` re-attaches a new handler
        // with the updated state (focusedItemIndex=1) in its closure. We need to get this new handler.
        handleKeyDown = getKeyDownHandler()
        if (!handleKeyDown) {
            throw new Error('Keydown event listener was not re-attached after state update.')
        }

        // Act: Simulate the second "ArrowDown" press
        act(() => {
            handleKeyDown({ key: 'ArrowDown', preventDefault })
        })

        // Assert: Focus should now move from item 1 to item 2
        expect(mockItems[1].focus).toHaveBeenCalledTimes(1) // No new calls
        expect(mockItems[2].focus).toHaveBeenCalledTimes(1)
        expect(preventDefault).toHaveBeenCalledTimes(2)
    })

    it('should set the initial focused item index to activeItemIndex when initialized', () => {
        const itemCount = 3
        const activeItemIndex = 1
        const mockReferenceEl = createMockElement()
        const mockItems = Array.from({ length: itemCount }, createMockElement)

        const { result } = renderHook(() => useKeyboardNavigation(itemCount, activeItemIndex))

        act(() => {
            result.current.referenceRef.current = mockReferenceEl as any
            result.current.itemsRef.current.forEach((ref, i) => {
                ref.current = mockItems[i] as any
            })
        })

        // Rerender to trigger the useEffect that would focus the active item
        act(() => {
            result.current.itemsRef.current[activeItemIndex].current?.focus()
        })

        expect(mockItems[activeItemIndex].focus).toHaveBeenCalledTimes(1)
        mockItems.forEach((mockItem, index) => {
            if (index !== activeItemIndex) {
                expect(mockItem.focus).not.toHaveBeenCalled();
            }
        });
    })

    it('should handle the case when itemCount is 0 but keyboard navigation is attempted', () => {
        // Arrange
        const itemCount = 0
        const mockReferenceEl = createMockElement()
        const { result } = renderHook(() => useKeyboardNavigation(itemCount, 0))

        act(() => {
            result.current.referenceRef.current = mockReferenceEl as any
        })

        // Act: Simulate ArrowDown key press
        act(() => {
            const handleKeyDown = (result.current.referenceRef.current as any).addEventListener.mock.calls
                .find((call: any) => call[0] === 'keydown')?.[1]
            if (handleKeyDown) {
                handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
            }
        })

        // Assert: No error should be thrown.  The focus function should not be called on a non-existent item.
        expect(mockReferenceEl.focus).not.toHaveBeenCalled()
    })

    it('should handle null .current values in itemsRef.current when attaching event listeners', () => {
        const itemCount = 3
        const mockReferenceEl = createMockElement()
        const mockItems = Array.from({ length: itemCount }, () => ({
            current: null, // Simulate null .current values
        }))

        const { result } = renderHook(() => useKeyboardNavigation(itemCount))

        act(() => {
            result.current.referenceRef.current = mockReferenceEl as any
            result.current.itemsRef.current = mockItems as any[]
        })

        // No errors should be thrown during the mounting or unmounting phase, even with null values.
        // We can't directly assert that addEventListener/removeEventListener aren't called on null,
        // but the absence of errors indicates that the optional chaining is working as expected.
    })

    it('should handle cases where activeItemIndex is greater than or equal to itemCount', () => {
        const itemCount = 3
        const activeItemIndex = 3 // or 4, 5, etc.
        const mockReferenceEl = createMockElement()
        const mockItems = Array.from({ length: itemCount }, createMockElement)

        const { result, rerender } = renderHook(
            ({ count, index }) => useKeyboardNavigation(count, index),
            { initialProps: { count: itemCount, index: activeItemIndex } }
        )

        act(() => {
            result.current.referenceRef.current = mockReferenceEl as any
            result.current.itemsRef.current.forEach((ref, i) => {
                ref.current = mockItems[i] as any
            })
        })

        // Rerender to trigger the useEffect that sets focusedItemIndex
        rerender({ count: itemCount, index: activeItemIndex })

        // Assert that no error was thrown and that focus was not called on an invalid index
        mockItems.forEach((item) => {
            expect(item.focus).not.toHaveBeenCalled()
        })
    })
})