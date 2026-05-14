// providers/models.js — Centralized model routing for Cloz Digital
// Maps logical AI tasks to optimal Cerebras model groups via environment variables.

// ── Model Groups ──
// Each group resolves to a specific Cerebras model via env vars.
// All groups fall back to CEREBRAS_MODEL if their specific env var is unset.

const MODEL_GROUPS = {
  default:       () => process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  premium:       () => process.env.CEREBRAS_PREMIUM_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  fast:          () => process.env.CEREBRAS_FAST_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  scout:         () => process.env.CEREBRAS_SCOUT_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  writing:       () => process.env.CEREBRAS_WRITING_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  utility:       () => process.env.CEREBRAS_UTILITY_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  review:        () => process.env.CEREBRAS_REVIEW_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  content:       () => process.env.CEREBRAS_CONTENT_MODEL || process.env.CEREBRAS_WRITING_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  communication: () => process.env.CEREBRAS_COMMUNICATION_MODEL || process.env.CEREBRAS_WRITING_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
  forecast:      () => process.env.CEREBRAS_FORECAST_MODEL || process.env.CEREBRAS_PREMIUM_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507',
};

// ── Task-to-Group Mapping ──
// Each AI task maps to a logical model group.

const TASK_ROUTING = {
  // Fast — frequent structured operational responses
  'dashboard-briefing':    'fast',
  'client-summary':        'fast',
  'maintenance-summary':   'fast',
  'invoice-explanation':   'fast',

  // Premium — complex business reasoning
  'lead-analysis':         'premium',
  'package-suggest':       'premium',
  'revenue-insight':       'forecast',
  'next-actions':          'premium',

  // Writing — persuasive client-facing content
  'outreach':              'writing',
  'proposal-draft':        'writing',
  'blog-draft':            'writing',
  'scout-outreach':        'writing',

  // Scout — high-volume batch discovery
  'scout-discovery':       'scout',
  'scout-analysis':        'premium',

  // Review — complex website audits
  'audit-review':          'review',
  'audit-prompt-generation': 'review',

  // Content — structured marketing output
  'content-generate':      'content',

  // Communication — client correspondence
  'email-draft':           'communication',
  'viber-draft':           'communication',

  // Utility — simple text transformations
  'rewrite':               'utility',
  'summarize':             'utility',
  'translate':             'utility',
  'generate':              'default',
};

/**
 * Resolve the optimal model for a given task.
 *
 * @param {string} task - Logical task identifier (e.g. 'dashboard-briefing')
 * @param {object} [options] - Optional overrides
 * @param {string} [options.model] - Explicit model override (takes priority)
 * @returns {string} The resolved Cerebras model ID
 */
export function resolveModel(task, options = {}) {
  // Explicit override always wins
  if (options.model) return options.model;

  // Look up the group for this task
  const group = TASK_ROUTING[task] || 'default';
  const resolver = MODEL_GROUPS[group] || MODEL_GROUPS.default;
  return resolver();
}

/**
 * Get the model group name for a task (for logging/debugging).
 */
export function getModelGroup(task) {
  return TASK_ROUTING[task] || 'default';
}

/**
 * List all configured model groups and their current resolved models.
 */
export function listModelConfig() {
  const config = {};
  for (const [group, resolver] of Object.entries(MODEL_GROUPS)) {
    config[group] = resolver();
  }
  return config;
}

/**
 * List all task-to-group mappings.
 */
export function listTaskRouting() {
  return { ...TASK_ROUTING };
}
