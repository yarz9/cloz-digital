import { Share2, Calendar, Sparkles, Loader2, Plus, Image, Globe } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

export default function SocialPlanner() {
  const socialPosts = useStore(s => s.socialPosts)
  const addSocialPost = useStore(s => s.addSocialPost)
  const clients = useStore(s => s.clients)
  const [showAdd, setShowAdd] = useState(false)

  const [selectedClient, setSelectedClient] = useState('')
  const [platform, setPlatform] = useState('Instagram')
  const [topic, setTopic] = useState('')
  const captionGen = useAI(ai.contentGenerate)

  const generate = () => {
    if (!selectedClient || !topic) return
    captionGen.run({
      type: 'social',
      format: platform.toLowerCase(),
      brief: `Create a ${platform} post for ${selectedClient} about: ${topic}`,
      tone: 'professional',
      language: 'english',
    })
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Social Planner</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Schedule and AI-generate social media content for clients</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> New Post
        </button>
      </div>

      {/* Calendar stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Scheduled', value: socialPosts.filter(p => p.status === 'scheduled').length, sub: 'posts' },
          { label: 'Drafts', value: socialPosts.filter(p => p.status === 'draft').length, sub: 'need review' },
          { label: 'Platforms', value: [...new Set(socialPosts.map(p => p.platform))].length, sub: [...new Set(socialPosts.map(p => p.platform))].join(', ') },
          { label: 'Clients', value: new Set(socialPosts.map(p => p.client)).size, sub: 'with content' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <span className="text-[11px] text-text-tertiary">{s.label}</span>
            <div className="text-[22px] font-display font-bold mt-1">{s.value}</div>
            <span className="text-[10px] text-text-tertiary">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Scheduled posts */}
        <div className="lg:col-span-3 space-y-2">
          <h2 className="font-display font-semibold text-[14px] mb-2">Upcoming Posts</h2>
          {socialPosts.map(post => (
            <div key={post.id} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  post.platform === 'Instagram' ? 'bg-pink-500/10' : 'bg-blue-500/10'
                }`}>
                  {post.platform === 'Instagram' ? (
                    <Image size={14} className="text-pink-400" />
                  ) : (
                    <Globe size={14} className="text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-medium">{post.client}</span>
                    <span className="text-[9px] text-text-tertiary bg-elevated px-1 py-0.5 rounded">{post.type}</span>
                    <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                      post.status === 'scheduled' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>{post.status}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary truncate">{post.caption}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-text-secondary block">{post.date}</span>
                  <span className="text-[10px] text-text-tertiary">{post.time}</span>
                </div>
              </div>
            </div>
          ))}
          {socialPosts.length === 0 && (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-[13px] text-text-tertiary mb-3">No posts scheduled</p>
              <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Schedule your first post</button>
            </div>
          )}
        </div>

        {/* AI Caption Generator */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
            <Sparkles size={13} className="text-accent" /> AI Caption Generator
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Client</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Platform</label>
              <div className="flex gap-2">
                {['Instagram', 'Facebook'].map(p => (
                  <button key={p} onClick={() => setPlatform(p)} className={`text-[11px] px-2.5 py-1.5 rounded transition-colors ${platform === p ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Topic / Brief</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="What should the post be about?" className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none resize-none" />
            </div>
            <button onClick={generate} disabled={captionGen.loading || !selectedClient || !topic} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 w-full justify-center">
              {captionGen.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {captionGen.loading ? 'Generating...' : 'Generate Caption'}
            </button>
          </div>
          {captionGen.data && (
            <div className="mt-3 p-3 bg-elevated rounded-md text-[11px] text-text-secondary leading-relaxed whitespace-pre-line">
              {captionGen.data.text || JSON.stringify(captionGen.data.data, null, 2)}
            </div>
          )}
        </div>
      </div>

      <AddPostModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addSocialPost} clients={clients} />
    </div>
  )
}

function AddPostModal({ open, onClose, onSubmit, clients }) {
  const [form, setForm] = useState({ client: '', platform: 'Instagram', type: 'Single Image', date: '', time: '10:00', caption: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.client || !form.caption) return
    onSubmit({ ...form, status: form.date ? 'scheduled' : 'draft' })
    setSuccess(`Post for ${form.client} ${form.date ? 'scheduled' : 'saved as draft'}!`)
    setTimeout(() => { setSuccess(''); setForm({ client: '', platform: 'Instagram', type: 'Single Image', date: '', time: '10:00', caption: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Social Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Client" required>
          <Select value={form.client} onChange={e => set('client', e.target.value)}>
            <option value="">Select client...</option>
            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Platform">
            <Select value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
            </Select>
          </Field>
          <Field label="Post Type">
            <Select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="Single Image">Single Image</option>
              <option value="Carousel">Carousel</option>
              <option value="Reel">Reel</option>
              <option value="Story">Story</option>
              <option value="Article">Article</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" hint="Leave empty for draft">
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </Field>
        </div>
        <Field label="Caption" required>
          <Textarea value={form.caption} onChange={e => set('caption', e.target.value)} rows={3} placeholder="Write or paste your caption..." />
        </Field>
        <SubmitButton disabled={!form.client || !form.caption}>{form.date ? 'Schedule Post' : 'Save as Draft'}</SubmitButton>
      </form>
    </Modal>
  )
}
