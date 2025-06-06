import { describe, it, expect } from 'vitest'
import { hsb2rgb, rgb2hsb } from './color'

describe('hsb2rgb', () => {
  it('should convert HSB to RGB correctly', () => {
    expect(hsb2rgb([0, 0, 0])).toEqual([0, 0, 0])
    expect(hsb2rgb([0, 0, 100])).toEqual([255, 255, 255])
    expect(hsb2rgb([0, 100, 100])).toEqual([255, 0, 0])
    expect(hsb2rgb([120, 100, 100])).toEqual([0, 255, 0])
    expect(hsb2rgb([240, 100, 100])).toEqual([0, 0, 255])
    expect(hsb2rgb([360, 100, 100])).toEqual([255, 0, 0])
    expect(hsb2rgb([60, 100, 100])).toEqual([255, 255, 0])
    expect(hsb2rgb([180, 100, 100])).toEqual([0, 255, 255])
    expect(hsb2rgb([300, 100, 100])).toEqual([255, 0, 255])
    expect(hsb2rgb([0, 0, 75])).toEqual([191, 191, 191])
    expect(hsb2rgb([0, 0, 50])).toEqual([128, 128, 128])
    expect(hsb2rgb([0, 100, 50])).toEqual([128, 0, 0])
    expect(hsb2rgb([60, 100, 50])).toEqual([128, 128, 0])
    expect(hsb2rgb([120, 100, 50])).toEqual([0, 128, 0])
    expect(hsb2rgb([300, 100, 50])).toEqual([128, 0, 128])
    expect(hsb2rgb([180, 100, 50])).toEqual([0, 128, 128])
    expect(hsb2rgb([240, 100, 50])).toEqual([0, 0, 128])
  })
})

describe('rgb2hsb', () => {
  it('should convert RGB to HSB correctly', () => {
    expect(rgb2hsb([0, 0, 0])).toEqual([0, 0, 0])
    expect(rgb2hsb([255, 255, 255])).toEqual([0, 0, 100])
    expect(rgb2hsb([255, 0, 0])).toEqual([0, 100, 100])
    expect(rgb2hsb([0, 255, 0])).toEqual([120, 100, 100])
    expect(rgb2hsb([0, 0, 255])).toEqual([240, 100, 100])
    expect(rgb2hsb([255, 255, 0])).toEqual([60, 100, 100])
    expect(rgb2hsb([0, 255, 255])).toEqual([180, 100, 100])
    expect(rgb2hsb([255, 0, 255])).toEqual([300, 100, 100])
    expect(rgb2hsb([191, 191, 191])).toEqual([0, 0, 75])
    expect(rgb2hsb([128, 128, 128])).toEqual([0, 0, 50])
    expect(rgb2hsb([128, 0, 0])).toEqual([0, 100, 50])
    expect(rgb2hsb([128, 128, 0])).toEqual([60, 100, 50])
    expect(rgb2hsb([0, 128, 0])).toEqual([120, 100, 50])
    expect(rgb2hsb([128, 0, 128])).toEqual([300, 100, 50])
    expect(rgb2hsb([0, 128, 128])).toEqual([180, 100, 50])
    expect(rgb2hsb([0, 0, 128])).toEqual([240, 100, 50])
  })
})
