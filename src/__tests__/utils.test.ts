import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, formatDate, formatRelativeTime, getInitials } from '@/lib/utils'

describe('cn (classname merge utility)', () => {
  it('should merge simple classnames', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classnames', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should return empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toBe('Jan 15, 2024')
  })

  it('should format date with different month', () => {
    const result = formatDate('2024-12-25T12:00:00Z')
    // Account for timezone differences
    expect(result).toMatch(/Dec 2[45], 2024/)
  })

  it('should handle date at start of month', () => {
    const result = formatDate('2024-03-01T12:00:00Z')
    // Account for timezone differences
    expect(result).toMatch(/Mar 1, 2024|Feb 29, 2024/)
  })

  it('should handle date strings without time', () => {
    const result = formatDate('2024-06-20')
    expect(result).toMatch(/Jun 20, 2024|Jun 19, 2024/) // Timezone may affect this
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "just now" for very recent times', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const tenSecondsAgo = new Date('2024-01-15T11:59:50Z').toISOString()
    expect(formatRelativeTime(tenSecondsAgo)).toBe('just now')
  })

  it('should return minutes ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z').toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')

    const thirtyMinutesAgo = new Date('2024-01-15T11:30:00Z').toISOString()
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30m ago')
  })

  it('should return hours ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const twoHoursAgo = new Date('2024-01-15T10:00:00Z').toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')

    const twentyThreeHoursAgo = new Date('2024-01-14T13:00:00Z').toISOString()
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago')
  })

  it('should return days ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const twoDaysAgo = new Date('2024-01-13T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')

    const sixDaysAgo = new Date('2024-01-09T12:00:00Z').toISOString()
    expect(formatRelativeTime(sixDaysAgo)).toBe('6d ago')
  })

  it('should return formatted date for older times', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const twoWeeksAgo = new Date('2024-01-01T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoWeeksAgo)).toBe('Jan 1, 2024')
  })

  it('should handle 1 minute ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const oneMinuteAgo = new Date('2024-01-15T11:59:00Z').toISOString()
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago')
  })

  it('should handle exactly 1 hour ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const oneHourAgo = new Date('2024-01-15T11:00:00Z').toISOString()
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago')
  })

  it('should handle exactly 1 day ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const oneDayAgo = new Date('2024-01-14T12:00:00Z').toISOString()
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago')
  })
})

describe('getInitials', () => {
  it('should return initials for a single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('should return initials for full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('should return first two initials for multiple names', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  it('should return initials in uppercase', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('should return "?" for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('should return "?" for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('should handle single character names', () => {
    expect(getInitials('J D')).toBe('JD')
  })

  it('should handle names with extra spaces', () => {
    expect(getInitials('John  Doe')).toBe('JD')
  })
})
