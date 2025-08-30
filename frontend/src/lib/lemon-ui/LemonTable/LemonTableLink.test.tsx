import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LemonTableLink } from './LemonTableLink'
import '@testing-library/jest-dom'

describe('LemonTableLink', () => {
    test('should render the title and description correctly when both are provided as strings', () => {
        const title = 'My Awesome Link'
        const description = 'This is the description for the link.'
        const path = '/some/path'

        render(<LemonTableLink title={title} description={description} to={path} />)

        // Assert that the title is rendered
        const titleElement = screen.getByText(title)
        expect(titleElement).toBeInTheDocument()

        // Assert that the description is rendered
        const descriptionElement = screen.getByText(description)
        expect(descriptionElement).toBeInTheDocument()

        // Assert that the entire component is a link pointing to the correct path
        const linkElement = screen.getByRole('link', { name: `${title} ${description}` })
        expect(linkElement).toBeInTheDocument()
        expect(linkElement).toHaveAttribute('href', path)
    })

    test('should render only the title and not render a description block when the description prop is not provided', () => {
        const title = 'My Awesome Link'
        const path = '/some/path'

        render(<LemonTableLink title={title} to={path} />)

        // Assert that the title is rendered
        const titleElement = screen.getByText(title)
        expect(titleElement).toBeInTheDocument()

        // Assert that the description block is not rendered
        const descriptionElement = screen.queryByText(/This is the description for the link./i) // Using a regex to broadly check for any description text
        expect(descriptionElement).toBeNull()

        // Assert that the entire component is a link pointing to the correct path
        const linkElement = screen.getByRole('link', { name: title })
        expect(linkElement).toBeInTheDocument()
        expect(linkElement).toHaveAttribute('href', path)
    })

    test('should render the title and description directly when both are provided as JSX elements', () => {
        const title = <h1>My Awesome Title</h1>
        const description = <p>This is the description for the link.</p>
        const path = '/some/path'

        render(<LemonTableLink title={title} description={description} to={path} />)

        // Assert that the title is rendered
        const titleElement = screen.getByText('My Awesome Title')
        expect(titleElement).toBeInTheDocument()

        // Assert that the description is rendered
        const descriptionElement = screen.getByText('This is the description for the link.')
        expect(descriptionElement).toBeInTheDocument()
    })

    test('should pass "to", "onClick", "target", and "className" props to the underlying Link component', () => {
        const title = 'My Link'
        const to = '/some/path'
        const onClick = jest.fn()
        const target = '_blank'
        const className = 'custom-class'

        render(
            <LemonTableLink
                title={title}
                to={to}
                onClick={onClick}
                target={target}
                className={className}
            />
        )

        const linkElement = screen.getByRole('link', { name: title })
        expect(linkElement).toBeInTheDocument()
        expect(linkElement).toHaveAttribute('href', to)
        expect(linkElement).toHaveAttribute('target', target)
        expect(linkElement).toHaveClass(className)

        fireEvent.click(linkElement)
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('should handle malformed markdown in the description gracefully', () => {
        const title = 'My Link'
        const malformedMarkdown = 'This is a *malformed* markdown string with an unclosed emphasis.';

        render(<LemonTableLink title={title} description={malformedMarkdown} to="/test" />);

        const descriptionContainer = screen.getByText(/This is a/, {exact: false});
        expect(descriptionContainer).toBeInTheDocument();
        expect(screen.getByText('malformed')).toBeInTheDocument();
        expect(screen.getByText(/markdown string with an unclosed emphasis/, {exact: false})).toBeInTheDocument();
    });

    test('should not cause layout issues when description is a JSX element with a long string', () => {
        const title = 'JSX Description Test'
        const longString = 'This is a very long string that should overflow if max-width is not applied. '.repeat(20)
        const description = <div data-testid="jsx-description">{longString}</div>
        const path = '/some/path'

        render(<LemonTableLink title={title} description={description} to={path} />)

        const descriptionElement = screen.getByTestId('jsx-description')
        expect(descriptionElement).toBeInTheDocument()
        expect(descriptionElement).not.toHaveClass('max-w-[30rem]')
    })
})