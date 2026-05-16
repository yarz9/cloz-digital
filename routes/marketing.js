// routes/marketing.js — Growth & Marketing Operating System
// All endpoints AI-powered, using the existing provider.

import { Router } from 'express';
import { getActiveProvider } from '../providers/index.js';
import { logInfo, logError } from '../services/logger.js';

const router = Router();

function getConfig() {
  return { maxTokens: 4096, timeout: 60000 };
}

// ── Operator persona injection ──
function operatorContext(operator) {
  if (operator === 'denis') {
    return `You are advising Denis, Cloz Digital's marketing and client-success lead. Emphasize SEO opportunities, content output, outreach response rates, campaign performance, and lead quality. Be practical and tactical.`;
  }
  if (operator === 'anes') {
    return `You are advising Anes, Cloz Digital's technical co-founder. Emphasize engineering velocity, product decisions, system reliability, automation opportunities, and design quality. Be direct.`;
  }
  return `You are advising the Cloz Digital team.`;
}

// ══════════════════════════════════════════════════════════════
//  KEYWORD RESEARCH & CLUSTERING
// ══════════════════════════════════════════════════════════════

router.post('/keywords', async (req, res) => {
  const { seed, market = 'Bosnia and Herzegovina', language = 'English' } = req.body;
  if (!seed) return res.status(400).json({ error: 'seed required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        clusters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              theme: { type: 'string' },
              intent: { type: 'string', enum: ['informational', 'commercial', 'transactional', 'navigational'] },
              keywords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    intent: { type: 'string' },
                    difficulty: { type: 'number', description: '0-100 estimated' },
                    opportunity_score: { type: 'number', description: '0-100 — high = good for Cloz Digital' },
                    notes: { type: 'string' },
                  },
                  required: ['keyword', 'opportunity_score'],
                },
              },
              recommended_content_type: { type: 'string', description: 'e.g. service page, blog post, comparison' },
            },
            required: ['theme', 'intent', 'keywords'],
          },
        },
        priority_recommendation: { type: 'string' },
      },
      required: ['clusters'],
    };

    const prompt = `You are an SEO strategist for Cloz Digital, a premium web design agency in Bosnia.

Generate 3-5 keyword clusters around the seed topic: "${seed}".
Target market: ${market}. Primary language: ${language}.

For each cluster:
- Group 5-8 keywords by shared search intent
- Estimate difficulty (0-100) based on competition for a small agency
- Score opportunity (0-100): high = realistic to rank for AND likely to convert
- Recommend the right content format

Focus on keywords that would attract small/medium businesses seeking web design, redesigns, hosting, or SEO services. Include local variants where useful.

Finish with a one-paragraph priority recommendation.`;

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.6, task: 'content-generate',
    });
    logInfo(`Keyword research: ${seed}`, { category: 'ai', event_type: 'marketing_keywords' });
    res.json(result);
  } catch (e) {
    logError(`Keyword research failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  SERP INTENT ANALYSIS
// ══════════════════════════════════════════════════════════════

router.post('/serp-intent', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        primary_intent: { type: 'string', enum: ['informational', 'commercial', 'transactional', 'navigational', 'mixed'] },
        searcher_goal: { type: 'string' },
        expected_serp_features: { type: 'array', items: { type: 'string' } },
        content_format: { type: 'string' },
        ideal_word_count: { type: 'number' },
        must_cover_topics: { type: 'array', items: { type: 'string' } },
        local_intent: { type: 'boolean' },
        commercial_intent_score: { type: 'number', description: '0-100' },
      },
      required: ['primary_intent', 'searcher_goal', 'must_cover_topics'],
    };
    const prompt = `Analyze the search intent for the query: "${keyword}".
Target market: Bosnia and Herzegovina (BAM).

Provide a detailed breakdown of what searchers actually want, expected SERP features (featured snippet, local pack, video, etc.), the best content format to compete, and topics that must be covered.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.3, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  BLOG TOPICS & CONTENT BRIEFS
// ══════════════════════════════════════════════════════════════

router.post('/blog-topics', async (req, res) => {
  const { theme, count = 8, language = 'English' } = req.body;
  if (!theme) return res.status(400).json({ error: 'theme required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        topics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              angle: { type: 'string' },
              target_keyword: { type: 'string' },
              search_intent: { type: 'string' },
              estimated_traffic_value: { type: 'string', enum: ['low', 'medium', 'high'] },
              content_format: { type: 'string' },
              cluster: { type: 'string' },
            },
            required: ['title', 'angle', 'target_keyword'],
          },
        },
      },
      required: ['topics'],
    };
    const prompt = `Generate ${count} blog post ideas for Cloz Digital around the theme "${theme}".

Each topic should:
- Attract small/medium businesses considering web design, hosting, or maintenance services
- Have a clear angle (problem → solution, comparison, case study, tutorial, etc.)
- Map to a realistic target keyword
- Estimate traffic value (low/medium/high) honestly

Language: ${language}. Bias toward topics that demonstrate Cloz Digital's expertise without being self-promotional.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.8, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/content-brief', async (req, res) => {
  const { title, targetKeyword, audience = 'small business owners' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        meta_title: { type: 'string', description: 'SEO title under 60 chars' },
        meta_description: { type: 'string', description: 'Under 160 chars' },
        primary_keyword: { type: 'string' },
        secondary_keywords: { type: 'array', items: { type: 'string' } },
        outline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              level: { type: 'string', enum: ['h2', 'h3'] },
              bullets: { type: 'array', items: { type: 'string' } },
            },
            required: ['heading'],
          },
        },
        faq_section: {
          type: 'array',
          items: {
            type: 'object',
            properties: { question: { type: 'string' }, answer: { type: 'string' } },
            required: ['question', 'answer'],
          },
        },
        internal_link_suggestions: { type: 'array', items: { type: 'string' } },
        cta_strategy: { type: 'string' },
        target_word_count: { type: 'number' },
      },
      required: ['meta_title', 'meta_description', 'outline'],
    };
    const prompt = `Create a complete SEO content brief for the article: "${title}".
${targetKeyword ? `Target keyword: ${targetKeyword}` : ''}
Audience: ${audience}.
Brand: Cloz Digital (premium web design agency in Bosnia).

Include: meta title and description, full H2/H3 outline with bullet points per section, an FAQ section (3-5 Q&A for FAQ schema), internal link suggestions to /services, /packages, /contact, a CTA strategy, and target word count.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.5, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  GOOGLE ADS CAMPAIGN BUILDER
// ══════════════════════════════════════════════════════════════

router.post('/google-ads', async (req, res) => {
  const { service, location = 'Sarajevo, Bosnia', budget = 100, language = 'English' } = req.body;
  if (!service) return res.status(400).json({ error: 'service required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        campaign_name: { type: 'string' },
        objective: { type: 'string' },
        recommended_budget: { type: 'string' },
        ad_groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              theme: { type: 'string' },
              keywords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    match_type: { type: 'string', enum: ['exact', 'phrase', 'broad'] },
                  },
                  required: ['keyword', 'match_type'],
                },
              },
              negative_keywords: { type: 'array', items: { type: 'string' } },
              responsive_search_ad: {
                type: 'object',
                properties: {
                  headlines: { type: 'array', items: { type: 'string' }, description: '10-15 headlines under 30 chars each' },
                  descriptions: { type: 'array', items: { type: 'string' }, description: '3-4 descriptions under 90 chars each' },
                  final_url: { type: 'string' },
                  display_path: { type: 'array', items: { type: 'string' } },
                },
                required: ['headlines', 'descriptions'],
              },
              landing_page: { type: 'string' },
            },
            required: ['name', 'keywords', 'responsive_search_ad'],
          },
        },
        landing_page_recommendations: { type: 'array', items: { type: 'string' } },
        tracking_setup: { type: 'array', items: { type: 'string' } },
      },
      required: ['campaign_name', 'ad_groups'],
    };
    const prompt = `Build a complete Google Ads search campaign for Cloz Digital, a premium web design agency in Bosnia.

Service to promote: ${service}
Target location: ${location}
Monthly budget: ${budget} EUR (or BAM equivalent)
Ad language: ${language}

Create 2-3 ad groups, each with 8-12 high-intent keywords (mix of exact, phrase, and broad match modifier), a list of strong negative keywords (jobs, free, courses, etc.), and one fully-built Responsive Search Ad (15 headlines max 30 chars, 4 descriptions max 90 chars).

Landing page recommendations should map each ad group to a specific page (/contact, /packages, /services).
Include essential tracking setup items.

Be realistic about budget allocation in BAM. Avoid generic agency copy.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.6, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  META ADS CAMPAIGN BUILDER
// ══════════════════════════════════════════════════════════════

router.post('/meta-ads', async (req, res) => {
  const { offer, audience = 'small business owners', budget = 100, platform = 'Instagram & Facebook' } = req.body;
  if (!offer) return res.status(400).json({ error: 'offer required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        campaign_name: { type: 'string' },
        objective: { type: 'string', enum: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Conversions'] },
        recommended_budget: { type: 'string' },
        audiences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['core', 'lookalike', 'retargeting'] },
              targeting: { type: 'string' },
              estimated_size: { type: 'string' },
            },
            required: ['name', 'type', 'targeting'],
          },
        },
        ad_variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variant_name: { type: 'string' },
              hook: { type: 'string' },
              primary_text: { type: 'string', description: '90-180 chars' },
              headline: { type: 'string', description: 'Under 40 chars' },
              description: { type: 'string', description: 'Under 30 chars' },
              cta_button: { type: 'string', enum: ['Learn More', 'Get Quote', 'Sign Up', 'Contact Us', 'Get Offer', 'Book Now'] },
              creative_direction: { type: 'string' },
            },
            required: ['variant_name', 'hook', 'primary_text', 'headline', 'cta_button'],
          },
        },
        creative_recommendations: { type: 'array', items: { type: 'string' } },
        budget_allocation: { type: 'string' },
      },
      required: ['campaign_name', 'audiences', 'ad_variants'],
    };
    const prompt = `Build a complete Meta Ads campaign (Facebook + Instagram) for Cloz Digital.

