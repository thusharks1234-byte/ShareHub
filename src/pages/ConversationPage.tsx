import { ArrowLeft, Send, ChevronUp, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { ConversationList } from '../components/messaging/ConversationList'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { getMyConversation, getMyConversations, type ConversationView } from '../services/conversations.service'
import { getConversationMessages, markConversationMessagesRead, MESSAGE_PAGE_SIZE, sendMessage, subscribeToConversationMessages, type MessageRecord } from '../services/messages.service'
import { getSupabaseClient } from '../lib/supabase/client'

function upsertMessage(messages: MessageRecord[], incoming: MessageRecord) {
  return [...messages.filter((message) => message.id !== incoming.id), incoming]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

function initials(name: string | null | undefined) {
  return (name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'S').toUpperCase()
}

export function ConversationPage() {
  const { conversationId = '' } = useParams()
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ConversationView | null>(null)
  const [conversationFor, setConversationFor] = useState('')
  const [sidebarConversations, setSidebarConversations] = useState<ConversationView[]>([])
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [messagesFor, setMessagesFor] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [olderError, setOlderError] = useState('')
  const [sendingError, setSendingError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [total, setTotal] = useState(0)
  const [connection, setConnection] = useState('SUBSCRIBING')
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(true)
  const activeConversation = conversationFor === conversationId ? conversation : null
  const routeLoading = loading || conversationFor !== conversationId
  const participant = activeConversation?.otherParticipant
  const participantName = participant?.display_name?.trim() || 'ShareHub member'
  const canLoadOlder = messages.length < total

  const loadConversation = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [thread, threads] = await Promise.all([getMyConversation(conversationId), getMyConversations()])
      setConversationFor(conversationId)
      if (!thread) { setConversation(null); setLoadError('This conversation is unavailable or you are not a participant.'); return }
      setConversation(thread)
      setSidebarConversations(threads)
    } catch {
      setConversation(null)
      setConversationFor(conversationId)
      setLoadError('This conversation could not be loaded. Check your connection and try again.')
    } finally { setLoading(false) }
  }, [conversationId])

  useEffect(() => {
    let active = true
    Promise.all([getMyConversation(conversationId), getMyConversations()])
      .then(([thread, threads]) => {
        if (!active) return
        setConversationFor(conversationId)
        setConversation(thread)
        setSidebarConversations(threads)
        if (!thread) setLoadError('This conversation is unavailable or you are not a participant.')
        else setLoadError('')
      })
      .catch(() => { if (active) { setConversation(null); setLoadError('This conversation could not be loaded. Check your connection and try again.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [conversationId])

  useEffect(() => {
    if (!activeConversation || !conversationId) return
    let active = true
    firstLoad.current = true
    const channel = subscribeToConversationMessages(conversationId, (message) => {
      setMessages((current) => upsertMessage(current, message))
      if (message.read_at === null) {
        void getConversationMessages(conversationId, 0, 1).then(({ total: count }) => setTotal(count)).catch(() => undefined)
      }
      if (message.sender_id !== user?.id && message.read_at === null) {
        void markConversationMessagesRead(conversationId).catch(() => undefined)
      }
    }, setConnection)
    Promise.resolve().then(() => {
      if (active) { setMessages([]); setTotal(0) }
      return getConversationMessages(conversationId, 0, MESSAGE_PAGE_SIZE)
    })
      .then(async ({ items, total: count }) => {
        if (!active) return
        setMessages((current) => items.reduce(upsertMessage, current))
        setMessagesFor(conversationId)
        setTotal(count)
        setMessagesLoading(false)
        await markConversationMessagesRead(conversationId).catch(() => undefined)
        if (active) {
          firstLoad.current = false
          requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }))
        }
      })
      .catch(() => {
        if (!active) return
        setLoadError('Messages could not be loaded. Refresh the conversation to retry.')
        setMessagesLoading(false)
      })
    return () => { active = false; void getSupabaseClient().removeChannel(channel) }
  }, [activeConversation, conversationId, user?.id])

  useEffect(() => {
    if (!firstLoad.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function loadOlder() {
    if (messagesLoading || !canLoadOlder) return
    const box = scrollRef.current
    const oldHeight = box?.scrollHeight ?? 0
    const oldTop = box?.scrollTop ?? 0
    setMessagesLoading(true)
    setOlderError('')
    try {
      const { items, total: count } = await getConversationMessages(conversationId, messages.length, MESSAGE_PAGE_SIZE)
      setMessages((current) => [...items, ...current.filter((message) => !items.some((older) => older.id === message.id))].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)))
      setTotal(count)
      requestAnimationFrame(() => { if (box) box.scrollTop = box.scrollHeight - oldHeight + oldTop })
    } catch { setOlderError('Older messages could not be loaded. Try again.') }
    finally { setMessagesLoading(false) }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = body.trim()
    setSendingError('')
    if (!trimmed || trimmed.length > 2000) { setSendingError('Write a message between 1 and 2,000 characters.'); return }
    setSending(true)
    try {
      const message = await sendMessage(conversationId, trimmed)
      setMessages((current) => upsertMessage(current, message))
      void getConversationMessages(conversationId, 0, 1).then(({ total: count }) => setTotal(count)).catch(() => undefined)
      setBody('')
    } catch (cause) { setSendingError(cause instanceof Error ? cause.message : 'Your message could not be sent. Check your connection and retry.') }
    finally { setSending(false) }
  }

  const renderedMessages = useMemo(() => messagesFor === conversationId ? messages : [], [conversationId, messages, messagesFor])

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="messaging-page page-container messaging-page--chat">
        <div className="mobile-chat-back"><Link className="listing-back" to="/inbox"><ArrowLeft aria-hidden="true" size={16} /> Back to inbox</Link></div>
        {routeLoading ? <StateMessage kind="loading" message="Loading your private conversation." title="Opening conversation" /> : null}
        {!routeLoading && loadError ? <StateMessage action={<Button onClick={() => void loadConversation()} variant="secondary">Retry</Button>} kind="error" message={loadError} title="Unable to open conversation" /> : null}
        {!routeLoading && !loadError && !activeConversation ? <StateMessage action={<Link className="button" to="/inbox">Back to inbox</Link>} kind="empty" message="Only the owner and renter in a conversation can open it." title="Conversation unavailable" /> : null}
        {activeConversation ? <section aria-label="Messaging" className="messaging-layout messaging-layout--active">
          <aside aria-label="Your conversations" className="messaging-sidebar messaging-sidebar--chat"><ConversationList conversations={sidebarConversations} selectedId={conversationId} userId={user?.id ?? ''} /></aside>
          <section aria-label={`Conversation with ${participantName}`} className="conversation-panel">
            <header className="conversation-panel__header">
              <span className="conversation-panel__avatar" aria-hidden="true">{initials(participantName)}</span>
              <div><span>Chatting with</span><h1>{participantName}</h1><p>{[participant?.locality, participant?.city].filter(Boolean).join(', ') || 'ShareHub member'}</p></div>
              {activeConversation.listing ? <Link aria-label={`View ${activeConversation.listing.title}`} className="conversation-product" to={`/listings/${activeConversation.listing.id}`}>
                {activeConversation.listing.imageUrl ? <img alt="" src={activeConversation.listing.imageUrl} /> : <span aria-hidden="true">Item</span>}<strong>{activeConversation.listing.title}</strong>
              </Link> : <span className="conversation-product"><strong>Listing unavailable</strong></span>}
            </header>
            <div className="conversation-connection" role="status">{connection === 'SUBSCRIBED' ? <><Wifi size={14} /> Live updates connected</> : <><WifiOff size={14} /> Live updates reconnecting</>}</div>
            <div className="conversation-messages" ref={scrollRef} aria-live="polite" role="log">
              {canLoadOlder ? <div className="conversation-older"><Button disabled={messagesLoading} onClick={() => void loadOlder()} variant="secondary"><ChevronUp size={15} />{messagesLoading ? 'Loading…' : 'Load older messages'}</Button></div> : null}
              {olderError ? <div className="conversation-inline-error" role="alert">{olderError} <button onClick={() => void loadOlder()} type="button">Retry</button></div> : null}
              {(messagesFor !== conversationId || messagesLoading) && renderedMessages.length === 0 ? <div aria-label="Loading messages" className="message-skeletons" role="status"><i /><i /><i /></div> : null}
              {messagesFor === conversationId && !messagesLoading && renderedMessages.length === 0 ? <p className="conversation-messages__empty">Say hello and ask about the item. Messages remain available in your inbox.</p> : null}
              {renderedMessages.map((message) => {
                const own = message.sender_id === user?.id
                return <article className={own ? 'conversation-message conversation-message--own' : 'conversation-message'} key={message.id}><p>{message.body}</p><time dateTime={message.created_at}>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(message.created_at))}</time></article>
              })}
              <div ref={bottomRef} />
            </div>
            {sendingError ? <p className="auth-alert auth-alert--error conversation-error" role="alert">{sendingError}</p> : null}
            <form className="conversation-compose" onSubmit={handleSend}>
              <label className="sr-only" htmlFor="conversation-message">Your message</label>
              <textarea id="conversation-message" autoComplete="off" maxLength={2000} onChange={(event) => setBody(event.currentTarget.value)} placeholder="Write a message…" rows={2} value={body} />
              <span className="conversation-compose__count" aria-live="polite">{body.length}/2,000</span>
              <Button aria-label="Send message" disabled={sending || !body.trim()} type="submit"><Send aria-hidden="true" size={16} /><span>{sending ? 'Sending…' : 'Send'}</span></Button>
            </form>
            <p className="conversation-panel__note">Coordinate directly about the item. ShareHub does not process bookings or payments.</p>
          </section>
        </section> : null}
      </main>
    </div>
  )
}
