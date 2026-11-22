import { useState } from 'react'

interface ProfileAvatarProps {
  avatarPath?: string | null
  className?: string
  name?: string | null
  size?: 'small' | 'medium' | 'large'
}

export function ProfileAvatar({ avatarPath, className = '', name, size = 'medium' }: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const photoUrl = avatarPath?.startsWith('https://') ? avatarPath : null
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S'
  const accessibleName = name?.trim() ? `${name}'s profile photo` : 'Profile initials'

  return (
    <span aria-label={accessibleName} className={`profile-avatar profile-avatar--${size} ${className}`} role="img">
      {photoUrl && !imageFailed ? <img alt="" onError={() => setImageFailed(true)} src={photoUrl} /> : initials}
    </span>
  )
}
