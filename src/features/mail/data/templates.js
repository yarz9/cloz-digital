// ══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATES & SNIPPETS
// ══════════════════════════════════════════════════════════════

export const EMAIL_TEMPLATES = [
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    category: 'sales',
    defaultSender: 'anes',
    subject: 'Quick question about {{company_name}}\'s website',
    html: `<p>Hi {{client_name}},</p>
<p>I noticed {{company_name}}'s website and wanted to reach out. We help businesses like yours improve their online presence with modern, fast-loading websites that convert visitors into customers.</p>
<p>Would you be open to a quick 10-minute chat this week?</p>
<p>Looking forward to hearing from you.</p>`,
  },
  {
    id: 'follow-up',
    name: 'Follow-Up',
    category: 'sales',
    defaultSender: 'anes',
    subject: 'Following up — {{company_name}}',
    html: `<p>Hi {{client_name}},</p>
<p>I wanted to follow up on my previous email. I understand you're busy, but I believe we could really help {{company_name}} with:</p>
<ul>
  <li>Modern website redesign</li>
  <li>Faster page load speeds</li>
  <li>Better mobile experience</li>
</ul>
<p>Would 15 minutes this week work for a quick call?</p>`,
  },
  {
    id: 'welcome',
    name: 'Welcome / Onboarding',
    category: 'onboarding',
    defaultSender: 'general',
    subject: 'Welcome to Cloz Digital — Let\'s get started!',
    html: `<p>Hi {{client_name}},</p>
<p>Welcome aboard! We're thrilled to have {{company_name}} as a client.</p>
<p>Here's what happens next:</p>
<ol>
  <li><strong>Kickoff Call</strong> — We'll schedule a brief call to align on goals</li>
  <li><strong>Design Phase</strong> — Our team creates mockups for your review</li>
  <li><strong>Development</strong> — We build your site with regular updates</li>
  <li><strong>Launch</strong> — Go live with ongoing support</li>
</ol>
<p>If you have any questions at all, don't hesitate to reach out.</p>`,
  },
  {
    id: 'proposal',
    name: 'Proposal Delivery',
    category: 'sales',
    defaultSender: 'anes',
    subject: 'Your website proposal — {{company_name}}',
    html: `<p>Hi {{client_name}},</p>
<p>As discussed, I've prepared a proposal for {{company_name}}'s new website. Please find the details below.</p>
<p><strong>Project Summary:</strong></p>
<ul>
  <li>Modern responsive website design</li>
  <li>SEO-optimized structure</li>
  <li>Mobile-first approach</li>
  <li>Content management system</li>
  <li>12 months hosting included</li>
</ul>
<p><strong>Investment:</strong> €{{amount}}</p>
<p>I'd love to walk through this with you. When works best for a quick call?</p>`,
  },
  {
    id: 'meeting-confirmation',
    name: 'Meeting Confirmation',
    category: 'general',
    defaultSender: 'denis',
    subject: 'Confirmed: Our call on {{date}}',
    html: `<p>Hi {{client_name}},</p>
<p>This is to confirm our call scheduled for <strong>{{date}}</strong>.</p>
<p>Looking forward to connecting with you then. If you need to reschedule, just let me know.</p>`,
  },
  {
    id: 'invoice',
    name: 'Invoice',
    category: 'billing',
    defaultSender: 'billing',
    subject: 'Invoice #{{invoice_number}} — {{company_name}}',
    html: `<p>Hi {{client_name}},</p>
<p>Please find attached invoice <strong>#{{invoice_number}}</strong> for your recent services.</p>
<p><strong>Amount Due:</strong> €{{amount}}<br/>
<strong>Due Date:</strong> {{due_date}}</p>
<p>Payment can be made via bank transfer. Please use the invoice number as your payment reference.</p>
<p>If you have any questions about this invoice, please don't hesitate to contact us.</p>`,
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    category: 'billing',
    defaultSender: 'billing',
    subject: 'Friendly reminder: Invoice #{{invoice_number}}',
    html: `<p>Hi {{client_name}},</p>
<p>I hope this message finds you well. This is a friendly reminder that invoice <strong>#{{invoice_number}}</strong> for <strong>€{{amount}}</strong> is now due.</p>
<p>If you've already sent the payment, please disregard this message. Otherwise, we'd appreciate it if you could process it at your earliest convenience.</p>
<p>Please let us know if you have any questions.</p>`,
  },
  {
    id: 'maintenance-report',
    name: 'Maintenance Report',
    category: 'support',
    defaultSender: 'general',
    subject: 'Monthly Maintenance Report — {{company_name}}',
    html: `<p>Hi {{client_name}},</p>
<p>Here's your monthly website maintenance report for {{company_name}}:</p>
<p><strong>Completed this month:</strong></p>
<ul>
  <li>Security updates applied</li>
  <li>Plugin/theme updates</li>
  <li>Performance optimization</li>
  <li>Backup verification</li>
  <li>Uptime monitoring: 99.9%</li>
</ul>
<p><strong>Recommendations:</strong></p>
<ul>
  <li>[Add recommendations here]</li>
</ul>
<p>Your website is running smoothly. Let us know if you need anything!</p>`,
  },
  {
    id: 'support-reply',
    name: 'Support Reply',
    category: 'support',
    defaultSender: 'denis',
    subject: 'Re: {{original_subject}}',
    html: `<p>Hi {{client_name}},</p>
<p>Thank you for reaching out. I've looked into your request and here's what I found:</p>
<p>[Your response here]</p>
<p>Please let me know if you need anything else. Happy to help!</p>`,
  },
  {
    id: 're-engagement',
    name: 'Re-engagement',
    category: 'sales',
    defaultSender: 'anes',
    subject: 'It\'s been a while — {{company_name}}',
    html: `<p>Hi {{client_name}},</p>
<p>It's been a while since we last connected, and I wanted to check in. How's everything going with {{company_name}}?</p>
<p>Since we last spoke, we've added some exciting new capabilities:</p>
<ul>
  <li>AI-powered website content</li>
  <li>Advanced analytics dashboards</li>
  <li>Faster page speeds with new infrastructure</li>
</ul>
<p>Would you be interested in catching up over a quick call?</p>`,
  },
]