Offer: ${offer}
Audience focus: ${audience}
Monthly budget: ${budget} EUR
Platform: ${platform}

Create:
- 3 audience definitions: a core audience, a lookalike audience, a retargeting audience
- 3 ad variants with distinct hooks (problem-focused, social proof, offer-focused) — primary text, headline, description, CTA, and a one-line creative direction for the visual
- Creative recommendations for the Cloz Content Studio
- Budget allocation between audiences

Be specific about targeting (interests, behaviors, demographics for Bosnia and Balkans).`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.65, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  LANDING PAGE CRITIQUE
// ══════════════════════════════════════════════════════════════

router.post('/landing-critique', async (req, res) => {
  const { url, copy, goal } = req.body;
  if (!url && !copy) return res.status(400).json({ error: 'url or copy required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        overall_score: { type: 'number', description: '0-100' },
        clarity_score: { type: 'number' },
        cta_score: { type: 'number' },
        trust_score: { type: 'number' },
        social_proof_score: { type: 'number' },
        readability_score: { type: 'number' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        priority_fixes: { type: 'array', items: { type: 'string' } },
        ab_test_ideas: { type: 'array', items: { type: 'string' } },
        rewritten_hero: { type: 'string', description: 'Improved hero headline + subhead' },
        verdict: { type: 'string' },
      },
      required: ['overall_score', 'priority_fixes', 'ab_test_ideas', 'verdict'],
    };
    const prompt = `You are a senior conversion-rate optimization specialist. Critique this landing page.

