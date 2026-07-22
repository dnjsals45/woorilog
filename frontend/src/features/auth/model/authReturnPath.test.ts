import { afterEach, describe, expect, it } from 'vitest'
import {
  clearAuthReturnPath,
  getAuthReturnPath,
  storeAuthReturnPath,
} from './authReturnPath'

describe('authReturnPath', () => {
  afterEach(() => {
    window.sessionStorage.clear()
  })

  it('keeps an internal path including its query and hash', () => {
    storeAuthReturnPath('/invitations/links/token?source=share#accept')

    expect(getAuthReturnPath()).toBe('/invitations/links/token?source=share#accept')

    clearAuthReturnPath()
    expect(getAuthReturnPath()).toBe('/dashboard')
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    'dashboard',
  ])('rejects an unsafe return path: %s', (path) => {
    storeAuthReturnPath(path)

    expect(getAuthReturnPath()).toBe('/dashboard')
  })
})
