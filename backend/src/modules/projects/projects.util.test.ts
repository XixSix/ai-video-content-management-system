import { describe, expect, it } from '@jest/globals'
import { getClosestProjectAspectRatio } from './projects.util'

describe('project utilities', () => {
  it.each([
    [1080, 1920, '9:16'],
    [1080, 1350, '4:5'],
    [1080, 1080, '1:1'],
    [1920, 1080, '16:9'],
    [1965, 3488, '9:16']
  ])('maps %sx%s to %s', (width, height, expected) => {
    expect(getClosestProjectAspectRatio(width, height)).toBe(expected)
  })
})
