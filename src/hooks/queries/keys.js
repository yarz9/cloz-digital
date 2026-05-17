// Centralised TanStack Query keys. Single source of truth for cache
// invalidation. Use these factories everywhere — never inline string
// arrays.
//
// Pattern:
//   queryClient.invalidateQueries({ queryKey: qk.persistence.status() })
//   queryClient.invalidateQueries({ queryKey: qk.persistence.all })

export const qk = {
  persistence: {
    all:        ['persistence'],
    status:    () => ['persistence', 'status'],
    tables:    () => ['persistence', 'tables'],
    audit:     (filters = {}) => ['persistence', 'audit', filters],
    auditStats:() => ['persistence', 'audit-stats'],
    markers:   () => ['persistence', 'markers'],
    snapshots: () => ['persistence', 'snapshots'],
    pg:        () => ['persistence', 'pg'],
  },

  serviceDesk: {
    all:       ['service-desk'],
    requests:  (filters = {}) => ['service-desk', 'requests', filters],
    metrics:   () => ['service-desk', 'metrics'],
    request:   (type, id) => ['service-desk', 'request', type, id],
    tasks:     (filters = {}) => ['service-desk', 'tasks', filters],
  },

  portalClients: {
    all:    ['portal-clients'],
    list:   () => ['portal-clients', 'list'],
    detail: (id) => ['portal-clients', 'detail', id],
  },

  knowledge: {
    all:        ['knowledge'],
    articles:   (filters = {}) => ['knowledge', 'articles', filters],
    article:    (idOrSlug) => ['knowledge', 'article', idOrSlug],
    courses:    (user) => ['knowledge', 'courses', user || ''],
    course:     (idOrSlug) => ['knowledge', 'course', idOrSlug],
    playbooks:  (filters = {}) => ['knowledge', 'playbooks', filters],
    prompts:    (filters = {}) => ['knowledge', 'prompts', filters],
    analytics:  () => ['knowledge', 'analytics'],
    search:     (q) => ['knowledge', 'search', q],
    enrollments:(user) => ['knowledge', 'enrollments', user || ''],
    certificates:(user) => ['knowledge', 'certificates', user || ''],
  },
}
