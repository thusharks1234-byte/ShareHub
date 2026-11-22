import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail, passwordStrengthError } from './validation'

describe('authentication field validation', () => {
  it('normalizes email addresses before validation', () => {
    expect(normalizeEmail('  PERSON@Example.COM ')).toBe('person@example.com')
    expect(isValidEmail(' person@example.com ')).toBe(true)
    expect(isValidEmail('person@localhost')).toBe(false)
  })

  it('reports the first unmet password strength requirement', () => {
    expect(passwordStrengthError('short')).toBe('Use at least 8 characters.')
    expect(passwordStrengthError('lowercase1')).toBe('Add an uppercase letter.')
    expect(passwordStrengthError('ABCDEFGH1')).toBe('Add a lowercase letter.')
    expect(passwordStrengthError('GoodPass')).toBe('Add a number.')
    expect(passwordStrengthError('GoodPass1')).toBeNull()
  })
})
