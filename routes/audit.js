import { Router } from 'express';
import { getActiveProvider } from '../providers/index.js';
import { addLog } from './logs.js';

const router = Router();

// ═══════════════════════════════════════════════
// REVIEW CATEGORY SCHEMA
// ═══════════════════════════════════════════════
const reviewSchema = {
  type: 'object',
  properties: {
    overall_score: { type: 'number', description: 'Overall website quality score 0-100' },
    confidence_score: { type: 'number', description: 'How confident the AI is in this review 0-100' },
    summary: { type: 'string', description: '2-3 sentence executive summary of the website quality' },
    category_scores: {
      type: 'object',
      properties: {
        clarity: { type: 'number' },
        trust: { type: 'number' },
        visual_quality: { type: 'number' },
        structure: { type: 'number' },
        conversion_readiness: { type: 'number' },
        mobile_readiness: { type: 'number' },
        brand_consistency: { type: 'number' },
        service_explanation: { type: 'number' },
        contact_path_quality: { type: 'number' },
        content_quality: { type: 'number' },
        professionalism: { type: 'number' },
        technical_confidence: { type: 'number' },
      },
      required: ['clarity', 'trust', 'visual_quality', 'structure', 'conversion_readiness', 'mobile_readiness', 'brand_consistency', 'service_explanation', 'contact_path_quality', 'content_quality', 'professionalism', 'technical_confidence'],
    },
    strengths: {
      type: 'array',
      items: { type: 'object', properties: { point: { type: 'string' }, detail: { type: 'string' } }, required: ['point', 'detail'] },
      description: 'Top 3-5 strengths of the website',
    },
    weaknesses: {
      type: 'array',
      items: { type: 'object', properties: { point: { type: 'string' }, detail: { type: 'string' }, severity: { type: 'string' } }, required: ['point', 'detail', 'severity'] },
      description: 'Top 3-6 weaknesses ranked by severity (critical/high/medium/low)',
    },
    quick_wins: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 quick improvements that would make immediate impact',
    },
    major_priorities: {
      type: 'array',
      items: { type: 'object', properties: { priority: { type: 'string' }, reason: { type: 'string' }, effort: { type: 'string' } }, required: ['priority', 'reason', 'effort'] },
      description: 'Top 3-5 strategic rebuild priorities with effort level (low/medium/high)',
    },
    package_fit: { type: 'string', description: 'Which Cloz Digital package fits best: Launch Care, Growth Care, Presence Care, or Custom' },
    package_fit_reason: { type: 'string', description: 'Why this package is recommended' },
    opportunity_score: { type: 'number', description: 'Business opportunity score 0-100 for Cloz Digital' },
    urgency_score: { type: 'number', description: 'How urgently the site needs work 0-100' },
    redesign_worthiness: { type: 'number', description: 'How much the site deserves a full redesign 0-100' },
    business_opportunity_notes: { type: 'string', description: 'Notes on the business opportunity for Cloz Digital' },
    recommended_focus: { type: 'string', description: 'The single most important area to focus on' },
    what_matters_most: { type: 'string', description: 'Plain-language summary of what matters most for this business' },
    what_to_fix_first: { type: 'string', description: 'Operator-friendly directive on what to fix first' },
    what_to_sell: { type: 'string', description: 'What Cloz Digital could sell to this client based on the review' },
    copy_weakness_summary: { type: 'string', description: 'Summary of copy/text weaknesses' },
    cta_weakness_summary: { type: 'string', description: 'Summary of call-to-action weaknesses' },
    service_clarity_summary: { type: 'string', description: 'How clearly the site explains its services' },
    visual_hierarchy_summary: { type: 'string', description: 'Assessment of visual hierarchy and layout flow' },
    upsell_recommendations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Upsell opportunities for Cloz Digital',
    },
    maintenance_opportunities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ongoing maintenance opportunities',
    },
    hosting_domain_issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any hosting or domain-related issues observed',
    },
    trust_compliance_gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Trust signals or compliance gaps',
    },
  },
  required: ['overall_score', 'confidence_score', 'summary', 'category_scores', 'strengths', 'weaknesses', 'quick_wins', 'major_priorities', 'package_fit', 'package_fit_reason', 'opportunity_score', 'urgency_score', 'redesign_worthiness', 'recommended_focus'],
};

