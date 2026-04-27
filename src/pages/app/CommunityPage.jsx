import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// CONSTANTS
// =============================================
const E = {
  person: String.fromCodePoint(0x1F464),
  people: String.fromCodePoint(0x1F465),
  heart: String.fromCodePoint(0x2764, 0xFE0F),
  whiteHeart: String.fromCodePoint(0x1F90D),
  speech: String.fromCodePoint(0x1F4AC),
  link: String.fromCodePoint(0x1F517),
  send: String.fromCodePoint(0x1F4E8),
  fire: String.fromCodePoint(0x1F525),
  muscle: String.fromCodePoint(0x1F4AA),
  trophy: String.fromCodePoint(0x1F3C6),
  crown: String.fromCodePoint(0x1F451),
  gear: String.fromCodePoint(0x2699, 0xFE0F),
  seedling: String.fromCodePoint(0x1F331),
  dot: String.fromCodePoint(0x00B7),
  arrow: String.fromCodePoint(0x2192),
  megaphone: String.fromCodePoint(0x1F4E3),
  wave: String.fromCodePoint(0x1F44B),
  sparkle: String.fromCodePoint(0x2728),
  x: String.fromCodePoint(0x2715),
  back: String.fromCodePoint(0x2190),
  pin: String.fromCodePoint(0x1F4CC),
  bulb: String.fromCodePoint(0x1F4A1),
  chat: String.fromCodePoint(0x1F5E3, 0xFE0F),
  plus: String.fromCodePoint(0x2795),
}

const LEAGUES = [
  { min: 50000, name: 'Legend', emoji: 'crown', color: 'text-amber-500' },
  { min: 15000, name: 'Beast', emoji: 'fire', color: 'text-red-500' },
  { min: 5000, name: 'Athlete', emoji: 'muscle', color: 'text-red-500' },
  { min: 1000, name: 'Grinder', emoji: 'gear', color: 'text-gray-500' },
  { min: 0, name: 'Rookie', emoji: 'seedling', color: 'text-green-500' },
]

function getLeague(xp) {
  for (const l of LEAGUES) if (xp >= l.min) return l
  return LEAGUES[LEAGUES.length - 1]
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

const POST_TYPES = [
  { value: 'general', label: 'General', emoji: E.speech },
  { value: 'workout', label: 'Workout', emoji: E.muscle },
  { value: 'pr', label: 'New PR', emoji: E.trophy },
  { value: 'motivation', label: 'Motivation', emoji: E.fire },
]

const FEED_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'workout', label: 'Workouts' },
  { value: 'pr', label: 'PRs' },
  { value: 'motivation', label: 'Motivation' },
]

const DISCUSSION_CATEGORIES = [
  { value: 'general', label: 'General', emoji: E.speech },
  { value: 'training', label: 'Training', emoji: E.muscle },
  { value: 'nutrition', label: 'Nutrition', emoji: E.bulb },
  { value: 'goals', label: 'Goals', emoji: E.trophy },
]

