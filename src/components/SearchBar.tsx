import { MapPin, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from './ui/Button'

interface SearchBarProps {
  compact?: boolean
  onSearch: (query: string, location: string) => void
}

export function SearchBar({ compact = false, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(query.trim(), location.trim())
  }

  return (
    <form
      className={`search-bar ${compact ? 'search-bar--compact' : ''}`}
      onSubmit={handleSubmit}
      role="search"
    >
      <label className="search-bar__field search-bar__query" htmlFor={compact ? 'mobile-search-query' : 'desktop-search-query'}>
        <Search aria-hidden="true" className="shrink-0 text-brand-blue" size={18} />
        <input
          aria-label="Search products"
          autoComplete="off"
          id={compact ? 'mobile-search-query' : 'desktop-search-query'}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="What do you need to borrow?"
          value={query}
        />
      </label>
      <span aria-hidden="true" className="search-bar__divider" />
      <label className="search-bar__field search-bar__location" htmlFor={compact ? 'mobile-search-location' : 'desktop-search-location'}>
        <MapPin aria-hidden="true" className="shrink-0 text-brand-green" size={17} />
        <input
          aria-label="City or locality"
          autoComplete="address-level2"
          id={compact ? 'mobile-search-location' : 'desktop-search-location'}
          onChange={(event) => setLocation(event.currentTarget.value)}
          placeholder="City or locality"
          value={location}
        />
      </label>
      <Button className="search-bar__submit" type="submit">
        <Search aria-hidden="true" size={17} />
        <span className={compact ? 'sm:inline' : ''}>{compact ? 'Search' : 'Find items'}</span>
      </Button>
    </form>
  )
}
