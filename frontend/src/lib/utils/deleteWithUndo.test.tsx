import { deleteWithUndo } from './deleteWithUndo'
import api from 'lib/api'
import { lemonToast } from '@posthog/lemon-ui'
import React from 'react'

// Mock external dependencies
jest.mock('lib/api')
jest.mock('@posthog/lemon-ui')

const mockedApi = api as jest.Mocked<typeof api>
const mockedLemonToast = lemonToast as jest.Mocked<typeof lemonToast>

describe('deleteWithUndo', () => {
    beforeEach(() => {
        // Reset mocks before each test to ensure isolation
        jest.clearAllMocks()
    })

    it('should call api.update, the callback, and show an info toast with Undo when deleting', async () => {
        // Arrange
        const mockObject = { id: 123, name: 'Test Dashboard', otherProp: 'value' }
        const mockEndpoint = 'dashboards'
        const mockCallback = jest.fn()

        // Act
        await deleteWithUndo({
            object: mockObject,
            endpoint: mockEndpoint,
            callback: mockCallback,
        })

        // Assert
        // 1. Verify api.update was called correctly
        expect(mockedApi.update).toHaveBeenCalledTimes(1)
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: true,
        })

        // 2. Verify the callback was invoked
        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith(false, mockObject)

        // 3. Verify the info toast was shown with an Undo button
        expect(mockedLemonToast.info).toHaveBeenCalledTimes(1)
        expect(mockedLemonToast.success).not.toHaveBeenCalled()
        expect(mockedLemonToast.info).toHaveBeenCalledWith(
            <>
                <b>{mockObject.name}</b> has been{' '}deleted
            </>,
            {
                toastId: `delete-item-${mockObject.id}-false`,
                button: {
                    label: 'Undo',
                    action: expect.any(Function),
                },
            }
        )
    })

    it('should call api.update with the correct endpoint and payload, invoke the callback, and show a success toast without an Undo button when undoing a deletion (undo is true)', async () => {
        // Arrange
        const mockObject = { id: 456, name: 'Test Feature Flag', otherProp: 'anotherValue' }
        const mockEndpoint = 'feature_flags'
        const mockCallback = jest.fn()

        // Act
        await deleteWithUndo({
            undo: true,
            object: mockObject,
            endpoint: mockEndpoint,
            callback: mockCallback,
        })

        // Assert
        // 1. Verify api.update was called correctly
        expect(mockedApi.update).toHaveBeenCalledTimes(1)
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: false,
        })

        // 2. Verify the callback was invoked
        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith(true, mockObject)

        // 3. Verify the success toast was shown without an Undo button
        expect(mockedLemonToast.success).toHaveBeenCalledTimes(1)
        expect(mockedLemonToast.info).not.toHaveBeenCalled()
        expect(mockedLemonToast.success).toHaveBeenCalledWith(
            <>
                <b>{mockObject.name}</b> has been{' '}restored
            </>,
            {
                toastId: `delete-item-${mockObject.id}-true`,
                button: undefined,
            }
        )
    })

    it('should use the custom idField to construct the endpoint URL and payload when provided', async () => {
        // Arrange
        const mockObject = { short_id: 'abc', name: 'Test Playlist', otherProp: 'value' }
        const mockEndpoint = 'session_recording_playlists'
        const mockCallback = jest.fn()
        const idField = 'short_id'

        // Act
        await deleteWithUndo({
            object: mockObject,
            endpoint: mockEndpoint,
            idField: idField,
            callback: mockCallback,
        })

        // Assert
        // 1. Verify api.update was called correctly with the custom idField
        expect(mockedApi.update).toHaveBeenCalledTimes(1)
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.short_id}`, {
            ...mockObject,
            deleted: true,
        })

        // 2. Verify the callback was invoked
        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith(false, mockObject)

        // 3. Verify the info toast was shown with the custom id in toastId
        expect(mockedLemonToast.info).toHaveBeenCalledTimes(1)
        expect(mockedLemonToast.success).not.toHaveBeenCalled()
        expect(mockedLemonToast.info).toHaveBeenCalledWith(
            <>
                <b>{mockObject.name}</b> has been{' '}deleted
            </>,
            {
                toastId: `delete-item-undefined-false`,
                button: {
                    label: 'Undo',
                    action: expect.any(Function),
                },
            }
        )
    })

    it('should reject with an error when API call fails and not call callback or show toast', async () => {
        // Arrange
        const mockObject = { id: 456, name: 'Test Insight', otherProp: 'anotherValue' }
        const mockEndpoint = 'insights'
        const mockError = new Error('API request failed');
        const mockCallback = jest.fn();
        mockedApi.update.mockRejectedValue(mockError);

        // Act & Assert
        await expect(deleteWithUndo({
            object: mockObject,
            endpoint: mockEndpoint,
            callback: mockCallback,
        })).rejects.toEqual(mockError);

        expect(mockedApi.update).toHaveBeenCalledTimes(1);
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: true,
        });

        expect(mockedLemonToast.success).not.toHaveBeenCalled();
        expect(mockedLemonToast.info).not.toHaveBeenCalled();
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should restore the object to its original state even if the server state has changed', async () => {
        const mockObject = { id: 456, name: 'Test Report', initialValue: 'original' }
        const mockEndpoint = 'reports'
        const mockCallback = jest.fn()

        // Simulate the object being changed on the server after deletion
        mockedApi.update.mockImplementationOnce(async (url, payload) => {
            // Simulate successful deletion
            return Promise.resolve()
        })

        mockedApi.update.mockImplementationOnce(async (url, payload) => {
            // Simulate the server returning a modified object
            return Promise.resolve()
        })

        // Mock lemonToast to capture the undo action
        let undoAction: () => void = () => {}
        mockedLemonToast.info.mockImplementationOnce((message, options) => {
            undoAction = options?.button?.action as () => void
        })

        // Initial delete
        await deleteWithUndo({
            object: mockObject,
            endpoint: mockEndpoint,
            callback: mockCallback,
        })

        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: true,
        })

        // Simulate clicking the Undo button
        await undoAction()

        // Assert that the API is called with the ORIGINAL object, not the modified one
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: false,
        })

        expect(mockCallback).toHaveBeenCalledTimes(2)
        expect(mockCallback).toHaveBeenNthCalledWith(1, false, mockObject)
        expect(mockCallback).toHaveBeenNthCalledWith(2, true, mockObject)
    })

    // [Tusk] FAILING TEST
    it('should use the original props object state when calling deleteWithUndo recursively from the Undo button', async () => {
        const mockObject = { id: 123, name: 'Test Dashboard', initialValue: 'original' }
        const mockEndpoint = 'dashboards'
        const mockCallback = jest.fn()

        let undoAction: () => Promise<void> | undefined

        mockedLemonToast.info.mockImplementation(
            (
                _message: React.ReactNode,
                options: { toastId: string; button?: { label: string; action: () => Promise<void> } }
            ) => {
                undoAction = options.button?.action
            }
        )

        // Initial delete call
        await deleteWithUndo({
            object: mockObject,
            endpoint: mockEndpoint,
            callback: mockCallback,
        })

        // Modify the object *after* the initial delete call
        mockObject.name = 'Modified Dashboard'
        mockObject.initialValue = 'modified'

        // Simulate clicking the Undo button
        if (undoAction) {
            await undoAction()
        }

        // Assert that api.update is called with the *original* object, not the modified one, during undo
        expect(mockedApi.update).toHaveBeenCalledTimes(2) // Once for delete, once for undo
        expect(mockedApi.update).toHaveBeenLastCalledWith(`api/${mockEndpoint}/${123}`, {
            ...{ id: 123, name: 'Test Dashboard', initialValue: 'original' }, // Original object
            deleted: false,
        })

        // Assert that the callback is called with the original object
        expect(mockCallback).toHaveBeenCalledTimes(2)
        expect(mockCallback).toHaveBeenLastCalledWith(true, { id: 123, name: 'Test Dashboard', initialValue: 'original' })
    })

    // [Tusk] FAILING TEST
    it('should show the toast notification even if the callback function throws an error', async () => {
        // Arrange
        const mockObject = { id: 123, name: 'Test Dashboard', otherProp: 'value' }
        const mockEndpoint = 'dashboards'
        const mockCallback = jest.fn(() => {
            throw new Error('Callback error')
        })

        // Act
        try {
            await deleteWithUndo({
                object: mockObject,
                endpoint: mockEndpoint,
                callback: mockCallback,
            })
        } catch (error) {
            // Error is expected from callback
        }

        // Assert
        // 1. Verify api.update was called correctly
        expect(mockedApi.update).toHaveBeenCalledTimes(1)
        expect(mockedApi.update).toHaveBeenCalledWith(`api/${mockEndpoint}/${mockObject.id}`, {
            ...mockObject,
            deleted: true,
        })

        // 2. Verify the callback was invoked and threw an error
        expect(mockCallback).toHaveBeenCalledTimes(1)
        expect(mockCallback).toHaveBeenCalledWith(false, mockObject)

        // 3. Verify the info toast was shown with an Undo button
        expect(mockedLemonToast.info).toHaveBeenCalledTimes(1)
        expect(mockedLemonToast.success).not.toHaveBeenCalled()
        expect(mockedLemonToast.info).toHaveBeenCalledWith(
            <>
                <b>{mockObject.name}</b> has been{' '}deleted
            </>,
            {
                toastId: `delete-item-${mockObject.id}-false`,
                button: {
                    label: 'Undo',
                    action: expect.any(Function),
                },
            }
        )
    })
})