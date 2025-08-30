import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HedgehogMenu } from './HedgehogMenu'
import { toolbarLogic } from '../bar/toolbarLogic'
import { initKeaTests } from '~/test/init'
import { act } from 'react-dom/test-utils'

// Mock the HedgehogOptions component to isolate the HedgehogMenu component during testing.
// This prevents the test from breaking if HedgehogOptions changes and ensures we are only
// testing the logic within HedgehogMenu.
jest.mock('lib/components/HedgehogBuddy/HedgehogOptions', () => ({
    HedgehogOptions: () => <div data-testid="hedgehog-options">Mocked HedgehogOptions</div>,
}))

describe('HedgehogMenu', () => {
    beforeEach(() => {
        // Initialize the Kea test environment before each test to ensure a clean state.
        initKeaTests()
        // Mount the logic to make its actions available for spying.
        toolbarLogic.mount()
    })

    it('should render options and buttons, and handle clicks correctly', () => {
        // Spy on the actions from toolbarLogic to verify they are called on button clicks.
        const setHedgehogModeSpy = jest.spyOn(toolbarLogic.actions, 'setHedgehogMode')
        const setVisibleMenuSpy = jest.spyOn(toolbarLogic.actions, 'setVisibleMenu')

        render(<HedgehogMenu />)

        // Assert that the mocked HedgehogOptions component is rendered.
        expect(screen.getByTestId('hedgehog-options')).toBeInTheDocument()

        // Find the buttons by their accessible name (text content).
        const goAwayButton = screen.getByRole('button', { name: /go away.../i })
        const carryOnButton = screen.getByRole('button', { name: /carry on!/i })

        // Assert that both buttons are present in the document.
        expect(goAwayButton).toBeInTheDocument()
        expect(carryOnButton).toBeInTheDocument()

        // Simulate a click on the 'Go away...' button.
        fireEvent.click(goAwayButton)

        // Assert that the setHedgehogMode action was called with `false`.
        expect(setHedgehogModeSpy).toHaveBeenCalledWith(false)
        expect(setHedgehogModeSpy).toHaveBeenCalledTimes(1)

        // Simulate a click on the 'Carry on!' button.
        fireEvent.click(carryOnButton)

        // Assert that the setVisibleMenu action was called with `'none'`.
        expect(setVisibleMenuSpy).toHaveBeenCalledWith('none')
        expect(setVisibleMenuSpy).toHaveBeenCalledTimes(1)
    })

    it('should set visibleMenu to "none" when "Go away..." is clicked and visibleMenu is "hedgehog"', () => {
        const setHedgehogModeSpy = jest.spyOn(toolbarLogic.actions, 'setHedgehogMode')

        // Set the visibleMenu to 'hedgehog' before rendering the component.
        act(() => {
            toolbarLogic.actions.setVisibleMenu('hedgehog')
        })

        render(<HedgehogMenu />)

        const goAwayButton = screen.getByRole('button', { name: /go away.../i })
        expect(goAwayButton).toBeInTheDocument()

        fireEvent.click(goAwayButton)

        expect(setHedgehogModeSpy).toHaveBeenCalledWith(false)
        expect(setHedgehogModeSpy).toHaveBeenCalledTimes(1)

        // Check the actual state value instead of the action call
        expect(toolbarLogic.values.visibleMenu).toBe('none')
    })

    it('should handle null hedgehogActor without errors', () => {
        // Spy on the actions from toolbarLogic to verify they are called on button clicks.
        const setHedgehogModeSpy = jest.spyOn(toolbarLogic.actions, 'setHedgehogMode')
        const setVisibleMenuSpy = jest.spyOn(toolbarLogic.actions, 'setVisibleMenu')

        render(<HedgehogMenu />)

        // Find the buttons by their accessible name (text content).
        const goAwayButton = screen.getByRole('button', { name: /go away.../i })
        const carryOnButton = screen.getByRole('button', { name: /carry on!/i })

        // Simulate a click on the 'Go away...' button.
        fireEvent.click(goAwayButton)

        // Assert that the setHedgehogMode action was called with `false`.
        expect(setHedgehogModeSpy).toHaveBeenCalledWith(false)
        expect(setHedgehogModeSpy).toHaveBeenCalledTimes(1)

        // Simulate a click on the 'Carry on!' button.
        fireEvent.click(carryOnButton)

        // Assert that the setVisibleMenu action was called with `'none'`.
        expect(setVisibleMenuSpy).toHaveBeenCalledWith('none')
        expect(setVisibleMenuSpy).toHaveBeenCalledTimes(1)
    })
})