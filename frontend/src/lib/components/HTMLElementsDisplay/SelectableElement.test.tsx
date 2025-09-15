import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TagPart, SelectableElement } from './SelectableElement'
import { ParsedCSSSelector } from 'lib/components/HTMLElementsDisplay/preselectWithCSS'
import { ElementType } from '~/types'

describe('TagPart', () => {
    // Combined test cases using test.each
    test.each([
        {
            description: 'should add tag when clicked and tag is initially undefined',
            tagName: 'div',
            initialSelectedParts: { id: 'some-id' },
            expectedSelectedParts: { id: 'some-id', tag: 'div' },
        },
        {
            description: 'should remove tag when clicked and tag is already selected',
            tagName: 'div',
            initialSelectedParts: { tag: 'div', id: 'some-id' },
            expectedSelectedParts: { id: 'some-id', tag: undefined },
        },
        {
            description: 'should handle empty object for selectedParts correctly',
            tagName: 'div',
            initialSelectedParts: {},
            expectedSelectedParts: { tag: 'div' },
        },
        {
            description: 'should preserve other properties when updating tag selection',
            tagName: 'span',
            initialSelectedParts: { id: 'test-id', class: 'test-class' },
            expectedSelectedParts: { id: 'test-id', class: 'test-class', tag: 'span' },
        },
    ])('$description', ({ tagName, initialSelectedParts, expectedSelectedParts }) => {
        // Arrange
        const onChange = jest.fn()

        render(
            <TagPart 
                tagName={tagName} 
                selectedParts={initialSelectedParts} 
                onChange={onChange} 
                readonly={false} 
            />
        )

        // Act
        const tagElement = screen.getByText(tagName)
        fireEvent.click(tagElement)

        // Assert
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith(expectedSelectedParts)
    })

    it('should render a span containing the tagName for any valid input', () => {
        const tagName = 'span'
        const selectedParts: ParsedCSSSelector = {}
        const onChange = jest.fn()

        render(<TagPart tagName={tagName} selectedParts={selectedParts} onChange={onChange} readonly={false} />)

        const spanElement = screen.getByText(tagName)
        expect(spanElement).toBeInTheDocument()
        expect(spanElement.tagName).toBe('SPAN')
    })

    it('should stop event propagation when clicked', () => {
        // Arrange
        const onChange = jest.fn()
        const tagName = 'div'
        const selectedParts: ParsedCSSSelector = {}
        const parentOnClick = jest.fn()

        render(
            <div onClick={parentOnClick}>
                <TagPart
                    tagName={tagName}
                    selectedParts={selectedParts}
                    onChange={onChange}
                    readonly={false}
                />
            </div>
        )

        // Act
        const tagElement = screen.getByText(tagName)
        fireEvent.click(tagElement)

        // Assert
        expect(parentOnClick).not.toHaveBeenCalled()
    })

    it('should correctly apply CSS classes based on readonly and selection state transitions', () => {
        // Arrange
        const onChange = jest.fn()
        const tagName = 'div'
        let selectedParts: ParsedCSSSelector = {}

        const { rerender } = render(
            <TagPart tagName={tagName} selectedParts={selectedParts} onChange={onChange} readonly={false} />
        )

        const tagElement = screen.getByText(tagName)

        // Assert initial state
        expect(tagElement).toHaveClass('decoration-primary-highlight')
        expect(tagElement).toHaveClass('cursor-pointer')
        expect(tagElement).toHaveClass('SelectableElement')
        expect(tagElement).not.toHaveClass('SelectableElement--selected')
        expect(tagElement).toHaveClass('hover:underline')

        // Act: Select the tag
        fireEvent.click(tagElement)
        selectedParts = { tag: tagName }
        rerender(<TagPart tagName={tagName} selectedParts={selectedParts} onChange={onChange} readonly={false} />)

        // Assert selected state
        expect(tagElement).toHaveClass('decoration-primary-highlight')
        expect(tagElement).toHaveClass('cursor-pointer')
        expect(tagElement).toHaveClass('SelectableElement')
        expect(tagElement).toHaveClass('SelectableElement--selected')
        expect(tagElement).not.toHaveClass('hover:underline')

        // Act: Unselect the tag
        fireEvent.click(tagElement)
        selectedParts = {}
        rerender(<TagPart tagName={tagName} selectedParts={selectedParts} onChange={onChange} readonly={false} />)

        // Assert unselected state
        expect(tagElement).toHaveClass('decoration-primary-highlight')
        expect(tagElement).toHaveClass('cursor-pointer')
        expect(tagElement).toHaveClass('SelectableElement')
        expect(tagElement).not.toHaveClass('SelectableElement--selected')
        expect(tagElement).toHaveClass('hover:underline')
    })
})

