import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LemonInputSelect, LemonInputSelectOption } from './LemonInputSelect'

describe('LemonInputSelect', () => {
    const mockOptions: LemonInputSelectOption[] = [
        { key: 'option1', label: 'Option 1' },
        { key: 'option2', label: 'Option 2' },
        { key: 'option3', label: 'Option 3' },
    ]

    describe('displaying options', () => {
        it.each([
            ['single' as const],
            ['multiple' as const],
        ])('should display options in the dropdown when focused for mode="%s"', async (mode) => {
            render(
                <LemonInputSelect
                    mode={mode}
                    options={mockOptions}
                    placeholder="Select an option"
                    data-attr="lemon-input-select"
                />
            )

            // Initially, the dropdown options should not be visible
            for (const option of mockOptions) {
                expect(screen.queryByText(option.label)).not.toBeInTheDocument()
            }

            // Find the input element by its placeholder
            const input = screen.getByPlaceholderText('Select an option')
            expect(input).toBeInTheDocument()

            // Act: Focus the input to trigger the dropdown to open
            fireEvent.focus(input)

            // Assert: The dropdown should now be visible and contain the correct option labels
            for (const option of mockOptions) {
                // Using findByText to gracefully handle the asynchronous nature of the popover appearing
                expect(await screen.findByText(option.label)).toBeInTheDocument()
            }
        })
    })

    describe('filtering options', () => {
        it('should filter visible options based on input value when disableFiltering is false', async () => {
            render(
                <LemonInputSelect
                    mode="multiple"
                    options={mockOptions}
                    placeholder="Select an option"
                    disableFiltering={false}
                />
            )

            const input = screen.getByPlaceholderText('Select an option')
            fireEvent.focus(input)

            // Simulate typing "2" into the input
            fireEvent.change(input, { target: { value: '2' } })

            // Wait for the options to filter
            await waitFor(() => {
                expect(screen.getByText('Option 2')).toBeVisible()
            })

            // Assert that only Option 2 is visible
            expect(screen.getByText('Option 2')).toBeVisible()
            expect(screen.queryByText('Option 1')).not.toBeInTheDocument()
            expect(screen.queryByText('Option 3')).not.toBeInTheDocument()
        })
    })

    describe('single select mode', () => {
        it('should update the value and close the dropdown when an option is selected', async () => {
            const onChange = jest.fn()
            render(
                <LemonInputSelect
                    mode="single"
                    options={mockOptions}
                    placeholder="Select an option"
                    onChange={onChange}
                />
            )

            const input = screen.getByPlaceholderText('Select an option')
            fireEvent.focus(input)

            const optionToSelect = mockOptions[1]
            const optionElement = await screen.findByText(optionToSelect.label)
            fireEvent.click(optionElement)

            expect(onChange).toHaveBeenCalledWith([optionToSelect.key])
            expect(screen.queryByText(mockOptions[0].label)).not.toBeInTheDocument()
            expect(screen.queryByText(mockOptions[1].label)).not.toBeInTheDocument()
            expect(screen.queryByText(mockOptions[2].label)).not.toBeInTheDocument()
        })
    })

    describe('multi-select mode', () => {
        it('should add the selected option to the value array and keep the dropdown open', async () => {
            const onChange = jest.fn()

            render(
                <LemonInputSelect
                    mode="multiple"
                    options={mockOptions}
                    value={[]}
                    onChange={onChange}
                    placeholder="Select options"
                />
            )

            const input = screen.getByPlaceholderText('Select options')
            fireEvent.focus(input)

            const option1 = await screen.findByText('Option 1')
            fireEvent.click(option1)

            expect(onChange).toHaveBeenCalledWith(['option1'])

            // Assert that the dropdown remains open by checking if the options are still visible
            expect(screen.getByText('Option 2')).toBeInTheDocument()
            expect(screen.getByText('Option 3')).toBeInTheDocument()
        })
    })

    describe('keyboard navigation and selection', () => {
        it('should allow keyboard navigation and select the focused option with Enter', () => {
            const onChange = jest.fn()
            render(
                <LemonInputSelect
                    mode="single"
                    options={mockOptions}
                    placeholder="Select an option"
                    onChange={onChange}
                />
            )

            const input = screen.getByPlaceholderText('Select an option')
            act(() => {
                fireEvent.focus(input)
            })

            // Move down to the second option
            act(() => {
                fireEvent.keyDown(input, { key: 'ArrowDown' })
            })

            // Select the second option
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter' })
            })

            expect(onChange).toHaveBeenCalledTimes(1)
            expect(onChange).toHaveBeenCalledWith(['option2'])
        })
    })

    describe('allowCustomValues', () => {
        it('should add a custom value to the selection when Enter is pressed', () => {
            const onChange = jest.fn()
            render(
                <LemonInputSelect
                    mode="multiple"
                    allowCustomValues={true}
                    onChange={onChange}
                    placeholder="Enter a custom value"
                />
            )

            const input = screen.getByPlaceholderText('Enter a custom value')
            fireEvent.focus(input)
            fireEvent.change(input, { target: { value: 'customValue' } })
            fireEvent.keyDown(input, { key: 'Enter' })

            expect(onChange).toHaveBeenCalledTimes(1)
            expect(onChange).toHaveBeenCalledWith(['customValue'])
        })

        it('should add a single value with commas preserved when allowCustomValues is true and mode is multiple', () => {
            const onChange = jest.fn()
            const inputValue = '\\,first\\,second\\,'

            render(
                <LemonInputSelect
                    mode="multiple"
                    allowCustomValues={true}
                    onChange={onChange}
                    placeholder="Enter values"
                />
            )

            const inputElement = screen.getByPlaceholderText('Enter values')

            fireEvent.focus(inputElement)
            fireEvent.change(inputElement, { target: { value: inputValue } })
            fireEvent.keyDown(inputElement, { key: 'Enter' })

            expect(onChange).toHaveBeenCalledTimes(1)
            expect(onChange).toHaveBeenCalledWith(['\\,first\\,second\\,'.replaceAll('\\,', ',')])
        })
    })

    it('should handle values with keys not present in options gracefully', () => {
        const invalidKey = 'invalidOption'
        const initialValue = [invalidKey]

        render(
            <LemonInputSelect
                mode="multiple"
                options={mockOptions}
                value={initialValue}
                placeholder="Select an option"
            />
        )

        // Assert that the component renders without crashing.  We check that the invalid key is displayed.
        expect(screen.getByText(invalidKey)).toBeInTheDocument()
    })
})