${url ? `URL: ${url}` : ''}
${copy ? `Copy provided:\n${copy}` : ''}
${goal ? `Conversion goal: ${goal}` : 'Conversion goal: collect qualified leads'}

Score 0-100 on clarity, CTA strength, trust, social proof, readability, and overall. List concrete strengths, weaknesses, priority fixes, A/B test ideas, and a rewritten hero section.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.4, task: 'audit-review' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  LOCAL SEO — Google Business Profile checklist + tactics
// ══════════════════════════════════════════════════════════════

router.post('/local-seo', async (req, res) => {
  const { businessName = 'Cloz Digital', city = 'Sarajevo', category = 'web design agency' } = req.body;
  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        gbp_checklist: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string' },
              priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              why_it_matters: { type: 'string' },
            },
            required: ['item', 'priority'],
          },
        },
        citation_targets: { type: 'array', items: { type: 'string' } },
        local_keywords: { type: 'array', items: { type: 'string' } },
        review_acquisition_plan: { type: 'array', items: { type: 'string' } },
        review_response_templates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scenario: { type: 'string' },
              template: { type: 'string' },
            },
            required: ['scenario', 'template'],
          },
        },
        nap_consistency_notes: { type: 'string' },
      },
      required: ['gbp_checklist', 'local_keywords', 'review_acquisition_plan'],
    };
    const prompt = `Build a complete local SEO action plan for "${businessName}", a ${category} based in ${city} (Bosnia and Herzegovina).

Provide:
- A prioritized Google Business Profile checklist (12-18 items)
- Citation targets relevant to BA/Balkans
- 15 local keywords to target
- Review acquisition plan (how to ethically get more 5-star reviews)
- Response templates for 5 common review scenarios (5-star, mixed, negative, complaint about timing, complaint about pricing)
- NAP (Name/Address/Phone) consistency notes for a Bosnia-based service business

Be specific to the Balkan market.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.4, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  TECHNICAL SEO AUDIT (heuristic — without crawling)
// ══════════════════════════════════════════════════════════════

router.post('/seo-audit', async (req, res) => {
  const { url, businessContext } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        executive_summary: { type: 'string' },
        priority_issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              issue: { type: 'string' },
              impact: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              fix: { type: 'string' },
            },
            required: ['category', 'issue', 'impact', 'fix'],
          },
        },
        quick_wins: { type: 'array', items: { type: 'string' } },
        schema_recommendations: { type: 'array', items: { type: 'string' } },
        internal_linking_suggestions: { type: 'array', items: { type: 'string' } },
        content_gaps: { type: 'array', items: { type: 'string' } },
        next_30_days: { type: 'array', items: { type: 'string' } },
      },
      required: ['executive_summary', 'priority_issues', 'quick_wins'],
    };
    const prompt = `Generate a structured technical SEO action plan for the website: ${url}