export const SNIPPETS = [
  {
    id: 'greeting-formal',
    name: 'Formal Greeting',
    category: 'greeting',
    trigger: '/greeting',
    html: `<p>Dear {{client_name}},</p><p>I hope this email finds you well.</p>`,
  },
  {
    id: 'greeting-casual',
    name: 'Casual Greeting',
    category: 'greeting',
    trigger: '/hi',
    html: `<p>Hi {{client_name}},</p><p>Hope you're doing great!</p>`,
  },
  {
    id: 'cta-call',
    name: 'CTA — Schedule Call',
    category: 'cta',
    trigger: '/cta-call',
    html: `<div style="margin:24px 0;text-align:center"><a href="https://calendly.com/cloz-digital" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Schedule a Free Call</a></div>`,
  },
  {
    id: 'cta-website',
    name: 'CTA — View Website',
    category: 'cta',
    trigger: '/cta-web',
    html: `<div style="margin:24px 0;text-align:center"><a href="https://www.cloz.digital" style="display:inline-block;background:#3B82F6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Visit Our Website</a></div>`,
  },
  {
    id: 'contact-block',
    name: 'Contact Block',
    category: 'blocks',
    trigger: '/contact',
    html: `<div style="margin:20px 0;padding:16px;background:#F3F4F6;border-radius:8px;font-size:13px;line-height:1.6">
  <div style="font-weight:600;margin-bottom:8px">Get in Touch</div>
  <div>Email: general@cloz.digital</div>
  <div>Web: www.cloz.digital</div>
</div>`,
  },
  {
    id: 'payment-instructions',
    name: 'Payment Instructions',
    category: 'billing',
    trigger: '/payment',
    html: `<div style="margin:20px 0;padding:16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:12px;line-height:1.6;color:#92400E">
  <div style="font-weight:600;margin-bottom:8px">Payment Instructions</div>
  <div>Bank transfer (EUR) — Please use invoice number as reference</div>
  <div style="margin-top:4px">Questions? billing@cloz.digital</div>
</div>`,
  },
  {
    id: 'social-links',
    name: 'Social Links',
    category: 'blocks',
    trigger: '/social',
    html: `<div style="margin:20px 0;text-align:center;font-size:13px;color:#6B7280">
  <a href="https://www.cloz.digital" style="color:#3B82F6;text-decoration:none;margin:0 8px">Website</a>
  <span style="color:#D1D5DB">|</span>
  <a href="#" style="color:#3B82F6;text-decoration:none;margin:0 8px">LinkedIn</a>
  <span style="color:#D1D5DB">|</span>
  <a href="#" style="color:#3B82F6;text-decoration:none;margin:0 8px">Instagram</a>
</div>`,
  },
  {
    id: 'meeting-link',
    name: 'Meeting Link',
    category: 'blocks',
    trigger: '/meeting',
    html: `<p>Here's the link to join our meeting: <a href="https://meet.google.com" style="color:#3B82F6">Join Meeting</a></p>`,
  },
]

export const MERGE_TAGS = [
  { tag: '{{client_name}}', label: 'Client Name', example: 'John' },
  { tag: '{{company_name}}', label: 'Company Name', example: 'Acme Inc.' },
  { tag: '{{invoice_number}}', label: 'Invoice Number', example: 'INV-2024-001' },
  { tag: '{{amount}}', label: 'Amount', example: '500' },
  { tag: '{{due_date}}', label: 'Due Date', example: '15 Jun 2024' },
  { tag: '{{date}}', label: 'Date', example: 'Monday, 3pm' },
  { tag: '{{sender_name}}', label: 'Sender Name', example: 'Anes D.' },
  { tag: '{{original_subject}}', label: 'Original Subject', example: '' },
]