// ═══════════════════════════════════════════════
// REVIEW MODES — each shapes the system prompt
// ═══════════════════════════════════════════════
const reviewModePrompts = {
  standard: 'Perform a thorough, balanced website review covering all aspects: design, content, UX, conversion, trust, mobile readiness, and technical quality.',
  fast: 'Perform a quick website review focusing on the most impactful issues. Be concise but actionable.',
  deep: 'Perform an extremely detailed deep-dive website review. Leave nothing unexamined. Cover every aspect thoroughly.',
  homepage: 'Focus your review ONLY on the homepage. Analyze the hero section, navigation, value proposition, CTAs, and first impression.',
  redesign: 'Review this website specifically to assess whether it needs a full redesign. Focus on outdated patterns, structural issues, and modernization needs.',
  conversion: 'Focus your review on conversion optimization. Analyze CTAs, forms, trust signals, social proof, pricing presentation, and the path from visitor to customer.',
  trust: 'Focus your review on trust and credibility signals. Analyze testimonials, certifications, about page, team presence, contact information, security indicators, and professional appearance.',
  mobile: 'Focus your review on mobile experience. Analyze responsive behavior, touch targets, mobile navigation, loading patterns, and mobile-specific UX issues.',
  local_business: 'Review this as a local business website. Focus on local SEO signals, Google Maps integration, contact info prominence, service area clarity, reviews/testimonials, and local trust signals.',
  luxury: 'Review this website from a premium/luxury design perspective. Analyze typography, whitespace, imagery quality, animations, brand sophistication, and premium feel.',
  competitor: 'Review this website as a competitor analysis. Focus on what they do well that we should learn from, what they do poorly that we can exploit, and strategic positioning gaps.',
  quick_fix: 'Focus ONLY on quick-fix opportunities. Identify 5-10 changes that could be made in under a day each to meaningfully improve the website.',
  client_report: 'Generate a client-friendly review that could be shared with a business owner. Use accessible language, avoid jargon, and focus on business impact rather than technical details.',
  claude_prompt: 'Focus your analysis on generating the most actionable Claude build prompt. Prioritize specific, implementable improvements and detailed technical direction.',
};

// ═══════════════════════════════════════════════
// BUILD THE REVIEW PROMPT
// ═══════════════════════════════════════════════
function buildReviewPrompt(input) {
  const {
    url, businessName, niche, location, notes, styleDirection,
    budgetLevel, reviewMode, screenshotsUsed
  } = input;

  const modeInstruction = reviewModePrompts[reviewMode] || reviewModePrompts.standard;

  return `You are an expert website auditor and web design consultant working for Cloz Digital, a premium web design studio in Bosnia.

${modeInstruction}

Website to review: ${url}
${businessName ? `Business name: ${businessName}` : ''}
${niche ? `Business niche/category: ${niche}` : ''}
${location ? `Location: ${location}` : ''}
${styleDirection ? `Target style direction: ${styleDirection}` : ''}
${budgetLevel ? `Budget level: ${budgetLevel}` : ''}
${notes ? `Additional context/notes: ${notes}` : ''}
${screenshotsUsed ? `Screenshots were provided for visual reference.` : ''}

IMPORTANT CONTEXT ABOUT CLOZ DIGITAL:
- We offer three main packages: Launch Care (one-time website builds from 800 BAM), Growth Care (ongoing management + growth from 325 BAM/mo), Presence Care (basic maintenance from 217 BAM/mo)
- We specialize in premium, modern, conversion-focused websites for local businesses in Bosnia
- We use React/Next.js, Tailwind CSS, and modern web technologies
- We provide ongoing maintenance, hosting, and domain management
- Our target is local businesses that need professional web presence

SCORING RULES:
- Scores are 0-100
- Be honest and specific — do not inflate scores
- A score of 50 means "mediocre, needs significant work"
- A score of 70 means "acceptable but clear room for improvement"
- A score of 85+ means "genuinely good"
- A score below 40 means "seriously problematic"

Provide your analysis in the exact JSON schema requested. Be specific, actionable, and honest. Every recommendation should be something a developer could act on.`;
}

