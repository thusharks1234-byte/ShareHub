import { ImageOff, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ListingView } from '../services/listings.service'

interface ProductCardProps {
  listing: ListingView
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function ProductCard({ listing }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = listing.images[0]?.publicUrl

  return (
    <Link aria-label={'View listing: ' + listing.title} className="product-card group product-card__link" to={'/listings/' + listing.id}>
      <div className="product-card__media">
        {!imageUrl || imageFailed ? (
          <div className="product-card__fallback" role="img" aria-label={`No photo available for ${listing.title}`}>
            <ImageOff aria-hidden="true" size={28} />
            <span>No photo available</span>
          </div>
        ) : (
          <img
            alt={listing.title}
            className="product-card__image"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={imageUrl}
          />
        )}
        <span className="product-card__status">{listing.status === 'active' ? 'Available' : listing.status}</span>
        {listing.category?.name ? <span className="product-card__category">{listing.category.name}</span> : null}
      </div>
      <div className="product-card__content">
        <h3 className="product-card__title">{listing.title}</h3>
        <p className="product-card__location"><MapPin aria-hidden="true" size={14} />{listing.locality}, {listing.city}</p>
        <div className="product-card__pricing">
          <p><strong>₹{inr.format(listing.rent_per_day)}</strong><span>/ day</span></p>
          <span className="product-card__deposit"><small>Security deposit</small><strong>₹{inr.format(listing.security_deposit)}</strong></span>
        </div>
      </div>
    </Link>
  )
}
