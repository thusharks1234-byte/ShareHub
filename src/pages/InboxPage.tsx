import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { ConversationList } from '../components/messaging/ConversationList'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { getMyConversations, type ConversationView } from '../services/conversations.service'
import { subscribeToInboxMessages } from '../services/messages.service'
import { getSupabaseClient } from '../lib/supabase/client'

export function InboxPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationView[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError(false)
    try {
      const rows = await getMyConversations()
      setConversations(rows)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getMyConversations()
      .then((rows) => { if (active) { setConversations(rows); setError(false) } })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  useEffect(() => {
    if (!user) return
    const channel = subscribeToInboxMessages(() => {
      // The conversation may be new to this user's inbox; refresh the RLS-scoped list.
      setRevision((value) => value + 1)
    })
    return () => { void getSupabaseClient().removeChannel(channel) }
  }, [user])

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="messaging-page page-container">
        <div className="messaging-heading">
          <div><p className="eyebrow">Private conversations</p><h1 className="section-title">Your inbox</h1><p className="section-subtitle">Talk directly with owners and neighbours about listed items.</p></div>
          <Button aria-label="Refresh inbox" disabled={refreshing || loading} onClick={() => void refresh(true)} variant="secondary"><RefreshCw aria-hidden="true" size={16} />{refreshing ? 'Refreshing…' : 'Refresh'}</Button>
        </div>
        <section aria-label="Your conversations" className="messaging-layout">
          <div className="messaging-sidebar">
            {loading ? <div aria-label="Loading conversations" className="conversation-skeletons" role="status">{Array.from({ length: 5 }, (_, index) => <div className="conversation-skeleton" key={index}><i /><span><i /><i /><i /></span></div>)}</div> : error ? (
              <StateMessage action={<Button onClick={() => void refresh()} variant="secondary">Try again</Button>} kind="error" message="Check your connection and retry. No sample conversations are shown." title="Unable to load inbox" />
            ) : conversations.length === 0 ? (
              <StateMessage action={<Link className="button" to="/#listings">Explore listings</Link>} kind="empty" message="When you contact an owner or someone contacts you about a listing, the conversation will appear here." title="Your inbox is empty" />
            ) : <ConversationList conversations={conversations} userId={user?.id ?? ''} />}
          </div>
          <div className="messaging-placeholder"><div className="messaging-placeholder__icon">✦</div><h2>Good conversations start here</h2><p>Select a conversation to see messages and coordinate directly about the item.</p></div>
        </section>
      </main>
    </div>
  )
}
