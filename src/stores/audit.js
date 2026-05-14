import { create } from 'zustand'

let _rid = 0
const nextReviewId = () => `REV-${String(++_rid).padStart(4, '0')}`

// ═══════════════════════════════════════════════
// AUDIT LAB STORE
// ═══════════════════════════════════════════════
export const useAuditStore = create((set, get) => ({

  // ─── Review History ───
  reviews: [],

  addReview: (review) => {
    const id = nextReviewId()
    const entry = {
      id,
      ...review,
      created_at: review.created_at || new Date().toISOString(),
      linked_entity_type: null,
      linked_entity_id: null,
      tags: [],
      notes: '',
      is_starred: false,
    }
    set(s => ({ reviews: [entry, ...s.reviews] }))
    return id
  },

  updateReview: (id, updates) => set(s => ({
    reviews: s.reviews.map(r => r.id === id ? { ...r, ...updates } : r)
  })),

  deleteReview: (id) => set(s => ({
    reviews: s.reviews.filter(r => r.id !== id)
  })),

  starReview: (id) => set(s => ({
    reviews: s.reviews.map(r => r.id === id ? { ...r, is_starred: !r.is_starred } : r)
  })),

  linkReview: (reviewId, entityType, entityId) => set(s => ({
    reviews: s.reviews.map(r => r.id === reviewId ? { ...r, linked_entity_type: entityType, linked_entity_id: entityId } : r)
  })),

  // ─── Saved Prompt Variants ───
  savedPrompts: [],

  addSavedPrompt: (prompt) => {
    const id = `PRV-${Date.now()}`
    set(s => ({ savedPrompts: [{ id, ...prompt, created_at: new Date().toISOString() }, ...s.savedPrompts] }))
    return id
  },

  // ─── Current review being viewed ───
  activeReview: null,
  setActiveReview: (review) => set({ activeReview: review }),

  // ─── Comparison ───
  comparisonPair: [null, null],
  setComparisonPair: (pair) => set({ comparisonPair: pair }),

}))
