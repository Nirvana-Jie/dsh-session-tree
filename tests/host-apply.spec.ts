import { describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'

describe('host plugin apply', () => {
  it('stays passive because the package contributes only a DSH Web client', () => {
    expect(apply()).toBeUndefined()
  })
})