${businessContext ? `Business context: ${businessContext}` : ''}

Without crawling the live site, produce the realistic priority issues a competent auditor would flag for a small-business website, including: technical (speed, mobile, indexing, schema), on-page (titles, meta, headings, content), off-page (backlinks, citations), and content gaps relevant to the inferred business type.

Be specific and actionable. Group by impact level.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.4, task: 'audit-review' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  COMPETITOR GAP ANALYSIS
// ══════════════════════════════════════════════════════════════

router.post('/competitor-analysis', async (req, res) => {
  const { competitors = [], ourPosition } = req.body;
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return res.status(400).json({ error: 'competitors array required' });
  }

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        market_overview: { type: 'string' },
        competitors_analysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              positioning: { type: 'string' },
            },
            required: ['name', 'strengths', 'weaknesses'],
          },
        },
        content_gaps: { type: 'array', items: { type: 'string' } },
        keyword_gaps: { type: 'array', items: { type: 'string' } },
        differentiation_opportunities: { type: 'array', items: { type: 'string' } },
        recommended_actions: { type: 'array', items: { type: 'string' } },
      },
      required: ['market_overview', 'competitors_analysis', 'recommended_actions'],
    };
    const prompt = `Analyze these competitors for Cloz Digital (premium web design agency in Bosnia).

Competitors: ${competitors.map(c => `"${c}"`).join(', ')}
${ourPosition ? `Our positioning: ${ourPosition}` : ''}

For each: list realistic strengths and weaknesses, positioning, then identify content gaps, keyword gaps, differentiation opportunities, and concrete recommended actions for Cloz Digital. Be honest about competitor strengths.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.5, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  PERSONALIZED DAILY BRIEFING
// ══════════════════════════════════════════════════════════════

router.post('/daily-briefing', async (req, res) => {
  const { operator = 'team', context = {} } = req.body;

  try {
    const provider = getActiveProvider();
    const persona = operatorContext(operator);
    const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `${persona}

Today's date: ${date}