// =============================================
// AVATAR
// =============================================
function Avatar({ url, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-lg' }
  const cls = sizes[size] || sizes.md
  return (
    <div className={`${cls} bg-surface rounded-full flex items-center justify-center overflow-hidden border border-border flex-shrink-0`}>
      {url ? <img src={url} alt="" className={`${cls} rounded-full object-cover`} /> : <span>{E.person}</span>}
    </div>
  )
}

// =============================================
// POST COMPOSER
// =============================================
function PostComposer({ profile, onPost }) {
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('general')
  const [posting, setPosting] = useState(false)
  const [showTypes, setShowTypes] = useState(false)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)

  const handlePost = async () => {
    const trimmed = content.trim()
    if (!trimmed || posting) return
    setPosting(true)
    const success = await onPost(trimmed, postType)
    if (success !== false) {
      setContent('')
      setPostType('general')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
    setPosting(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost()
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowTypes(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeType = POST_TYPES.find((t) => t.value === postType) || POST_TYPES[0]

  return (
    <div className="flex gap-3">
      <Avatar url={profile?.avatar_url} />
      <div className="flex-1 min-w-0 bg-surface border border-border rounded-2xl px-4 py-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); autoResize(e) }}
          onKeyDown={handleKeyDown}
          placeholder="Share something with the community..."
          className="w-full resize-none bg-transparent text-sm text-dark placeholder:text-dim outline-none min-h-[36px] leading-relaxed"
          rows={1}
        />
        {content.trim() && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowTypes(!showTypes)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted hover:text-red-500 transition-colors"
              >
                {activeType.emoji} {activeType.label}
                <span className="text-[10px] ml-0.5 opacity-50">▾</span>
              </button>
              {showTypes && (
                <div className="absolute left-0 bottom-full mb-1 bg-surface border border-border rounded-xl shadow-lg z-10 py-1 min-w-[130px]">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => { setPostType(t.value); setShowTypes(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                        postType === t.value ? 'bg-accent-soft text-red-500' : 'text-muted hover:bg-light'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handlePost}
              disabled={posting}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-dark text-white hover:bg-red-600 transition-colors"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================
// SINGLE POST CARD
// =============================================
function PostCard({ post, currentUserId, onLike, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [copied, setCopied] = useState(false)

  const authorProfile = post.profiles
  const league = getLeague(authorProfile?.xp_total || 0)
  const isOwn = post.user_id === currentUserId
  const isLiked = post.liked_by_me
  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0]

  const loadComments = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    const { data } = await supabase
      .from('post_comments')
      .select('id, content, created_at, profiles:user_id ( username, avatar_url, xp_total )')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(50)
    setComments(data || [])
    setLoadingComments(false)
  }

  const toggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) loadComments()
  }

  const submitComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed || submittingComment) return
    setSubmittingComment(true)
    await onComment(post.id, trimmed)
    setCommentText('')
    setSubmittingComment(false)
    loadComments()
  }

  const handleShare = () => {
    const text = `${authorProfile?.username || 'Someone'}: "${post.content}"`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 transition-shadow hover:shadow-sm">
      {/* Header + Content */}
      <div className="flex gap-3">
        <Avatar url={authorProfile?.avatar_url} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-dark">{authorProfile?.username || 'Unknown'}</span>
              <span className={`text-xs ${league.color}`} title={league.name}>{E[league.emoji]}</span>
              {post.post_type && post.post_type !== 'general' && (
                <span className="px-1.5 py-0.5 rounded-md bg-accent-soft text-red-500 text-[10px] font-semibold">
                  {typeInfo.label}
                </span>
              )}
              <span className="text-[11px] text-dim">{E.dot} {timeAgo(post.created_at)}</span>
            </div>
            {isOwn && (
              <button onClick={() => onDelete(post.id)} className="text-dim hover:text-red-500 transition-colors p-1 text-xs" title="Delete post">
                {E.x}
              </button>
            )}
          </div>
          <p className="text-sm text-dark leading-relaxed whitespace-pre-wrap mt-2">{post.content}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-3 ml-12">
        <button
          onClick={() => onLike(post.id, isLiked)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isLiked ? 'text-red-500' : 'text-dim hover:text-red-500'
          }`}
        >
          <span className="text-sm">{isLiked ? E.heart : E.whiteHeart}</span>
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showComments ? 'text-dark' : 'text-dim hover:text-dark'
          }`}
        >
          <span className="text-sm">{E.speech}</span>
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-dim hover:text-dark transition-colors"
        >
          <span className="text-sm">{E.link}</span>
          {copied && <span className="text-green-500">Copied!</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 ml-12 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Write a comment..."
              className="flex-1 text-xs bg-light rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-red-500/20 transition-all text-dark placeholder:text-dim"
            />
            <button
              onClick={submitComment}
              disabled={!commentText.trim() || submittingComment}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                commentText.trim() ? 'bg-dark text-white hover:bg-red-600' : 'bg-surface text-dim cursor-not-allowed'
              }`}
            >
              {E.send}
            </button>
          </div>
          {loadingComments ? (
            <div className="text-xs text-dim py-2 text-center">Loading...</div>
          ) : comments.length > 0 ? (
            <div className="space-y-2.5">
              {comments.map((c) => {
                const cLeague = getLeague(c.profiles?.xp_total || 0)
                return (
                  <div key={c.id} className="flex gap-2">
                    <Avatar url={c.profiles?.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-dark">{c.profiles?.username || 'Unknown'}</span>
                        <span className={`text-[10px] ${cLeague.color}`}>{E[cLeague.emoji]}</span>
                        <span className="text-[10px] text-dim">{E.dot} {timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed mt-0.5">{c.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-dim py-1 text-center">No comments yet</div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// DISCUSSION THREAD VIEW
// =============================================
function DiscussionThread({ discussion, currentUserId, onBack, onReply, onDelete }) {
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)

  const authorProfile = discussion.profiles
  const league = getLeague(authorProfile?.xp_total || 0)
  const catInfo = DISCUSSION_CATEGORIES.find((c) => c.value === discussion.category) || DISCUSSION_CATEGORIES[0]
  const isOwn = discussion.user_id === currentUserId

  useEffect(() => {
    loadReplies()
  }, [discussion.id])

  const loadReplies = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('discussion_replies')
      .select('id, content, created_at, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .eq('discussion_id', discussion.id)
      .order('created_at', { ascending: true })
      .limit(100)
    setReplies(data || [])
    setLoading(false)
  }

  const submitReply = async () => {
    const trimmed = replyText.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await onReply(discussion.id, trimmed)
    setReplyText('')
    setSubmitting(false)
    loadReplies()
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted hover:text-red-500 transition-colors">
        {E.back} Back
      </button>

      {/* Original post */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar url={authorProfile?.avatar_url} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-dark">{authorProfile?.username || 'Unknown'}</span>
                <span className={`text-xs ${league.color}`} title={league.name}>{E[league.emoji]}</span>
                <span className="text-[11px] text-dim">{E.dot} {timeAgo(discussion.created_at)}</span>
              </div>
              <span className="text-[10px] font-medium text-muted">{catInfo.emoji} {catInfo.label}</span>
            </div>
          </div>
          {isOwn && (
            <button onClick={() => { onDelete(discussion.id); onBack() }} className="text-dim hover:text-red-500 transition-colors p-1 text-xs" title="Delete">
              {E.x}
            </button>
          )}
        </div>
        <h2 className="text-lg font-black text-dark mb-2">{discussion.title}</h2>
        <p className="text-sm text-dark leading-relaxed whitespace-pre-wrap">{discussion.content}</p>
      </div>

      {/* Replies */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold text-dim uppercase tracking-wide mb-4">
          Replies {replies.length > 0 && `(${replies.length})`}
        </h3>

        {loading ? (
          <div className="text-xs text-dim py-4 text-center">Loading...</div>
        ) : replies.length > 0 ? (
          <div className="space-y-4 mb-4">
            {replies.map((r) => {
              const rLeague = getLeague(r.profiles?.xp_total || 0)
              return (
                <div key={r.id} className="flex gap-3">
                  <Avatar url={r.profiles?.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-dark">{r.profiles?.username || 'Unknown'}</span>
                      <span className={`text-[10px] ${rLeague.color}`}>{E[rLeague.emoji]}</span>
                      <span className="text-[10px] text-dim">{E.dot} {timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-dim py-3 text-center mb-4">No replies yet. Start the conversation!</div>
        )}

        <div className="flex gap-2 pt-4 border-t border-border/60">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply() }}
            placeholder="Write a reply..."
            className="flex-1 text-sm bg-light rounded-xl px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-red-500/20 transition-all text-dark placeholder:text-dim resize-none min-h-[44px]"
            rows={2}
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim() || submitting}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors self-end ${
              replyText.trim() ? 'bg-dark text-white hover:bg-red-600' : 'bg-surface text-dim cursor-not-allowed'
            }`}
          >
            Reply
          </button>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// =============================================
// NEW DISCUSSION FORM
// =============================================
function NewDiscussionForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return
    setSubmitting(true)
    await onSubmit(title.trim(), content.trim(), category)
    setSubmitting(false)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark">New Discussion</h3>
        <button onClick={onCancel} className="text-dim hover:text-red-500 transition-colors text-sm">{E.x}</button>
      </div>

      <div className="flex items-center gap-1.5">
        {DISCUSSION_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              category === c.value
                ? 'bg-accent-soft text-red-500'
                : 'text-muted hover:text-red-500'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full text-sm bg-light rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-red-500/20 transition-all text-dark placeholder:text-dim font-semibold"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full text-sm bg-light rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-red-500/20 transition-all text-dark placeholder:text-dim resize-none min-h-[100px] leading-relaxed"
        rows={4}
      />

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || submitting}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            title.trim() && content.trim()
              ? 'bg-dark text-white hover:bg-red-600'
              : 'bg-surface text-dim cursor-not-allowed'
          }`}
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  )
}

// =============================================
// DISCUSSIONS LIST
// =============================================
function DiscussionsList({ discussions, onSelect }) {
  if (discussions.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-3xl mb-2">{E.chat}</div>
        <p className="text-sm text-muted">No discussions yet. Start one above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {discussions.map((d) => {
        const league = getLeague(d.profiles?.xp_total || 0)
        const catInfo = DISCUSSION_CATEGORIES.find((c) => c.value === d.category) || DISCUSSION_CATEGORIES[0]
        return (
          <div
            key={d.id}
            onClick={() => onSelect(d)}
            className="bg-surface border border-border rounded-xl px-4 py-3.5 hover:border-red-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-dark group-hover:text-red-500 transition-colors truncate">{d.title}</h3>
              <span className="text-[10px] text-muted flex-shrink-0">{catInfo.emoji} {catInfo.label}</span>
            </div>
            <p className="text-xs text-muted line-clamp-1 mb-2">{d.content}</p>
            <div className="flex items-center gap-2 text-[11px] text-dim">
              <span className={league.color}>{E[league.emoji]}</span>
              <span className="font-medium text-dark">{d.profiles?.username || 'Unknown'}</span>
              <span>{E.dot} {timeAgo(d.created_at)}</span>
              <span>{E.dot} {E.speech} {d.reply_count || 0}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================
// TRENDING WIDGET
// =============================================
function TrendingWidget({ posts }) {
  if (!posts.length) return null
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <h3 className="text-xs font-bold text-dim uppercase tracking-wide mb-3">{E.fire} Hot This Week</h3>
      <div className="space-y-3">
        {posts.map((p, i) => {
          const league = getLeague(p.profiles?.xp_total || 0)
          return (
            <div key={p.id} className="flex items-start gap-2.5">
              <span className="text-xs font-black text-dim w-4 flex-shrink-0 mt-0.5 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-dark truncate">{p.profiles?.username}</span>
                  <span className={`text-[10px] ${league.color}`}>{E[league.emoji]}</span>
                </div>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">{p.content}</p>
                <span className="text-[10px] text-red-500 font-medium mt-1 block">{E.heart} {p.like_count || 0}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================
// TOP CONTRIBUTOR WIDGET
// =============================================
function TopContributorWidget({ contributor }) {
  if (!contributor) return null
  const league = getLeague(contributor.profile?.xp_total || 0)
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <h3 className="text-xs font-bold text-dim uppercase tracking-wide mb-3">{E.crown} Top This Week</h3>
      <div className="flex items-center gap-3">
        <Avatar url={contributor.profile?.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-dark truncate">{contributor.profile?.username}</span>
            <span className={`text-xs ${league.color}`}>{E[league.emoji]}</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {contributor.posts} post{contributor.posts !== 1 ? 's' : ''} {E.dot} {contributor.likes} {E.heart}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// COMMUNITY PAGE
// =============================================
export default function CommunityPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('feed')

  const [posts, setPosts] = useState([])
  const [feedFilter, setFeedFilter] = useState('all')
  const [feedSort, setFeedSort] = useState('latest')
  const [myLikes, setMyLikes] = useState(new Set())
  const [trendingPosts, setTrendingPosts] = useState([])
  const [topContributor, setTopContributor] = useState(null)

  const [discussions, setDiscussions] = useState([])
  const [activeDiscussion, setActiveDiscussion] = useState(null)
  const [showNewDiscussion, setShowNewDiscussion] = useState(false)

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadProfile(), loadPosts(), loadDiscussions(), loadTrendingAndTop()])
    setLoading(false)
  }

  const loadTrendingAndTop = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('posts')
      .select('id, content, like_count, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .gte('created_at', weekAgo)
      .order('like_count', { ascending: false })
      .limit(10)
    if (!data || !data.length) return

    setTrendingPosts(data.slice(0, 3))

    const userMap = {}
    data.forEach((p) => {
      const uid = p.user_id
      if (!userMap[uid]) userMap[uid] = { profile: p.profiles, posts: 0, likes: 0 }
      userMap[uid].posts++
      userMap[uid].likes += p.like_count || 0
    })
    const top = Object.values(userMap).sort((a, b) => (b.likes + b.posts * 2) - (a.likes + a.posts * 2))[0]
    setTopContributor(top || null)
  }

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  // ---- FEED ----

  const loadPosts = async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, content, post_type, like_count, comment_count, created_at, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    const postsList = postsData || []
    setPosts(postsList)

    if (postsList.length > 0) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postsList.map((p) => p.id))
      setMyLikes(new Set((likes || []).map((l) => l.post_id)))
    }
  }

  const createPost = async (content, postType) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, content, post_type: postType })
      .select('id, content, post_type, like_count, comment_count, created_at, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .single()
    if (error) {
      console.error('Failed to create post:', error)
      return false
    }
    if (data) setPosts((prev) => [data, ...prev])
    return true
  }

  const toggleLike = async (postId, currentlyLiked) => {
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, like_count: (p.like_count || 0) + (currentlyLiked ? -1 : 1) } : p)
    )
    setMyLikes((prev) => {
      const next = new Set(prev)
      currentlyLiked ? next.delete(postId) : next.add(postId)
      return next
    })

    if (currentlyLiked) {
      await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId)
      await supabase.rpc('decrement_like', { p_post_id: postId }).catch(() => {
        supabase.from('posts').update({ like_count: Math.max(0, (posts.find(p => p.id === postId)?.like_count || 1) - 1) }).eq('id', postId)
      })
    } else {
      await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId }).catch(() => {})
      await supabase.rpc('increment_like', { p_post_id: postId }).catch(() => {
        supabase.from('posts').update({ like_count: (posts.find(p => p.id === postId)?.like_count || 0) + 1 }).eq('id', postId)
      })
    }
  }

  const addComment = async (postId, content) => {
    const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, content })
    if (!error) {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
      await supabase.rpc('increment_comment', { p_post_id: postId }).catch(() => {
        const post = posts.find(p => p.id === postId)
        supabase.from('posts').update({ comment_count: (post?.comment_count || 0) + 1 }).eq('id', postId)
      })
    }
  }

  const deletePost = async (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id)
  }

  // ---- DISCUSSIONS ----

  const loadDiscussions = async () => {
    const { data } = await supabase
      .from('discussions')
      .select('id, title, content, category, reply_count, last_reply_at, created_at, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50)
    setDiscussions(data || [])
  }

  const createDiscussion = async (title, content, category) => {
    const { data, error } = await supabase
      .from('discussions')
      .insert({ user_id: user.id, title, content, category })
      .select('id, title, content, category, reply_count, last_reply_at, created_at, user_id, profiles:user_id ( username, avatar_url, xp_total )')
      .single()
    if (!error && data) {
      setDiscussions((prev) => [data, ...prev])
      setShowNewDiscussion(false)
      setActiveDiscussion(data)
    }
  }

  const replyToDiscussion = async (discussionId, content) => {
    const { error } = await supabase
      .from('discussion_replies')
      .insert({ discussion_id: discussionId, user_id: user.id, content })
    if (!error) {
      const now = new Date().toISOString()
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discussionId
            ? { ...d, reply_count: (d.reply_count || 0) + 1, last_reply_at: now }
            : d
        )
      )
      if (activeDiscussion?.id === discussionId) {
        setActiveDiscussion((prev) => ({ ...prev, reply_count: (prev.reply_count || 0) + 1, last_reply_at: now }))
      }
      await supabase.rpc('increment_discussion_reply', { p_discussion_id: discussionId }).catch(() => {
        supabase.from('discussions')
          .update({ reply_count: (discussions.find(d => d.id === discussionId)?.reply_count || 0) + 1, last_reply_at: now })
          .eq('id', discussionId)
      })
    }
  }

  const deleteDiscussion = async (discussionId) => {
    setDiscussions((prev) => prev.filter((d) => d.id !== discussionId))
    await supabase.from('discussions').delete().eq('id', discussionId).eq('user_id', user.id)
  }

  // ---- FILTERING + SORTING ----
  const filteredPosts = (feedFilter === 'all' ? posts : posts.filter((p) => p.post_type === feedFilter))
    .slice()
    .sort((a, b) => feedSort === 'top' ? (b.like_count || 0) - (a.like_count || 0) : 0)

  // ---- RENDER ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  const league = getLeague(profile?.xp_total || 0)
  const nextLeague = LEAGUES.find((l) => l.min > (profile?.xp_total || 0))
  const currentMin = LEAGUES.find((l) => l.min <= (profile?.xp_total || 0))?.min || 0
  const progress = nextLeague ? ((profile?.xp_total || 0) - currentMin) / (nextLeague.min - currentMin) : 1

  return (
    <div className="max-w-5xl">

      {/* Header — title + tabs inline */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-dark mb-4">Community</h1>
        <div className="flex items-center gap-6">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {[
              { key: 'feed', label: 'Feed' },
              { key: 'discussions', label: 'Discussions' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setActiveDiscussion(null); setShowNewDiscussion(false) }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-dark text-white'
                    : 'text-dim hover:text-dark hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feed filters + sort — only on feed tab */}
          {activeTab === 'feed' && (
            <>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-1">
                {FEED_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFeedFilter(f.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      feedFilter === f.value
                        ? 'bg-accent-soft text-red-500'
                        : 'text-dim hover:text-muted'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-1">
                {[{ v: 'latest', label: 'Latest' }, { v: 'top', label: 'Top' }].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setFeedSort(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      feedSort === v ? 'bg-accent-soft text-red-500' : 'text-dim hover:text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* New discussion button — only on discussions tab */}
          {activeTab === 'discussions' && !activeDiscussion && (
            <>
              <div className="flex-1" />
              <button
                onClick={() => setShowNewDiscussion(!showNewDiscussion)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-dark text-white hover:bg-red-600 transition-colors"
              >
                {showNewDiscussion ? 'Cancel' : 'New Discussion'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* LEFT: Content */}
        <div className="space-y-4 min-w-0">

          {/* ===== FEED ===== */}
          {activeTab === 'feed' && (
            <>
              <PostComposer profile={profile} onPost={createPost} />

              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={{ ...post, liked_by_me: myLikes.has(post.id) }}
                    currentUserId={user.id}
                    onLike={toggleLike}
                    onComment={addComment}
                    onDelete={deletePost}
                  />
                ))
              ) : (
                <div className="py-16 text-center">
                  <div className="text-3xl mb-2">{E.wave}</div>
                  <p className="text-sm font-medium text-dark mb-1">
                    {feedFilter === 'all' ? 'No posts yet' : `No ${feedFilter} posts yet`}
                  </p>
                  <p className="text-xs text-dim">Be the first to share something!</p>
                </div>
              )}
            </>
          )}

          {/* ===== DISCUSSIONS ===== */}
          {activeTab === 'discussions' && (
            <>
              {activeDiscussion ? (
                <DiscussionThread
                  discussion={activeDiscussion}
                  currentUserId={user.id}
                  onBack={() => setActiveDiscussion(null)}
                  onReply={replyToDiscussion}
                  onDelete={deleteDiscussion}
                />
              ) : (
                <>
                  {showNewDiscussion && (
                    <NewDiscussionForm
                      onSubmit={createDiscussion}
                      onCancel={() => setShowNewDiscussion(false)}
                    />
                  )}
                  <DiscussionsList discussions={discussions} onSelect={setActiveDiscussion} />
                </>
              )}
            </>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4 hidden lg:block">
          {/* Profile + Streak card */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar url={profile?.avatar_url} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-dark truncate">{profile?.display_name || profile?.username || 'User'}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${league.color}`}>{E[league.emoji]} {league.name}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-light rounded-xl py-2 text-center">
                <div className="text-base font-black text-red-500">{(profile?.xp_total || 0).toLocaleString()}</div>
                <div className="text-[10px] text-dim">XP</div>
              </div>
              <div className="flex-1 bg-light rounded-xl py-2 text-center">
                <div className="text-base font-black text-dark">{profile?.current_streak || 0} {E.fire}</div>
                <div className="text-[10px] text-dim">Streak</div>
              </div>
            </div>
            {nextLeague && (
              <div>
                <div className="h-1.5 bg-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-dim text-center mt-1.5">
                  {(nextLeague.min - (profile?.xp_total || 0)).toLocaleString()} XP to {nextLeague.name}
                </div>
              </div>
            )}
          </div>

          <TopContributorWidget contributor={topContributor} />
          <TrendingWidget posts={trendingPosts} />

          {/* Community Guidelines */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <h3 className="text-xs font-bold text-dim uppercase tracking-wide mb-3">Community Vibes</h3>
            <div className="space-y-2.5">
              {[
                { emoji: E.muscle, text: 'Celebrate every rep' },
                { emoji: E.fire, text: 'Stay consistent, stay kind' },
                { emoji: E.trophy, text: 'Share your PRs proudly' },
                { emoji: E.heart, text: 'Lift each other up' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-muted">
                  <span className="text-sm">{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
