import { describe, it, expect } from 'vitest'
import { compareVersions } from './ua'

describe('compareVersions', () => {
  it('should compare major versions correctly', () => {
    expect(compareVersions('2.0', '1.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0', '2.0')).toBeLessThan(0)
    expect(compareVersions('111', '110')).toBeGreaterThan(0)
    expect(compareVersions('110', '111')).toBeLessThan(0)
  })

  it('should compare minor versions correctly', () => {
    expect(compareVersions('1.10', '1.4')).toBeGreaterThan(0)
    expect(compareVersions('1.4', '1.10')).toBeLessThan(0)
    expect(compareVersions('16.10', '16.4')).toBeGreaterThan(0)
    expect(compareVersions('16.4', '16.10')).toBeLessThan(0)
  })

  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0)
    expect(compareVersions('1.10', '1.10')).toBe(0)
    expect(compareVersions('111', '111')).toBe(0)
    expect(compareVersions('16.4', '16.4')).toBe(0)
  })

  it('should handle versions without minor part', () => {
    expect(compareVersions('111', '111.0')).toBe(0)
    expect(compareVersions('111.0', '111')).toBe(0)
    expect(compareVersions('112', '111')).toBeGreaterThan(0)
    expect(compareVersions('111', '112')).toBeLessThan(0)
  })

  it('should handle real-world browser versions', () => {
    expect(compareVersions('111.0', '111')).toBe(0)
    expect(compareVersions('111.0.5563.146', '111')).toBe(0)
    expect(compareVersions('113.0', '113')).toBe(0)
    expect(compareVersions('16.4', '16.4')).toBe(0)
    expect(compareVersions('120.0', '111')).toBeGreaterThan(0)
    expect(compareVersions('110.0', '111')).toBeLessThan(0)
  })

  it('should handle edge cases', () => {
    expect(compareVersions('0', '0')).toBe(0)
    expect(compareVersions('0.0', '0.0')).toBe(0)
    expect(compareVersions('1', '0')).toBeGreaterThan(0)
    expect(compareVersions('0', '1')).toBeLessThan(0)
  })
})
