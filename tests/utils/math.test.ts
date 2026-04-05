import { describe, it, expect } from 'vitest'
import { isValidNumber, safeDivide, safeClamp, safePct, safeFixed } from '@/utils/math'

describe('isValidNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isValidNumber(0)).toBe(true)
    expect(isValidNumber(42)).toBe(true)
    expect(isValidNumber(-3.14)).toBe(true)
    expect(isValidNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
  })

  it('returns false for NaN, Infinity, and non-numbers', () => {
    expect(isValidNumber(NaN)).toBe(false)
    expect(isValidNumber(Infinity)).toBe(false)
    expect(isValidNumber(-Infinity)).toBe(false)
    expect(isValidNumber(null)).toBe(false)
    expect(isValidNumber(undefined)).toBe(false)
    expect(isValidNumber('42')).toBe(false)
    expect(isValidNumber(true)).toBe(false)
  })
})

describe('safeDivide', () => {
  it('divides normally for valid inputs', () => {
    expect(safeDivide(10, 2)).toBe(5)
    expect(safeDivide(7, 3)).toBeCloseTo(2.333, 2)
    expect(safeDivide(-10, 5)).toBe(-2)
  })

  it('returns fallback for zero denominator', () => {
    expect(safeDivide(10, 0)).toBe(0)
    expect(safeDivide(10, 0, -1)).toBe(-1)
  })

  it('returns fallback for NaN inputs', () => {
    expect(safeDivide(NaN, 5)).toBe(0)
    expect(safeDivide(10, NaN)).toBe(0)
    expect(safeDivide(NaN, NaN)).toBe(0)
  })

  it('returns fallback for Infinity inputs', () => {
    expect(safeDivide(Infinity, 5)).toBe(0)
    expect(safeDivide(5, Infinity)).toBe(0)
  })
})

describe('safeClamp', () => {
  it('clamps within range', () => {
    expect(safeClamp(5, 0, 10)).toBe(5)
    expect(safeClamp(-1, 0, 10)).toBe(0)
    expect(safeClamp(15, 0, 10)).toBe(10)
  })

  it('returns fallback for NaN', () => {
    expect(safeClamp(NaN, 0, 1)).toBe(0)
    expect(safeClamp(NaN, 0, 1, -1)).toBe(-1)
  })
})

describe('safePct', () => {
  it('computes percentage correctly', () => {
    expect(safePct(1, 4)).toBe(25)
    expect(safePct(3, 3)).toBe(100)
  })

  it('handles zero denominator', () => {
    expect(safePct(5, 0)).toBe(0)
  })
})

describe('safeFixed', () => {
  it('formats valid numbers', () => {
    expect(safeFixed(3.14159, 2)).toBe('3.14')
    expect(safeFixed(100, 0)).toBe('100')
  })

  it('returns fallback for null/NaN', () => {
    expect(safeFixed(null)).toBe('—')
    expect(safeFixed(undefined)).toBe('—')
    expect(safeFixed(NaN)).toBe('—')
    expect(safeFixed(Infinity, 2, 'N/A')).toBe('N/A')
  })
})