// ═══════════════════════════════════════════════
// BUILD CLAUDE PROMPTS
// ═══════════════════════════════════════════════
function buildClaudePromptInstruction(input, promptType) {
  const { url, businessName, niche, location, styleDirection, budgetLevel } = input;

  const baseContext = `Website: ${url}
${businessName ? `Business: ${businessName}` : ''}
${niche ? `Niche: ${niche}` : ''}
${location ? `Location: ${location}` : ''}
${styleDirection ? `Style direction: ${styleDirection}` : ''}
${budgetLevel ? `Budget: ${budgetLevel}` : ''}`;

  const promptTypes = {
    short: `Generate a concise Claude prompt (200-400 words) that tells Claude Code exactly what to build or fix for this website. Include the key issues found, the priority improvements, and specific implementation direction. The prompt should be copy-paste ready.`,

    detailed: `Generate a detailed Claude prompt (500-900 words) that gives Claude Code comprehensive direction on what to build or improve. Include: business context, current site problems, priority fixes, design direction, technical requirements, and specific component/page instructions. The prompt should be immediately usable in Claude Code.`,

    full_rebuild: `Generate a comprehensive full-rebuild Claude prompt (800-1500 words) that tells Claude Code to build this website from scratch. Include: complete project brief, tech stack requirements, page-by-page specifications, design system direction, content structure, SEO requirements, mobile strategy, and deployment notes. This should be a complete project kickoff prompt.`,

    homepage: `Generate a Claude prompt specifically for redesigning the homepage only. Include hero section, navigation, value proposition, CTAs, social proof, and visual direction.`,

    design: `Generate a Claude prompt focused purely on design improvements. Include color palette, typography, spacing, imagery, layout, and visual hierarchy changes.`,

    copy_rewrite: `Generate a Claude prompt focused on rewriting all website copy. Include messaging strategy, tone of voice, headline improvements, CTA optimization, and content structure.`,

    conversion: `Generate a Claude prompt focused on conversion optimization. Include CTA improvements, form optimization, trust signal additions, social proof integration, and funnel improvements.`,

    trust: `Generate a Claude prompt focused on improving trust and credibility. Include testimonials, certifications, about page, team presence, security, and professional appearance.`,

    mobile: `Generate a Claude prompt focused on mobile experience improvements. Include responsive design fixes, mobile navigation, touch targets, and mobile-specific features.`,

    premium_redesign: `Generate a Claude prompt for a premium luxury-level redesign. Include high-end typography, sophisticated animations, premium imagery, whitespace usage, and brand elevation.`,
  };

  return `Based on your website review analysis, generate a high-quality Claude Code prompt.

${promptTypes[promptType] || promptTypes.detailed}

Context about the website being reviewed:
${baseContext}

PROMPT QUALITY RULES:
- The prompt must be explicit and implementation-ready
- Describe what is currently wrong (based on your review findings)
- State exactly what Claude should build or fix
- Include specific technical direction (React, Tailwind, etc.)
- Avoid vague hype language — be direct and actionable
- Structure the prompt so Claude can immediately start working
- Include the business context so Claude understands the purpose
- The output should be plain text that can be directly copied into Claude Code

Return the prompt as a plain text string in the JSON field.`;
}

