import { ArrowLeft, BadgeCheck, Leaf, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { ListingImageUploader } from '../components/listings/ListingImageUploader'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { useToast } from '../components/ui/ToastContext'
import { getCategories, type CategoryRecord } from '../services/categories.service'
import {
  createListing,
  getListingForOwner,
  isListingLimitError,
  updateListing,
  type ListingFormValues,
  type ListingPhotoDraft,
  type UploadProgress,
} from '../services/listing-management.service'

const emptyForm: ListingFormValues = {
  category_id: '',
  city: '',
  description: '',
  locality: '',
  rent_per_day: 1,
  security_deposit: 0,
  title: '',
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label: string
  note?: string
}

function FormField({ error, label, note, ...props }: FieldProps) {
  const id = props.id ?? props.name
  return (
    <label className="listing-field" htmlFor={id}>
      <span className="listing-field__label">{label}{props.required ? <i> *</i> : null}</span>
      <input {...props} aria-invalid={Boolean(error)} className={`listing-input ${props.className ?? ''}`} id={id} />
      {note ? <small className="listing-field__note">{note}</small> : null}
      {error ? <small className="listing-field-error" role="alert">{error}</small> : null}
    </label>
  )
}

export function ListingEditorPage() {
  const { listingId } = useParams()
  const isEdit = Boolean(listingId)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const previewUrls = useRef(new Set<string>())
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [values, setValues] = useState<ListingFormValues>(emptyForm)
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [loadResult, setLoadResult] = useState<{ error: string; listingId: string | undefined } | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url)
    previewUrls.current.clear()
  }, [])

  useEffect(() => {
    let current = true
    Promise.all([
      getCategories(),
      listingId ? getListingForOwner(listingId) : Promise.resolve(null),
    ])
      .then(([categoryRows, listing]) => {
        if (!current) return
        setCategories(categoryRows)
        if (listingId && !listing) {
          setLoadResult({ error: 'This listing could not be found in your account.', listingId })
        } else if (listing) {
          setValues({
            category_id: listing.category_id,
            city: listing.city,
            description: listing.description,
            locality: listing.locality,
            rent_per_day: listing.rent_per_day,
            security_deposit: listing.security_deposit,
            title: listing.title,
          })
          setPhotos(listing.images.map((image) => ({
            image,
            key: image.id,
            kind: 'existing',
          })))
        }
        if (!listingId || listing) setLoadResult({ error: '', listingId })
      })
      .catch(() => {
        if (current) setLoadResult({ error: 'The listing form could not load its categories or saved item. Check your connection and retry.', listingId })
      })
    return () => { current = false }
  }, [listingId])

  const loading = !loadResult || loadResult.listingId !== listingId
  const loadError = !loading ? loadResult?.error ?? '' : ''

  function updateField<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  function handlePhotosChange(next: ListingPhotoDraft[]) {
    const existing = new Set(next.filter((photo) => photo.kind === 'new').map((photo) => photo.previewUrl))
    for (const url of previewUrls.current) {
      if (!existing.has(url)) {
        URL.revokeObjectURL(url)
        previewUrls.current.delete(url)
      }
    }
    for (const photo of next) {
      if (photo.kind === 'new') previewUrls.current.add(photo.previewUrl)
    }
    setPhotos(next)
    setFieldErrors((current) => ({ ...current, photos: '' }))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!values.title.trim()) next.title = 'Enter a title for your item.'
    else if (values.title.trim().length > 80) next.title = 'Use 80 characters or fewer.'
    if (!values.category_id) next.category_id = 'Choose a category.'
    if (!values.description.trim()) next.description = 'Describe the item for potential renters.'
    else if (values.description.trim().length > 1200) next.description = 'Use 1,200 characters or fewer.'
    if (!Number.isInteger(values.rent_per_day) || values.rent_per_day < 1 || values.rent_per_day > 5000) next.rent_per_day = 'Enter a daily rent from ₹1 to ₹5,000.'
    if (!Number.isInteger(values.security_deposit) || values.security_deposit < 0 || values.security_deposit > 50000) next.security_deposit = 'Enter a deposit from ₹0 to ₹50,000.'
    if (!values.city.trim()) next.city = 'Enter a city.'
    if (!values.locality.trim()) next.locality = 'Enter a locality.'
    if (photos.length < 1 || photos.length > 5) next.photos = 'Add between 1 and 5 photos.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setProgress(null)
    if (!validate()) return
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/listings/new' } } })
      return
    }

    setSaving(true)
    try {
      const cleanValues = {
        ...values,
        city: values.city.trim(),
        description: values.description.trim(),
        locality: values.locality.trim(),
        title: values.title.trim(),
      }
      if (listingId) {
        await updateListing(listingId, cleanValues, photos, setProgress)
        notify('Your listing changes have been saved.', 'success')
      } else {
        await createListing(
          cleanValues,
          photos.flatMap((photo) => photo.kind === 'new' ? [photo.file] : []),
          setProgress,
        )
        notify('Your item is now published.', 'success')
      }
      navigate('/my-listings', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The listing could not be saved.'
      setSubmitError(isListingLimitError(error) ? 'You have reached the maximum of 10 active listings. Pause one before publishing another.' : message)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (loading) return <div className="account-page"><AccountHeader /><main className="account-main page-container"><StateMessage kind="loading" message="Loading your listing workspace." title="Preparing the form" /></main></div>
  if (loadError) return <div className="account-page"><AccountHeader /><main className="account-main page-container"><StateMessage action={<Link className="button button--secondary" to="/my-listings">Back to My Listings</Link>} kind="error" message={loadError} title="Unable to open this listing" /></main></div>

  return (
    <div className="account-page listing-editor-page">
      <AccountHeader />
      <main className="listing-editor page-container">
        <Link className="listing-back" to="/my-listings"><ArrowLeft aria-hidden="true" size={16} /> My Listings</Link>
        <header className="listing-editor__intro">
          <span className="listing-editor__mark"><Leaf aria-hidden="true" size={19} /></span>
          <p className="eyebrow">{isEdit ? 'Update your listing' : 'Make more of what you own'}</p>
          <h1>{isEdit ? 'Edit your item' : 'Share something useful.'}</h1>
          <p>{isEdit ? 'Keep the details and photos up to date for your neighbourhood.' : 'List an item and help someone nearby find what they need.'}</p>
        </header>

        <form className="listing-form" onSubmit={handleSubmit} noValidate>
          <section className="listing-form__section">
            <div className="listing-form__section-heading"><span>01</span><div><h2>Item details</h2><p>Tell neighbours what you are sharing.</p></div></div>
            <div className="listing-form__fields">
              <FormField autoComplete="off" error={fieldErrors.title} label="Product title" maxLength={80} name="title" onChange={(event) => updateField('title', event.currentTarget.value)} placeholder="e.g. Cordless drill" required value={values.title} />
              <label className="listing-field" htmlFor="listing-category">
                <span className="listing-field__label">Category <i>*</i></span>
                <select aria-invalid={Boolean(fieldErrors.category_id)} className="listing-input" id="listing-category" onChange={(event) => updateField('category_id', event.currentTarget.value)} required value={values.category_id}>
                  <option value="">Select a category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {fieldErrors.category_id ? <small className="listing-field-error" role="alert">{fieldErrors.category_id}</small> : null}
              </label>
              <label className="listing-field listing-field--wide" htmlFor="listing-description">
                <span className="listing-field__label">Description <i>*</i></span>
                <textarea aria-invalid={Boolean(fieldErrors.description)} className="listing-input listing-textarea" id="listing-description" maxLength={1200} onChange={(event) => updateField('description', event.currentTarget.value)} placeholder="Share the condition, included accessories, and anything else a neighbour should know." required rows={5} value={values.description} />
                <span className="listing-field__note-row"><small>Be clear about condition and what is included.</small><small>{values.description.length}/1,200</small></span>
                {fieldErrors.description ? <small className="listing-field-error" role="alert">{fieldErrors.description}</small> : null}
              </label>
            </div>
          </section>

          <section className="listing-form__section">
            <div className="listing-form__section-heading"><span>02</span><div><h2>Photos</h2><p>Add clear photos. The first photo is the cover.</p></div></div>
            <ListingImageUploader error={fieldErrors.photos} onChange={handlePhotosChange} photos={photos} />
          </section>

          <section className="listing-form__section">
            <div className="listing-form__section-heading"><span>03</span><div><h2>Pricing & location</h2><p>Set the daily rental amount and security deposit.</p></div></div>
            <div className="listing-form__fields listing-form__fields--three">
              <FormField error={fieldErrors.rent_per_day} inputMode="numeric" label="Rent per day" max="5000" min="1" name="rent_per_day" onChange={(event) => updateField('rent_per_day', event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value))} required step="1" type="number" note="₹1–₹5,000 per day" value={values.rent_per_day} />
              <FormField error={fieldErrors.security_deposit} inputMode="numeric" label="Security deposit" max="50000" min="0" name="security_deposit" onChange={(event) => updateField('security_deposit', event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value))} required step="1" type="number" note="₹0–₹50,000" value={values.security_deposit} />
              <FormField autoComplete="address-level2" error={fieldErrors.city} label="City" maxLength={100} name="city" onChange={(event) => updateField('city', event.currentTarget.value)} placeholder="Your city" required value={values.city} />
              <FormField autoComplete="address-level3" error={fieldErrors.locality} label="Locality" maxLength={100} name="locality" onChange={(event) => updateField('locality', event.currentTarget.value)} placeholder="Neighbourhood or area" required value={values.locality} />
            </div>
          </section>

          {submitError ? <div className="auth-alert auth-alert--error" role="alert">{submitError}</div> : null}
          {progress ? (
            <div className="listing-upload-progress" role="status">
              <div><strong>Uploading photos</strong><span>{progress.completed} of {progress.total} complete · {progress.currentFile}</span></div>
              <progress max={progress.total} value={progress.completed} />
            </div>
          ) : null}
          <div className="listing-submit-row">
            <p><ShieldCheck aria-hidden="true" size={16} /> No booking or payment is processed on ShareHub.</p>
            <div><Link className="button button--secondary" to="/my-listings">Cancel</Link><Button disabled={saving} type="submit">{saving ? 'Saving item…' : isEdit ? 'Save changes' : 'Publish listing'}</Button></div>
          </div>
          <div className="listing-form__secure-note"><BadgeCheck aria-hidden="true" size={15} /> Your listing is published only after all required photos have uploaded successfully.</div>
        </form>
      </main>
    </div>
  )
}
