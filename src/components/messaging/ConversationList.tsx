import { Link } from 'react-router-dom'
import type { ConversationView } from '../../services/conversations.service'

function initials(name: string | null | undefined) {
  return (name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'S').toUpperCase()
}

function formatTime(value: string) {
  const date = new Date(value)
  const sameDay = date.toDateString() === new Date().toDateString()
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' }).format(date)
}

export function ConversationList({ conversations, selectedId, userId }: { conversations: ConversationView[]; selectedId?: string; userId: string }) {
  return (
    <div className="conversation-list">
      {conversations.map((conversation) => {
        const other = conversation.otherParticipant
        const title = other?.display_name?.trim() || 'ShareHub member'
        const preview = conversation.latestMessage
          ? `${conversation.latestMessage.sender_id === userId ? 'You: ' : ''}${conversation.latestMessage.body}`
          : 'No messages yet — say hello.'
        const avatarUrl = other?.avatar_path?.startsWith('https://') ? other.avatar_path : null
        return (
          <Link aria-current={selectedId === conversation.id ? 'page' : undefined} className={`conversation-row conversation-row__link${selectedId === conversation.id ? ' is-selected' : ''}`} key={conversation.id} to={`/inbox/${conversation.id}`}>
            <span className="conversation-row__person" aria-hidden="true">{avatarUrl ? <img alt="" src={avatarUrl} /> : initials(title)}</span>
            <div className="conversation-row__content">
              <div className="conversation-row__top"><h2>{title}</h2><time dateTime={conversation.last_message_at ?? conversation.created_at}>{formatTime(conversation.last_message_at ?? conversation.created_at)}</time></div>
              <p className="conversation-row__product">{conversation.listing?.imageUrl ? <img alt="" src={conversation.listing.imageUrl} /> : null}{conversation.listing?.title ?? 'Listing no longer available'}</p>
              <p className="conversation-row__preview">{preview}</p>
            </div>
            {conversation.unreadCount > 0 ? <span aria-label={`${conversation.unreadCount} unread messages`} className="conversation-row__unread">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span> : null}
          </Link>
        )
      })}
    </div>
  )
}
