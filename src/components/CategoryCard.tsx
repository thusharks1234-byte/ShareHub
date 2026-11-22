import {
  BookOpen,
  Boxes,
  Dumbbell,
  House,
  Laptop,
  PartyPopper,
  Tent,
  Wrench,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryRecord } from '../services/categories.service'

interface CategoryCardProps {
  category: CategoryRecord
  onSelect: (categoryId: string) => void
  selected?: boolean
}

const categoryIcons: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  boxes: Boxes,
  dumbbell: Dumbbell,
  house: House,
  laptop: Laptop,
  'party-popper': PartyPopper,
  'tent-tree': Tent,
  wrench: Wrench,
}

export function CategoryCard({ category, onSelect, selected = false }: CategoryCardProps) {
  const Icon = categoryIcons[category.icon ?? ''] ?? Boxes

  return (
    <button
      aria-pressed={selected}
      className={`category-card group${selected ? ' category-card--selected' : ''}`}
      onClick={() => onSelect(category.id)}
      type="button"
    >
      <span className="category-card__icon">
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold text-brand-navy">{category.name}</span>
        <span className="mt-1 block text-xs text-slate-500">{category.description}</span>
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className="shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-blue"
        size={17}
      />
    </button>
  )
}
