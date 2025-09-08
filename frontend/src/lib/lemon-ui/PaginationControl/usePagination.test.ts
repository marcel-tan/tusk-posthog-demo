import { renderHook } from '@testing-library/react'
import { useActions, useValues } from 'kea'

import { PaginationAuto, PaginationManual } from './types'
import { usePagination } from './usePagination'

// Mock the 'kea' library to control router values and actions
jest.mock('kea', () => ({
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

// Typecast the mocks for easier use and type safety in tests
const mockedUseValues = useValues as jest.Mock
const mockedUseActions = useActions as jest.Mock

describe('usePagination', () => {
    // Setup default mock returns that can be overridden in specific tests
    beforeEach(() => {
        mockedUseValues.mockReturnValue({
            location: { pathname: '/' },
            searchParams: {},
            hashParams: {},
        })
        mockedUseActions.mockReturnValue({
            push: jest.fn(),
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('PaginationAuto', () => {
        it('should return correct state for a given dataSource and valid configuration', () => {
            // Arrange: Create a data source with 25 items and configure pagination for 10 items per page.
            const dataSource = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
            const pagination: PaginationAuto = { pageSize: 10 }

            // Simulate being on page 2 via URL search parameters
            mockedUseValues.mockReturnValue({
                location: { pathname: '/' },
                searchParams: { page: '2' },
                hashParams: {},
            })

            // Act: Render the hook with the test data and configuration.
            const { result } = renderHook(() => usePagination(dataSource, pagination))

            // Assert: Verify that the returned state is correct for page 2.
            const expectedPageCount = 3 // Math.ceil(25 / 10)
            const expectedStartIndex = 10 // (2 - 1) * 10
            const expectedEndIndex = 20 // 10 + 10
            const expectedDataSourcePage = dataSource.slice(expectedStartIndex, expectedEndIndex)

            expect(result.current.dataSourcePage).toEqual(expectedDataSourcePage)
            expect(result.current.currentPage).toBe(2)
            expect(result.current.pageCount).toBe(expectedPageCount)
            expect(result.current.currentStartIndex).toBe(expectedStartIndex)
            expect(result.current.currentEndIndex).toBe(expectedEndIndex)
            expect(result.current.entryCount).toBe(dataSource.length)
        })

        it('should default to page 1 when the page parameter is non-numeric', () => {
            const dataSource = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
            const pagination: PaginationAuto = { pageSize: 10 }

            mockedUseValues.mockReturnValue({
                location: { pathname: '/' },
                searchParams: { page: 'abc' },
                hashParams: {},
            })

            const { result } = renderHook(() => usePagination(dataSource, pagination))

            expect(result.current.currentPage).toBe(1)
        })

        it('should correctly parse page numbers with leading zeros from searchParams', () => {
            // Arrange
            const dataSource = Array.from({ length: 80 }, (_, i) => ({ id: i + 1 }))
            const pagination: PaginationAuto = { pageSize: 10 }

            // Simulate a URL with a page number containing leading zeros
            mockedUseValues.mockReturnValue({
                location: { pathname: '/' },
                searchParams: { page: '08' },
                hashParams: {},
            })

            // Act
            const { result } = renderHook(() => usePagination(dataSource, pagination))

            // Assert
            expect(result.current.currentPage).toBe(8)

            const expectedPageCount = 8
            const expectedStartIndex = 70 // (8 - 1) * 10
            const expectedEndIndex = 80 // 70 + 10
            const expectedDataSourcePage = dataSource.slice(expectedStartIndex, expectedEndIndex)

            expect(result.current.pageCount).toBe(expectedPageCount)
            expect(result.current.currentStartIndex).toBe(expectedStartIndex)
            expect(result.current.currentEndIndex).toBe(expectedEndIndex)
            expect(result.current.dataSourcePage).toEqual(expectedDataSourcePage)
        })
    })

    describe('PaginationManual', () => {
        it('should use externally provided currentPage and entryCount from PaginationManual', () => {
            const dataSource = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }))
            const currentPage = 3
            const entryCount = 50
            const pageSize = 10

            const pagination: PaginationManual = {
                controlled: true,
                currentPage: currentPage,
                entryCount: entryCount,
                pageSize: pageSize,
            }

            const { result } = renderHook(() => usePagination(dataSource, pagination))

            const expectedPageCount = Math.ceil(entryCount / pageSize)
            const expectedStartIndex = (currentPage - 1) * pageSize
            const expectedEndIndex = expectedStartIndex + dataSource.length
            const expectedDataSourcePage = dataSource

            expect(result.current.dataSourcePage).toEqual(expectedDataSourcePage)
            expect(result.current.currentPage).toBe(currentPage)
            expect(result.current.pageCount).toBe(expectedPageCount)
            expect(result.current.currentStartIndex).toBe(expectedStartIndex)
            expect(result.current.currentEndIndex).toBe(expectedEndIndex)
            expect(result.current.entryCount).toBe(entryCount)
        })

        it('should handle null currentPage in controlled mode', () => {
            const dataSource = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
            const pagination: PaginationManual = {
                controlled: true,
                pageSize: 10,
                currentPage: null,
                entryCount: 25,
            }

            const { result } = renderHook(() => usePagination(dataSource, pagination))

            expect(result.current.currentStartIndex).toBe(0)
            expect(result.current.currentEndIndex).toBe(dataSource.length)
            expect(result.current.dataSourcePage).toEqual(dataSource)
        })
    })

    describe('undefined pagination', () => {
        it('should return the entire dataSource as a single page when pagination is undefined', () => {
            const dataSource = [1, 2, 3, 4, 5]

            const { result } = renderHook(() => usePagination(dataSource, undefined))

            expect(result.current.dataSourcePage).toEqual(dataSource)
            expect(result.current.pageCount).toBe(null)
            expect(result.current.currentStartIndex).toBe(0)
            expect(result.current.currentEndIndex).toBe(dataSource.length)
        })
    })

    it('should update the current page in searchParams using setCurrentPage and the correct param name when id is provided', () => {
        const dataSource = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
        const pagination: PaginationAuto = { pageSize: 10 };
        const id = 'testId';

        const pushMock = jest.fn();
        mockedUseActions.mockReturnValue({
            push: pushMock,
        });

        mockedUseValues.mockReturnValue({
            location: { pathname: '/' },
            searchParams: {},
            hashParams: {},
        });

        const { result } = renderHook(() => usePagination(dataSource, pagination, id));
        const newPage = 3;

        result.current.setCurrentPage(newPage);

        expect(pushMock).toHaveBeenCalledWith(
            '/',
            { 'testId_page': newPage },
            {}
        );
    });

    it('should handle multiple instances without IDs independently', () => {
        const dataSource1 = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, source: 1 }))
        const pagination1: PaginationAuto = { pageSize: 5 }

        const dataSource2 = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, source: 2 }))
        const pagination2: PaginationAuto = { pageSize: 10 }

        // Simulate being on page 3 for the first pagination and page 2 for the second
        mockedUseValues.mockReturnValue({
            location: { pathname: '/' },
            searchParams: { page: '3' },
            hashParams: {},
        })

        const { result: result1 } = renderHook(() => usePagination(dataSource1, pagination1))

        mockedUseValues.mockReturnValue({
            location: { pathname: '/' },
            searchParams: { page: '2' },
            hashParams: {},
        })

        const { result: result2 } = renderHook(() => usePagination(dataSource2, pagination2))

        const expectedPageCount1 = 4
        const expectedStartIndex1 = 10
        const expectedEndIndex1 = 15
        const expectedDataSourcePage1 = dataSource1.slice(expectedStartIndex1, expectedEndIndex1)

        expect(result1.current.dataSourcePage).toEqual(expectedDataSourcePage1)
        expect(result1.current.currentPage).toBe(3)
        expect(result1.current.pageCount).toBe(expectedPageCount1)
        expect(result1.current.currentStartIndex).toBe(expectedStartIndex1)
        expect(result1.current.currentEndIndex).toBe(expectedEndIndex1)
        expect(result1.current.entryCount).toBe(dataSource1.length)

        const expectedPageCount2 = 3
        const expectedStartIndex2 = 10
        const expectedEndIndex2 = 20
        const expectedDataSourcePage2 = dataSource2.slice(expectedStartIndex2, expectedEndIndex2)

        expect(result2.current.dataSourcePage).toEqual(expectedDataSourcePage2)
        expect(result2.current.currentPage).toBe(2)
        expect(result2.current.pageCount).toBe(expectedPageCount2)
        expect(result2.current.currentStartIndex).toBe(expectedStartIndex2)
        expect(result2.current.currentEndIndex).toBe(expectedEndIndex2)
        expect(result2.current.entryCount).toBe(dataSource2.length)
    })
})