import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import type { ListingPhotoDraft } from '../../services/listing-management.service'

interface ListingImageUploaderProps {
  error?: string
  onChange: (photos: ListingPhotoDraft[]) => void
  photos: ListingPhotoDraft[]
}

const maxImages = 5
const maxBytes = 5 * 1024 * 1024
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function ListingImageUploader({ error, onChange, photos }: ListingImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectionError, setSelectionError] = useState('')

  function acceptFiles(fileList: FileList | File[]) {
    setSelectionError('')
    const selected = Array.from(fileList)
    const valid: File[] = []
    const rejected: string[] = []

    for (const file of selected) {
      if (!acceptedTypes.has(file.type)) rejected.push(`${file.name}: choose JPG, PNG, or WebP.`)
      else if (file.size > maxBytes) rejected.push(`${file.name}: the maximum file size is 5 MB.`)
      else valid.push(file)
    }
    const available = maxImages - photos.length
    const additions = valid.slice(0, Math.max(available, 0))
    if (valid.length > additions.length) rejected.push('A listing can have no more than 5 photos.')

    const next = additions.map((file): ListingPhotoDraft => ({
      file,
      key: crypto.randomUUID(),
      kind: 'new',
      previewUrl: URL.createObjectURL(file),
    }))
    if (next.length) onChange([...photos, ...next])
    if (rejected.length) setSelectionError(rejected.join(' '))
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    acceptFiles(event.dataTransfer.files)
  }

  function move(index: number, offset: number) {
    const destination = index + offset
    if (destination < 0 || destination >= photos.length) return
    const next = [...photos]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    onChange(next)
  }

  function remove(index: number) {
    const photo = photos[index]
    if (photo?.kind === 'new') URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter((_, photoIndex) => photoIndex !== index))
  }

  return (
    <div className="listing-upload">
      <div
        className={`listing-dropzone ${dragging ? 'listing-dropzone--active' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <span className="listing-dropzone__icon"><ImagePlus aria-hidden="true" size={23} /></span>
        <div>
          <p><strong>Choose photos</strong><span className="listing-dropzone__desktop"> or drag them here</span></p>
          <small>JPG, PNG or WebP · up to 5 MB each · {photos.length}/{maxImages} photos</small>
        </div>
        <button className="button button--secondary listing-dropzone__button" disabled={photos.length >= maxImages} onClick={() => inputRef.current?.click()} type="button">
          Add photos
        </button>
        <input
          ref={inputRef}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          multiple
          onChange={(event) => { if (event.currentTarget.files) acceptFiles(event.currentTarget.files) }}
          type="file"
        />
      </div>

      {selectionError || error ? <p className="listing-field-error" role="alert">{selectionError || error}</p> : null}
      {photos.length ? (
        <div className="listing-photo-grid" aria-label="Selected listing photos">
          {photos.map((photo, index) => {
            const src = photo.kind === 'new' ? photo.previewUrl : photo.image.publicUrl
            return (
              <article className="listing-photo" key={photo.key}>
                <img alt={photo.kind === 'new' ? photo.file.name : `Listing photo ${index + 1}`} src={src} />
                <span className="listing-photo__order">{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span>
                <div className="listing-photo__actions">
                  <button aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp aria-hidden="true" size={16} /></button>
                  <button aria-label={`Move photo ${index + 1} later`} disabled={index === photos.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown aria-hidden="true" size={16} /></button>
                  <button aria-label={`Remove photo ${index + 1}`} onClick={() => remove(index)} type="button"><Trash2 aria-hidden="true" size={16} /></button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
