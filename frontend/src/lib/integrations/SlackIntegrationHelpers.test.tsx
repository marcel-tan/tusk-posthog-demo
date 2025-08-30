import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SlackChannelPicker } from './SlackIntegrationHelpers'
import { useActions, useValues } from 'kea'
import { IntegrationType, SlackChannelType } from '~/types'
import { initKeaTests } from '~/test/init'

// Mock Kea hooks to control the logic's output
jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

const useValuesMock = useValues as jest.Mock
const useActionsMock = useActions as jest.Mock

const mockIntegration: IntegrationType = {
    id: 1,
    kind: 'slack',
    config: {},
    created_at: '2023-01-01T00:00:00Z',
    created_by: null,
    errors: '',
}

const mockSlackChannels: SlackChannelType[] = [
    { id: 'C123', name: 'general', is_private: false, is_member: true },
    { id: 'C456', name: 'private-channel', is_private: true, is_member: true },
    { id: 'C789', name: 'another-channel', is_private: false, is_member: false, is_ext_shared: true },
]

describe('SlackChannelPicker', () => {
    beforeEach(() => {
        initKeaTests()
        useValuesMock.mockClear()
        useActionsMock.mockClear()
    })

    test('should render with correct options and value when channels are loaded and user is a member', async () => {
        const loadSlackChannelsMock = jest.fn()
        const onChangeMock = jest.fn()

        useValuesMock.mockReturnValue({
            slackChannels: mockSlackChannels,
            slackChannelsLoading: false,
            isMemberOfSlackChannel: (channel: string) => {
                const [channelId] = channel.split('|')
                // For this happy path, the user is a member of the selected channel
                return channelId === 'C123'
            },
        })
        useActionsMock.mockReturnValue({
            loadSlackChannels: loadSlackChannelsMock,
        })

        render(<SlackChannelPicker integration={mockIntegration} value="C123" onChange={onChangeMock} />)

        // Assert: The correct value is displayed. The component displays the full label in the placeholder.
        const inputElement = screen.getByPlaceholderText('C123 #general')
        expect(inputElement).toBeInTheDocument()

        // Assert: The warning banner is not present because the user is a member.
        expect(screen.queryByText(/The PostHog Slack App is not in this channel/)).not.toBeInTheDocument()

        // Assert: loadSlackChannels was called on mount.
        expect(loadSlackChannelsMock).toHaveBeenCalledTimes(1)

        // Act: Open the dropdown to check the options by clicking the input element.
        fireEvent.click(inputElement)

        // Assert: All options are rendered correctly.
        expect(await screen.findByText('#general')).toBeInTheDocument()
        expect(screen.getByText('🔒private-channel')).toBeInTheDocument()
        const anotherChannelOption = screen.getByText('#another-channel')
        expect(anotherChannelOption).toBeInTheDocument()
        // Check that the external shared icon is rendered for the relevant channel
        expect(anotherChannelOption.closest('span')?.querySelector('svg')).toBeInTheDocument()
    })

    test('should display LemonBanner warning if isMemberOfSlackChannel returns false', () => {
        const loadSlackChannelsMock = jest.fn()
        const onChangeMock = jest.fn()

        useValuesMock.mockReturnValue({
            slackChannels: [],
            slackChannelsLoading: false,
            isMemberOfSlackChannel: (channel: string) => {
                return false // Simulate not being a member of the channel
            },
        })
        useActionsMock.mockReturnValue({
            loadSlackChannels: loadSlackChannelsMock,
        })

        render(<SlackChannelPicker integration={mockIntegration} value="C123|#general" onChange={onChangeMock} />)

        const warningBanner = screen.getByText(/The PostHog Slack App is not in this channel/)
        expect(warningBanner).toBeInTheDocument()
    })

    test('should call loadSlackChannels on mount if not disabled', () => {
        const loadSlackChannelsMock = jest.fn()

        useValuesMock.mockReturnValue({
            slackChannels: mockSlackChannels,
            slackChannelsLoading: false,
            isMemberOfSlackChannel: () => true,
        })
        useActionsMock.mockReturnValue({
            loadSlackChannels: loadSlackChannelsMock,
        })

        render(<SlackChannelPicker integration={mockIntegration} />)

        expect(loadSlackChannelsMock).toHaveBeenCalledTimes(1)
    })

    test('should use the original value if the channel ID does not exist in slackChannels', () => {
        const loadSlackChannelsMock = jest.fn()
        const onChangeMock = jest.fn()
        const nonExistentChannelId = 'C999'
        const originalValue = nonExistentChannelId

        useValuesMock.mockReturnValue({
            slackChannels: mockSlackChannels,
            slackChannelsLoading: false,
            isMemberOfSlackChannel: () => null,
        })
        useActionsMock.mockReturnValue({
            loadSlackChannels: loadSlackChannelsMock,
        })

        render(
            <SlackChannelPicker
                integration={mockIntegration}
                value={originalValue}
                onChange={onChangeMock}
            />
        )

        const inputElement = screen.getByPlaceholderText(originalValue)
        expect(inputElement).toBeInTheDocument()
        expect(loadSlackChannelsMock).toHaveBeenCalledTimes(1)
    })

    test('should call loadSlackChannels when "Check again" is clicked and membership status does not change', () => {
        const loadSlackChannelsMock = jest.fn()
        const onChangeMock = jest.fn()

        useValuesMock.mockReturnValue({
            slackChannels: mockSlackChannels,
            slackChannelsLoading: false,
            isMemberOfSlackChannel: (channel: string) => {
                const [channelId] = channel.split('|')
                // Simulate that the user is NOT a member of the selected channel
                return false
            },
        })
        useActionsMock.mockReturnValue({
            loadSlackChannels: loadSlackChannelsMock,
        })

        render(<SlackChannelPicker integration={mockIntegration} value="C123" onChange={onChangeMock} />)

        // Assert: The warning banner is present because the user is not a member.
        expect(screen.getByText(/The PostHog Slack App is not in this channel/)).toBeInTheDocument()

        // Act: Click the "Check again" button.
        const checkAgainButton = screen.getByText('Check again')
        fireEvent.click(checkAgainButton)

        // Assert: loadSlackChannels was called again.
        expect(loadSlackChannelsMock).toHaveBeenCalledTimes(2) // Once on mount, once on button click

        // The following assertions are not possible without mocking the LemonButton component
        // or using a more specific selector to target the button.
        // However, we can assert that the button is present and clickable.
        expect(checkAgainButton).toBeEnabled()
    })
})