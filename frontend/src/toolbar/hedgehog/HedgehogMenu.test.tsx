import { fireEvent, render, screen } from '@testing-library/react'
import { initKeaTests } from '~/test/init'
import React from 'react'
import { toolbarLogic } from '~/toolbar/bar/toolbarLogic'
import { HedgehogMenu } from './HedgehogMenu'

// Mocking HedgehogOptions to isolate the HedgehogMenu component
jest.mock('lib/components/HedgehogBuddy/HedgehogOptions', () => ({
    HedgehogOptions: () => <div data-testid="hedgehog-options" />,
}))

describe('HedgehogMenu', () => {
    beforeEach(() => {
        initKeaTests()
        toolbarLogic.mount()
    })

    it("calls setHedgehogMode(false) when 'Go away...' is clicked", () => {
        // Set the initial state where the hedgehog menu is visible
        toolbarLogic.actions.setHedgehogMode(true)
        // Verify initial state from the logic's reducer
        expect(toolbarLogic.values.hedgehogMode).toBe(true)
        expect(toolbarLogic.values.visibleMenu).toBe('hedgehog')

        render(<HedgehogMenu />)

        // Find and click the "Go away..." button
        const goAwayButton = screen.getByRole('button', { name: 'Go away...' })
        fireEvent.click(goAwayButton)

        // Assert that the correct actions were dispatched and the state has changed
        expect(toolbarLogic.values.hedgehogMode).toBe(false)
        expect(toolbarLogic.values.visibleMenu).toBe('none')
    })

    it("calls setVisibleMenu('none') when 'Carry on!' is clicked", () => {
        // Set the initial state where the hedgehog menu is visible
        toolbarLogic.actions.setVisibleMenu('hedgehog')
        expect(toolbarLogic.values.visibleMenu).toBe('hedgehog')

        render(<HedgehogMenu />)

        // Find and click the "Carry on!" button
        const carryOnButton = screen.getByRole('button', { name: 'Carry on!' })
        fireEvent.click(carryOnButton)

        // Assert that the correct actions were dispatched and the state has changed
        expect(toolbarLogic.values.visibleMenu).toBe('none')
    })
})