describe('SelectableElement', () => {
    const mockOnChange = jest.fn()

    // A mock element that has all the properties we want to test for this scenario
    const mockElement: ElementType = {
        tag_name: 'div',
        attr_id: 'test-id',
        attributes: {
            'attr__class': 'class-one class-two',
            'attr__data-cy': 'test-element',
        },
        text: 'Click me',
        order: 0,
        href: null,
        name: null,
        attr_name: null,
        event: null,
        $el: null,
    }

    beforeEach(() => {
        mockOnChange.mockClear()
    })

    it('should render the tag name, id, and attributes using TagPart, IdPart, and AttributePart', () => {
        // Arrange
        render(
            <SelectableElement
                element={mockElement}
                isDeepestChild={false}
                onChange={mockOnChange}
                readonly={false}
                indent=""
            />
        )

        // Assert
        // We find the parent <pre> element to check its entire content.
        // This verifies that all parts (tag, id, attributes) are rendered correctly and in order.
        const preElement = screen.getByText(mockElement.tag_name).closest('pre')

        // Check for the tag name rendered by TagPart
        expect(preElement).toHaveTextContent(mockElement.tag_name)

        // Check for the ID rendered by IdPart
        expect(preElement).toHaveTextContent(`id="${mockElement.attr_id}"`)

        // Check for the attributes rendered by AttributePart
        expect(preElement).toHaveTextContent('class="class-one class-two"')
        expect(preElement).toHaveTextContent('data-cy="test-element"')

        // Check for the text content rendered by WithSelectedText
        expect(preElement).toHaveTextContent(mockElement.text || '')

        // A more robust check on the whole line to ensure correct formatting and order
        expect(preElement?.textContent).toContain(
            `<div id="test-id" class="class-one class-two" data-cy="test-element">Click me`
        )
    })

    it('should render the closing tag when isDeepestChild is true', () => {
        render(
            <SelectableElement
                element={mockElement}
                isDeepestChild={true}
                onChange={mockOnChange}
                readonly={false}
                indent=""
            />
        )

        const preElement = screen.getByText(mockElement.tag_name).closest('pre')
        expect(preElement).toHaveTextContent(`</${mockElement.tag_name}>`)
    })

    it('should apply the bg-brand-red class when isDeepestChild is true and highlight is true', () => {
        render(
            <SelectableElement
                element={mockElement}
                isDeepestChild={true}
                onChange={mockOnChange}
                readonly={false}
                indent=""
                highlight={true}
            />
        )

        const preElement = screen.getByText(/Click me/, { selector: 'pre' })
        expect(preElement).toHaveClass('bg-brand-red')
    })

    it('should render WithSelectedText and highlight the selectedText when both text and selectedText are provided', () => {
        const mockElement: ElementType = {
            tag_name: 'div',
            attr_id: 'test-id',
            attributes: {},
            text: 'This is the text to be selected',
            order: 0,
            href: null,
            name: null,
            attr_name: null,
            event: null,
            $el: null,
        }

        const selectedText = 'text to be';

        render(
            <SelectableElement
                element={mockElement}
                isDeepestChild={false}
                onChange={mockOnChange}
                readonly={false}
                indent=""
                selectedText={selectedText}
            />
        )

        const highlightedSpan = screen.getByText(selectedText, { exact: false })
        expect(highlightedSpan).toBeInTheDocument()
        expect(highlightedSpan).toHaveClass('bg-brand-yellow')

        const preElement = screen.getByText(mockElement.tag_name).closest('pre')
        expect(preElement).toHaveTextContent(`<div id="test-id">${mockElement.text}`)
    })

    it('should call onChange correctly when parsedCSSSelector is undefined and a child component triggers a change', () => {
        render(
            <SelectableElement
                element={mockElement}
                isDeepestChild={false}
                onChange={mockOnChange}
                readonly={false}
                indent=""
                parsedCSSSelector={undefined}
            />
        )

        const tagPart = screen.getByText(mockElement.tag_name)
        fireEvent.click(tagPart)

        expect(mockOnChange).toHaveBeenCalledTimes(1)
        expect(mockOnChange).toHaveBeenCalledWith({ tag: 'div' })
    })

    it('should generate unique keys for AttributePart components with identical attributes', () => {
        const mockElements: ElementType[] = [
            {
                tag_name: 'div',
                attr_id: null,
                attributes: { 'attr__data-test': 'same-value' },
                text: '',
                order: 0,
                href: null,
                name: null,
                attr_name: null,
                event: null,
                $el: null,
            },
            {
                tag_name: 'div',
                attr_id: null,
                attributes: { 'attr__data-test': 'same-value' },
                text: '',
                order: 1,
                href: null,
                name: null,
                attr_name: null,
                event: null,
                $el: null,
            },
        ]

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        render(
            <>
                {mockElements.map((element, index) => (
                    <SelectableElement
                        key={index}
                        element={element}
                        isDeepestChild={false}
                        onChange={mockOnChange}
                        readonly={false}
                        indent=""
                    />
                ))}
            </>
        )

        expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Warning: Each child in a list should have a unique "key" prop.'))

        consoleSpy.mockRestore()
    })

    it('should render text content without highlighting when selectedText is undefined', () => {
        const mockElementWithText: ElementType = {
            tag_name: 'p',
            attr_id: undefined,
            attributes: {},
            text: 'This is some text content.',
            order: 0,
            href: null,
            name: null,
            attr_name: null,
            event: null,
            $el: null,
        }

        render(
            <SelectableElement
                element={mockElementWithText}
                isDeepestChild={false}
                onChange={mockOnChange}
                readonly={false}
                indent=""
                selectedText={undefined}
            />
        )

        const preElement = screen.getByText(mockElementWithText.tag_name).closest('pre')
        expect(preElement).toHaveTextContent(mockElementWithText.text)
        expect(preElement?.querySelector('span.bg-brand-yellow')).toBeNull()
    })

    describe('size prop', () => {
        it('should apply the correct text size class based on the size prop', () => {
            // Arrange
            const { rerender } = render(
                <SelectableElement
                    element={mockElement}
                    isDeepestChild={false}
                    onChange={mockOnChange}
                    readonly={false}
                    indent=""
                    size="small"
                />
            )

            // Assert
            const preElement = screen.getByText(mockElement.tag_name).closest('pre')
            expect(preElement).toHaveClass('text-sm')

            // Act
            rerender(
                <SelectableElement
                    element={mockElement}
                    isDeepestChild={false}
                    onChange={mockOnChange}
                    readonly={false}
                    indent=""
                    size="xsmall"
                />
            )

            // Assert
            expect(preElement).toHaveClass('text-xs')
        })
    })
})