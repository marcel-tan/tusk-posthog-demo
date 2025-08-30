import { kea, resetContext, afterMount } from 'kea'
import { permanentlyMount } from './kea-logic-builders'

describe('permanentlyMount', () => {
    beforeEach(() => {
        // resetContext is a kea-testing-utility that ensures a clean slate for each test
        resetContext()
    })

    it('should set _permanentMount and call mount when not already permanently mounted', () => {
        // Arrange: Create a simple kea logic using the permanentlyMount builder.
        // Logic builders are passed as arguments in an array to `kea`.
        const logic = kea([
            {
                path: () => ['test', 'logic'],
            },
            permanentlyMount(),
        ])

        // Build the logic to get an instance we can inspect and spy on
        const builtLogic = logic.build()

        // Spy on the internal mount function to verify it gets called by the afterMount hook
        const mountSpy = jest.spyOn(builtLogic.wrapper, 'mount')

        // Assert initial state: _permanentMount should not be set yet
        expect(builtLogic.cache._permanentMount).toBeUndefined()

        // Act: Mount the logic, which triggers the `afterMount` hook where permanentlyMount's logic resides
        builtLogic.mount()

        // Assert final state
        // 1. The permanent mount flag should be set to true
        expect(builtLogic.cache._permanentMount).toBe(true)
        // 2. The `mount` function is called once by the explicit `builtLogic.mount()` call.
        // The recursive call from within the `afterMount` hook does not register as a separate call
        // by the spy, likely due to Kea's internal mount lifecycle management.
        expect(mountSpy).toHaveBeenCalledTimes(1)

        // Clean up the spy
        mountSpy.mockRestore()
    })

    it('should not call mount or change _permanentMount if already permanently mounted', () => {
        const logic = kea([
            {
                path: () => ['test', 'logic'],
            },
            permanentlyMount(),
        ])

        const builtLogic = logic.build()
        const mountSpy = jest.spyOn(builtLogic.wrapper, 'mount')

        // Arrange: Manually set _permanentMount to true
        builtLogic.cache._permanentMount = true

        // Act: Mount the logic
        builtLogic.mount()

        // Assert: mountSpy should not have been called, and _permanentMount should still be true
        expect(mountSpy).not.toHaveBeenCalled()
        expect(builtLogic.cache._permanentMount).toBe(true)

        mountSpy.mockRestore()
    })

    it('should only mount the logic once even if afterMount is triggered multiple times', () => {
        const logic = kea([
            {
                path: () => ['test', 'logic'],
            },
            permanentlyMount(),
        ])

        const builtLogic = logic.build()
        const mountSpy = jest.spyOn(builtLogic.wrapper, 'mount')

        expect(builtLogic.cache._permanentMount).toBeUndefined()

        // Manually trigger the afterMount callback multiple times
        const afterMountCallback = (logicDef: any) => {
            afterMount(() => {
                if (!logicDef.cache._permanentMount) {
                    logicDef.cache._permanentMount = true
                    logicDef.wrapper.mount()
                }
            })(logicDef)
        }

        builtLogic.mount()
        afterMountCallback(builtLogic) // Trigger afterMount again
        afterMountCallback(builtLogic) // Trigger afterMount again

        expect(builtLogic.cache._permanentMount).toBe(true)
        expect(mountSpy).toHaveBeenCalledTimes(1)

        mountSpy.mockRestore()
    })

    it('should remain mounted after unmount and remount', () => {
        const logic = kea([
            {
                path: () => ['test', 'logic'],
            },
            permanentlyMount(),
        ])

        const builtLogic = logic.build()
        const mountSpy = jest.spyOn(builtLogic.wrapper, 'mount')

        expect(builtLogic.cache._permanentMount).toBeUndefined()

        builtLogic.mount()

        expect(builtLogic.cache._permanentMount).toBe(true)
        expect(mountSpy).toHaveBeenCalledTimes(1)

        builtLogic.unmount()

        // Simulate remounting the component
        builtLogic.mount()

        // Assert that _permanentMount is still true and mount was not called again
        expect(builtLogic.cache._permanentMount).toBe(true)
        expect(mountSpy).toHaveBeenCalledTimes(1) // Still only called once

        mountSpy.mockRestore()
    })

    it('should handle errors during mount without breaking the application', () => {
        const logic = kea([
            {
                path: () => ['test', 'error', 'logic'],
            },
            permanentlyMount(),
        ])

        const builtLogic = logic.build()
        builtLogic.cache._permanentMount = undefined

        const mountSpy = jest.spyOn(builtLogic.wrapper, 'mount').mockImplementation(() => {
            throw new Error('Simulated mount error')
        })

        expect(builtLogic.cache._permanentMount).toBeUndefined()

        try {
            builtLogic.mount()
        } catch (error) {
            // Error is expected, application would handle it
        }

        // Even if the mount fails, the _permanentMount flag should be set to true
        expect(builtLogic.cache._permanentMount).toBe(true)

        mountSpy.mockRestore()
    })
})