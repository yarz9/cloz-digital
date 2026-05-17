// Knowledge Center query hooks. Covers articles, courses, playbooks,
// prompts, search, analytics, enrollments, certificates.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

function qs(o) {
  const p = new URLSearchParams()
  Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── Articles ─────────────────────────────────────────────────
export function useArticles(filters = {}) {
  return useQuery({
    queryKey: qk.knowledge.articles(filters),
    queryFn: () => api.get(`/api/knowledge/articles${qs(filters)}`),
  })
}

export function useArticle(idOrSlug) {
  return useQuery({
    queryKey: qk.knowledge.article(idOrSlug),
    queryFn: () => api.get(`/api/knowledge/articles/${idOrSlug}`),
    enabled: !!idOrSlug,
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/knowledge/articles', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowledge.all }),
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/knowledge/articles/${id}`, patch),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.knowledge.article(id) })
      qc.invalidateQueries({ queryKey: qk.knowledge.all })
    },
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/knowledge/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowledge.all }),
  })
}

// ── Courses + Lessons + Enrollments ──────────────────────────
export function useCourses(user) {
  return useQuery({
    queryKey: qk.knowledge.courses(user),
    queryFn: () => api.get(`/api/knowledge/courses${user ? `?user=${encodeURIComponent(user)}` : ''}`),
  })
}

export function useCourse(idOrSlug) {
  return useQuery({
    queryKey: qk.knowledge.course(idOrSlug),
    queryFn: () => api.get(`/api/knowledge/courses/${idOrSlug}`),
    enabled: !!idOrSlug,
  })
}

export function useEnrollments(user) {
  return useQuery({
    queryKey: qk.knowledge.enrollments(user),
    queryFn: () => api.get(`/api/knowledge/enrollments?user=${encodeURIComponent(user)}`),
    enabled: !!user,
  })
}

export function useCertificates(user) {
  return useQuery({
    queryKey: qk.knowledge.certificates(user),
    queryFn: () => api.get(`/api/knowledge/certificates${user ? `?user=${encodeURIComponent(user)}` : ''}`),
  })
}

export function useEnrollInCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, user }) => api.post(`/api/knowledge/courses/${courseId}/enroll`, { user }),
    onSuccess: (_d, { user }) => {
      qc.invalidateQueries({ queryKey: qk.knowledge.courses(user) })
      qc.invalidateQueries({ queryKey: qk.knowledge.enrollments(user) })
    },
  })
}

export function useCompleteLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lessonId, user, quiz_score, quiz_total }) =>
      api.post(`/api/knowledge/lessons/${lessonId}/complete`, { user, quiz_score, quiz_total }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowledge.all }),
  })
}

// ── Playbooks ────────────────────────────────────────────────
export function usePlaybooks(filters = {}) {
  return useQuery({
    queryKey: qk.knowledge.playbooks(filters),
    queryFn: () => api.get(`/api/knowledge/playbooks${qs(filters)}`),
  })
}

// ── Prompts ──────────────────────────────────────────────────
export function usePrompts(filters = {}) {
  return useQuery({
    queryKey: qk.knowledge.prompts(filters),
    queryFn: () => api.get(`/api/knowledge/prompts${qs(filters)}`),
  })
}

export function useUsePrompt() {
  return useMutation({ mutationFn: (id) => api.post(`/api/knowledge/prompts/${id}/use`) })
}

// ── Search + analytics ───────────────────────────────────────
export function useKnowledgeSearch(q, user) {
  return useQuery({
    queryKey: qk.knowledge.search(q),
    queryFn: () => api.get(`/api/knowledge/search?q=${encodeURIComponent(q)}${user ? `&user=${encodeURIComponent(user)}` : ''}`),
    enabled: !!q && q.trim().length > 0,
  })
}

export function useKnowledgeAnalytics() {
  return useQuery({
    queryKey: qk.knowledge.analytics(),
    queryFn: () => api.get('/api/knowledge/analytics'),
  })
}