// ═══════════════════════════════════════════════
// MAIN REVIEW ENDPOINT
// ═══════════════════════════════════════════════
router.post('/review', async (req, res) => {
  const { url, businessName, niche, location, notes, styleDirection, budgetLevel, reviewMode } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    const provider = getActiveProvider();
    const reviewPrompt = buildReviewPrompt(req.body);

    // Step 1: Get structured review
    const reviewResult = await provider.generateStructured(
      reviewPrompt,
      reviewSchema,
      { temperature: 0.3, maxTokens: 8192, timeout: 90000, task: 'audit-review' }
    );

    if (!reviewResult.data) {
      throw new Error('Failed to parse structured review response');
    }

    // Step 2: Generate Claude prompts
    const claudePromptSchema = {
      type: 'object',
      properties: {
        claude_prompt_short: { type: 'string', description: 'Short Claude build prompt (200-400 words)' },
        claude_prompt_detailed: { type: 'string', description: 'Detailed Claude build prompt (500-900 words)' },
        claude_prompt_full_rebuild: { type: 'string', description: 'Full rebuild Claude prompt (800-1500 words)' },
      },
      required: ['claude_prompt_short', 'claude_prompt_detailed', 'claude_prompt_full_rebuild'],
    };

    const reviewSummaryForClaude = `Review findings for ${url}:
Overall score: ${reviewResult.data.overall_score}/100
Key weaknesses: ${(reviewResult.data.weaknesses || []).map(w => w.point).join(', ')}
Quick wins: ${(reviewResult.data.quick_wins || []).join(', ')}
Major priorities: ${(reviewResult.data.major_priorities || []).map(p => p.priority).join(', ')}
Recommended focus: ${reviewResult.data.recommended_focus || 'General improvement'}
Package fit: ${reviewResult.data.package_fit || 'Launch Care'}`;

    const claudePromptResult = await provider.generateStructured(
      `${reviewSummaryForClaude}\n\n${buildClaudePromptInstruction(req.body, 'short')}\n\nAlso generate a detailed version and a full rebuild version. All three should be different levels of detail for the same website.`,
      claudePromptSchema,
      { temperature: 0.5, maxTokens: 8192, timeout: 90000, task: 'audit-prompt-generation' }
    );

    // Merge results
    const fullReview = {
      ...reviewResult.data,
      ...(claudePromptResult.data || {}),
      website_url: url,
      business_name: businessName || '',
      niche: niche || '',
      location: location || '',
      review_mode: reviewMode || 'standard',
      created_at: new Date().toISOString(),
      latencyMs: reviewResult.latencyMs + (claudePromptResult.latencyMs || 0),
    };

    addLog('info', `Website review completed: ${url} — Score: ${fullReview.overall_score}/100 (${reviewResult.latencyMs + (claudePromptResult.latencyMs || 0)}ms)`);
    res.json({ review: fullReview });

  } catch (e) {
    addLog('error', `Website review failed for ${url}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════
// GENERATE SPECIFIC CLAUDE PROMPT VARIANT
// ═══════════════════════════════════════════════
router.post('/review/prompt', async (req, res) => {
  const { reviewData, promptType, url, businessName, niche, location, styleDirection, budgetLevel } = req.body;

  if (!promptType) return res.status(400).json({ error: 'promptType is required' });

  try {
    const provider = getActiveProvider();

    const reviewContext = reviewData
      ? `Previous review findings:\nOverall score: ${reviewData.overall_score}/100\nWeaknesses: ${(reviewData.weaknesses || []).map(w => w.point).join(', ')}\nPriorities: ${(reviewData.major_priorities || []).map(p => p.priority).join(', ')}\nRecommended focus: ${reviewData.recommended_focus}\n`
      : '';

    const schema = {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The generated Claude prompt' },
        prompt_type: { type: 'string' },
        target_description: { type: 'string', description: 'One-line description of what this prompt targets' },
      },
      required: ['prompt', 'prompt_type', 'target_description'],
    };

    const result = await provider.generateStructured(
      `${reviewContext}\n${buildClaudePromptInstruction({ url, businessName, niche, location, styleDirection, budgetLevel }, promptType)}`,
      schema,
      { temperature: 0.5, maxTokens: 6144, timeout: 60000, task: 'audit-prompt-generation' }
    );

    res.json(result.data || { prompt: result.text, prompt_type: promptType, target_description: '' });

  } catch (e) {
    addLog('error', `Claude prompt generation failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

export default router;
