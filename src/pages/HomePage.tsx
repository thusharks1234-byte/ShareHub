import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Handshake,
  Leaf,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { CategoryCard } from '../components/CategoryCard'
import { ProductCard } from '../components/ProductCard'
import { SearchBar } from '../components/SearchBar'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { getCategories, type CategoryRecord } from '../services/categories.service'
import {
  getActiveListings,
  type ListingSort,
  type ListingView,
} from '../services/listings.service'

const pageSize = 8

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Find something nearby',
    description: 'Explore local items by category, location, and daily price.',
  },
  {
    number: '02',
    icon: MessageCircle,
    title: 'Talk to the owner',
    description: 'See the rent and deposit, then message the owner with questions.',
  },
  {
    number: '03',
    icon: Handshake,
    title: 'Share with care',
    description: 'Coordinate directly and help useful things stay in use.',
  },
]

export function HomePage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [categoryResponse, setCategoryResponse] = useState<{
    requestKey: number
    failed: boolean
  }>({ requestKey: -1, failed: false })
  const [listings, setListings] = useState<ListingView[]>([])
  const [totalListings, setTotalListings] = useState(0)
  const [listingResponse, setListingResponse] = useState<{
    requestKey: string
    failed: boolean
  }>({ requestKey: '', failed: false })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [sort, setSort] = useState<ListingSort>('newest')
  const [minRent, setMinRent] = useState<number | null>(null)
  const [maxRent, setMaxRent] = useState<number | null>(null)
  const [minRentInput, setMinRentInput] = useState('')
  const [maxRentInput, setMaxRentInput] = useState('')
  const [filterError, setFilterError] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()
  const categoryLoading = categoryResponse.requestKey !== categoryRefreshKey
  const categoryError = !categoryLoading && categoryResponse.failed
  const listingRequestKey = JSON.stringify([
    selectedCategory,
    location,
    page,
    query,
    refreshKey,
    sort,
    categories.map((category) => category.id),
    minRent,
    maxRent,
  ])
  const loading = listingResponse.requestKey !== listingRequestKey
  const error = !loading && listingResponse.failed

  useEffect(() => {
    let current = true
    getCategories()
      .then((items) => {
        if (current) {
          setCategories(items)
          setCategoryResponse({ requestKey: categoryRefreshKey, failed: false })
        }
      })
      .catch(() => {
        if (current) setCategoryResponse({ requestKey: categoryRefreshKey, failed: true })
      })
    return () => {
      current = false
    }
  }, [categoryRefreshKey])

  useEffect(() => {
    let current = true
    getActiveListings(
      { categoryId: selectedCategory, location, page, pageSize, query, sort, minRent, maxRent },
      categories,
    )
      .then((result) => {
        if (!current) return
        setListings(result.items)
        setTotalListings(result.total)
        setListingResponse({ requestKey: listingRequestKey, failed: false })
      })
      .catch(() => {
        if (current) {
          setListings([])
          setTotalListings(0)
          setListingResponse({ requestKey: listingRequestKey, failed: true })
        }
      })
    return () => {
      current = false
    }
  }, [categories, location, maxRent, minRent, page, query, refreshKey, selectedCategory, sort, listingRequestKey])

  function runSearch(searchTerm: string, searchLocation: string) {
    setQuery(searchTerm)
    setLocation(searchLocation)
    setPage(1)
    setSelectedCategory(null)
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' })
  }

  function selectCategory(categoryId: string) {
    setSelectedCategory((current) => (current === categoryId ? null : categoryId))
    setQuery('')
    setPage(1)
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' })
  }

  function clearFilters() {
    setSelectedCategory(null)
    setQuery('')
    setLocation('')
    setMinRent(null)
    setMaxRent(null)
    setMinRentInput('')
    setMaxRentInput('')
    setFilterError('')
    setPage(1)
  }

  function applyRentFilters() {
    const min = minRentInput.trim() ? Number(minRentInput) : null
    const max = maxRentInput.trim() ? Number(maxRentInput) : null
    if ((min !== null && (!Number.isInteger(min) || min < 1 || min > 5000)) || (max !== null && (!Number.isInteger(max) || max < 1 || max > 5000))) {
      setFilterError('Enter a daily rent between ₹1 and ₹5,000.')
      return false
    }
    if (min !== null && max !== null && min > max) {
      setFilterError('The minimum rent must be lower than the maximum.')
      return false
    }
    setFilterError('')
    setMinRent(min)
    setMaxRent(max)
    setPage(1)
    setMobileFiltersOpen(false)
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' })
    return true
  }

  const selectedCategoryName = categories.find((category) => category.id === selectedCategory)?.name
  const pageCount = Math.max(1, Math.ceil(totalListings / pageSize))
  const activeFilterCount = Number(selectedCategory !== null) + Number(Boolean(location)) + Number(Boolean(query)) + Number(minRent !== null || maxRent !== null)

  return (
    <div className="min-h-screen bg-brand-surface text-brand-ink" id="top">
      <SiteHeader onSearch={runSearch} />

      <main>
        <section aria-labelledby="hero-title" className="hero-section">
          <div className="hero-orb hero-orb--green" />
          <div className="hero-orb hero-orb--blue" />
          <div className="hero-content page-container">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <Sparkles aria-hidden="true" size={15} />
                Share Today • Use Tomorrow • Save Together
              </div>
              <h1 className="font-display text-[2.65rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-brand-navy sm:text-6xl lg:text-[4.35rem]">
                Borrow less.<br />
                <span className="text-brand-green">Share more.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Find the things you need from people nearby. Make more of what we already have.
              </p>
              <div className="mt-7 max-w-2xl" id="home-search">
                <SearchBar compact onSearch={runSearch} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><Check aria-hidden="true" className="text-brand-green" size={16} /> Local listings</span>
                <span className="inline-flex items-center gap-1.5"><Check aria-hidden="true" className="text-brand-green" size={16} /> Clear daily pricing</span>
                <span className="inline-flex items-center gap-1.5"><Check aria-hidden="true" className="text-brand-green" size={16} /> Message owners</span>
              </div>
            </div>

            <div aria-label="Share useful things with your neighbourhood" className="hero-gallery">
              <div className="hero-gallery__backdrop" />
              <div className="hero-illustration__tile hero-illustration__tile--large">
                <Box aria-hidden="true" size={52} strokeWidth={1.25} />
                <span>Useful things, shared locally</span>
              </div>
              <div className="hero-illustration__tile hero-illustration__tile--small hero-illustration__tile--one">
                <Leaf aria-hidden="true" size={29} />
              </div>
              <div className="hero-illustration__tile hero-illustration__tile--small hero-illustration__tile--two">
                <Handshake aria-hidden="true" size={30} />
              </div>
              <div className="hero-note">
                <span className="hero-note__icon"><Leaf aria-hidden="true" size={17} /></span>
                <span><strong>Good things are closer.</strong><small>Share with your neighbourhood</small></span>
              </div>
            </div>
          </div>
          <a aria-label="Scroll to categories" className="hero-scroll" href="#categories">
            <ArrowDownRight aria-hidden="true" size={16} />
          </a>
        </section>

        <section aria-label="ShareHub benefits" className="benefit-strip page-container">
          <div><span className="benefit-strip__icon benefit-strip__icon--blue"><MapPin aria-hidden="true" size={19} /></span><span><strong>Close to home</strong><small>Search by your area</small></span></div>
          <div><span className="benefit-strip__icon benefit-strip__icon--green"><CircleDollarSign aria-hidden="true" size={19} /></span><span><strong>Know the price</strong><small>Rent and deposit up front</small></span></div>
          <div><span className="benefit-strip__icon benefit-strip__icon--navy"><MessageCircle aria-hidden="true" size={19} /></span><span><strong>Talk directly</strong><small>Message the owner</small></span></div>
        </section>

        <section aria-labelledby="categories-title" className="section-block page-container" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Find what you need</p>
              <h2 className="section-title" id="categories-title">Browse by category</h2>
              <p className="section-subtitle">Explore real ShareHub categories and listings from your community.</p>
            </div>
            {selectedCategory ? (
              <button className="text-link hidden sm:inline-flex" onClick={clearFilters} type="button">Clear selection</button>
            ) : null}
          </div>
          {categoryLoading ? (
            <StateMessage kind="loading" message="Loading ShareHub categories." title="Getting categories" />
          ) : categoryError ? (
            <StateMessage
              action={<Button onClick={() => setCategoryRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>}
              kind="error"
              message="Categories could not be loaded. Check the connection and try again."
              title="Unable to load categories"
            />
          ) : categories.length === 0 ? (
            <StateMessage kind="empty" message="Categories will appear here when available." title="No categories available" />
          ) : (
            <div className="category-grid">
              {categories.map((category) => (
                <CategoryCard category={category} key={category.id} onSelect={selectCategory} selected={selectedCategory === category.id} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="listings-title" className="section-block section-block--tinted" id="listings">
          <div className="page-container">
            <div className="section-heading section-heading--align-end">
              <div>
                <p className="eyebrow">{location ? `Around ${location}` : 'The local marketplace'}</p>
                <h2 className="section-title" id="listings-title">
                  {selectedCategoryName ?? (query ? `Results for “${query}”` : 'Recently listed nearby')}
                </h2>
                <p className="section-subtitle">Prices, deposits, and locations come directly from current listings.</p>
              </div>
              <label className="sort-control desktop-sort-control">
                <span>Sort by</span>
                <select
                  aria-label="Sort listings"
                  onChange={(event) => { setSort(event.target.value as ListingSort); setPage(1) }}
                  value={sort}
                >
                  <option value="newest">Newest</option>
                  <option value="rent-asc">Price: low to high</option>
                  <option value="rent-desc">Price: high to low</option>
                </select>
              </label>
            </div>

            <div className="mobile-explore-toolbar">
              <button aria-haspopup="dialog" className="mobile-filter-trigger" onClick={() => { setMinRentInput(minRent?.toString() ?? ''); setMaxRentInput(maxRent?.toString() ?? ''); setMobileFiltersOpen(true) }} type="button"><SlidersHorizontal aria-hidden="true" size={17} /> Filter & sort{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
              <label className="sort-control mobile-sort-control"><span className="sr-only">Sort listings</span><select aria-label="Sort listings" onChange={(event) => { setSort(event.target.value as ListingSort); setPage(1) }} value={sort}><option value="newest">Newest</option><option value="rent-asc">Price: low to high</option><option value="rent-desc">Price: high to low</option></select></label>
            </div>

            <div className="explore-layout">
            <aside aria-label="Product filters" className="explore-filter-panel">
              <div className="explore-filter-panel__heading"><div><SlidersHorizontal aria-hidden="true" size={17} /><h3>Filters</h3></div>{activeFilterCount ? <button className="text-link" onClick={clearFilters} type="button">Clear</button> : null}</div>
              <fieldset className="explore-filter-group"><legend>Category</legend><button aria-pressed={selectedCategory === null} className={!selectedCategory ? 'explore-category is-selected' : 'explore-category'} onClick={() => { setSelectedCategory(null); setPage(1) }} type="button">All categories</button>{categories.map((category) => <button aria-pressed={selectedCategory === category.id} className={selectedCategory === category.id ? 'explore-category is-selected' : 'explore-category'} key={category.id} onClick={() => { setSelectedCategory(category.id); setQuery(''); setPage(1) }} type="button">{category.name}</button>)}</fieldset>
              <fieldset className="explore-filter-group explore-price-filter"><legend>Daily rent</legend><div><label htmlFor="min-rent"><span>Min</span><span className="explore-currency">₹</span><input id="min-rent" inputMode="numeric" max="5000" min="1" onChange={(event) => setMinRentInput(event.currentTarget.value)} placeholder="Any" value={minRentInput} /></label><label htmlFor="max-rent"><span>Max</span><span className="explore-currency">₹</span><input id="max-rent" inputMode="numeric" max="5000" min="1" onChange={(event) => setMaxRentInput(event.currentTarget.value)} placeholder="Any" value={maxRentInput} /></label></div>{filterError ? <p className="explore-filter-error" role="alert">{filterError}</p> : null}<Button className="explore-apply-button" onClick={applyRentFilters}>Apply rent</Button></fieldset>
            </aside>
            <div className="explore-results">
            {loading ? (
              <StateMessage kind="loading" message="Checking active listings in the ShareHub database." title="Loading products" />
            ) : error ? (
              <StateMessage
                action={<Button onClick={() => setRefreshKey((value) => value + 1)} variant="secondary">Retry</Button>}
                kind="error"
                message="Products could not be loaded from ShareHub. Try again in a moment."
                title="Unable to load products"
              />
            ) : listings.length === 0 ? (
              <StateMessage
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {activeFilterCount ? (
                      <Button onClick={clearFilters} variant="secondary">Clear filters</Button>
                    ) : null}
                    <Button onClick={() => user ? navigate('/listings/new') : navigate('/login', { state: { from: { pathname: '/listings/new' } } })}>
                      List Your Item <ArrowRight aria-hidden="true" size={15} />
                    </Button>
                  </div>
                }
                kind="empty"
                message={activeFilterCount ? 'Try adjusting your search or clearing the filters.' : 'Be the first to share something useful with your neighbours.'}
                title={activeFilterCount ? 'No products match those filters' : 'No products available yet.'}
              />
            ) : (
              <>
                <div className="product-grid">
                  {listings.map((listing) => (
                    <ProductCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <div className="pagination-row">
                  <span>Showing {listings.length} of {totalListings}</span>
                  <div className="flex items-center gap-2">
                    <button aria-label="Previous page" className="pagination-button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
                      <ChevronLeft aria-hidden="true" size={17} />
                    </button>
                    <span className="pagination-count">Page {page} of {pageCount}</span>
                    <button aria-label="Next page" className="pagination-button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">
                      <ChevronRight aria-hidden="true" size={17} />
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
            </div>
            {mobileFiltersOpen ? <div className="filter-sheet-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setMobileFiltersOpen(false) }} role="presentation"><section aria-labelledby="mobile-filter-title" aria-modal="true" className="filter-sheet" role="dialog"><header><div><p className="eyebrow">Refine your search</p><h2 id="mobile-filter-title">Filters & sorting</h2></div><button aria-label="Close filters" className="filter-sheet__close" onClick={() => setMobileFiltersOpen(false)} type="button"><X size={19} /></button></header><label className="filter-sheet__sort">Sort by<select aria-label="Sort listings" onChange={(event) => { setSort(event.target.value as ListingSort); setPage(1) }} value={sort}><option value="newest">Newest first</option><option value="rent-asc">Rent: low to high</option><option value="rent-desc">Rent: high to low</option></select></label><fieldset className="explore-filter-group"><legend>Category</legend><div className="filter-sheet__categories"><button aria-pressed={selectedCategory === null} className={!selectedCategory ? 'explore-category is-selected' : 'explore-category'} onClick={() => setSelectedCategory(null)} type="button">All categories</button>{categories.map((category) => <button aria-pressed={selectedCategory === category.id} className={selectedCategory === category.id ? 'explore-category is-selected' : 'explore-category'} key={category.id} onClick={() => setSelectedCategory(category.id)} type="button">{category.name}</button>)}</div></fieldset><fieldset className="explore-filter-group explore-price-filter"><legend>Daily rent</legend><div><label htmlFor="mobile-min-rent"><span>Min</span><span className="explore-currency">₹</span><input id="mobile-min-rent" inputMode="numeric" max="5000" min="1" onChange={(event) => setMinRentInput(event.currentTarget.value)} placeholder="Any" value={minRentInput} /></label><label htmlFor="mobile-max-rent"><span>Max</span><span className="explore-currency">₹</span><input id="mobile-max-rent" inputMode="numeric" max="5000" min="1" onChange={(event) => setMaxRentInput(event.currentTarget.value)} placeholder="Any" value={maxRentInput} /></label></div>{filterError ? <p className="explore-filter-error" role="alert">{filterError}</p> : null}</fieldset><footer><Button onClick={() => { clearFilters(); setMobileFiltersOpen(false) }} variant="secondary">Clear all</Button><Button onClick={applyRentFilters}>Show {totalListings} items</Button></footer></section></div> : null}
          </div>
        </section>

        <section aria-labelledby="how-title" className="how-section" id="how-it-works">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Simple by design</p>
              <h2 className="section-title" id="how-title">Sharing starts with a message</h2>
              <p className="section-subtitle mx-auto">Find a nearby listing, check the details, and connect with its owner.</p>
            </div>
            <div className="how-grid">
              {steps.map(({ description, icon: Icon, number, title: stepTitle }) => (
                <article className="how-card" key={number}>
                  <div className="how-card__top"><span>{number}</span><Icon aria-hidden="true" size={22} /></div>
                  <h3>{stepTitle}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <p className="phase-note"><BadgeCheck aria-hidden="true" size={16} /> Rentals are arranged directly between owners and renters. No booking or payment is processed on ShareHub.</p>
          </div>
        </section>

        <section aria-labelledby="owner-title" className="owner-section page-container" id="owner">
          <div className="owner-card">
            <div className="owner-card__pattern" />
            <div className="owner-card__copy">
              <span className="owner-card__eyebrow"><Sparkles aria-hidden="true" size={14} /> Have something useful?</span>
              <h2 id="owner-title">Your unused things could help someone nearby.</h2>
              <p>Give your idle items another purpose. Manage your listings and talk with interested neighbours from your ShareHub account.</p>
              <Button onClick={() => user ? navigate('/listings/new') : navigate('/login', { state: { from: { pathname: '/listings/new' } } })}>
                List Your Item <ArrowRight aria-hidden="true" size={16} />
              </Button>
            </div>
            <div aria-hidden="true" className="owner-card__art">
              <div className="owner-card__art-circle"><Leaf size={56} strokeWidth={1.2} /></div>
              <span>Share what you have</span>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