Live business state:
- Clients: ${context.clients || 0}
- MRR: ${context.mrr || 0} BAM
- Open invoices: ${context.openInvoices || 0}
- Pipeline value: ${context.pipelineValue || 0} BAM
- Active leads: ${context.leads || 0}
- Pending tasks: ${context.openTasks || 0}
- Recent activity: ${context.recentActivity || 'none'}

Generate a concise personalized briefing for today. Structure:

TODAY'S PRIORITIES (3 max):
…

WHAT WAS COMPLETED RECENTLY:
…

RISKS:
…

OPPORTUNITIES:
…

RECOMMENDED ACTIONS:
…

Be direct, no fluff, role-specific advice.`;

    const result = await provider.generate(prompt, { temperature: 0.4, maxTokens: 1500, task: 'dashboard-briefing' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  AI MARKETING INSIGHTS
// ══════════════════════════════════════════════════════════════

router.post('/insights', async (req, res) => {
  const { kind = 'opportunities', context = {} } = req.body;

  try {
    const provider = getActiveProvider();
    const kindPrompts = {
      opportunities: 'Identify 5 specific marketing opportunities Cloz Digital should pursue this month. Include effort, expected impact, and timeline for each.',
      seo_priorities: 'List the top 7 SEO priorities Cloz Digital should focus on, ranked by ROI for a small agency.',
      content_plan: 'Build a 4-week content calendar with 2 posts per week covering web design, SEO, and small-business topics in Bosnia.',
      campaign_ideas: 'Suggest 5 paid campaign concepts (Google + Meta) Cloz Digital could run with realistic budgets in BAM.',
      forecasting: 'Forecast the next 90 days of marketing performance and lead generation for Cloz Digital given current MRR and pipeline.',
      trends: 'Identify trends in web design, SEO, and AI that Cloz Digital should ride or react to this quarter.',
    };
    const detail = kindPrompts[kind] || kindPrompts.opportunities;

    const prompt = `You are a senior growth marketing consultant for Cloz Digital, a premium web design agency in Bosnia.

Current state: ${JSON.stringify(context).slice(0, 1500)}

Task: ${detail}

Be specific, practical, and Bosnia-aware. Use BAM where money is mentioned. Avoid generic advice.`;

    const result = await provider.generate(prompt, { temperature: 0.6, maxTokens: 2500, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  WEEKLY / MONTHLY REPORT GENERATOR
// ══════════════════════════════════════════════════════════════

router.post('/marketing-report', async (req, res) => {
  const { period = 'weekly', context = {} } = req.body;

  try {
    const provider = getActiveProvider();
    const prompt = `Generate a ${period} marketing report for Cloz Digital.

Live data:
${JSON.stringify(context).slice(0, 2000)}

Format the report with clear sections:
1. Executive Summary (3-4 sentences)
2. Key Metrics Snapshot
3. Wins
4. Concerns
5. SEO & Content Performance
6. Lead Pipeline
7. Recommended Next Steps
8. Forecast for next ${period === 'weekly' ? '7 days' : '30 days'}

Be concise, candid, and concrete. Use BAM currency.`;

    const result = await provider.generate(prompt, { temperature: 0.4, maxTokens: 2500, task: 'dashboard-briefing' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  CTA TESTING IDEAS
// ══════════════════════════════════════════════════════════════

router.post('/cta-ideas', async (req, res) => {
  const { current, context } = req.body;
  if (!current) return res.status(400).json({ error: 'current CTA required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              angle: { type: 'string' },
              ctr_prediction: { type: 'string', enum: ['lower', 'similar', 'higher', 'much higher'] },
              rationale: { type: 'string' },
            },
            required: ['text', 'angle', 'ctr_prediction'],
          },
        },
        winner_pick: { type: 'string' },
      },
      required: ['variants'],
    };
    const prompt = `Generate 8 alternative CTA texts for testing.
Current CTA: "${current}"
${context ? `Context: ${context}` : ''}

Vary the angle (action, benefit, urgency, social proof, low-risk, specificity, curiosity, premium framing). Predict relative CTR vs current.`;

    const result = await provider.generateStructured(prompt, schema, { ...getConfig(), temperature: 0.8, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
