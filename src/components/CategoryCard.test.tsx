import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoryCard } from './CategoryCard'

const category = {
  id: 'category-electronics',
  name: 'Electronics & Gadgets',
  slug: 'electronics-gadgets',
  description: 'Cameras, audio, and everyday tech.',
  icon: 'laptop',
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('CategoryCard', () => {
  it('exposes its selection state and sends the selected category id', () => {
    const onSelect = vi.fn()
    render(<CategoryCard category={category} onSelect={onSelect} selected />)

    const button = screen.getByRole('button', { name: /electronics & gadgets/i })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledWith(category.id)
  })
})
