import { Mail, MapPin, Clock } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Contact</span>
            <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">Let's talk about your project.</h1>
            <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">Tell us about your business. We'll respond within 24 hours with an honest assessment of how we can help.</p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-accent mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-medium">Email</h3>
                  <p className="text-[13px] text-text-secondary">hello@clozdigital.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-accent mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-medium">Location</h3>
                  <p className="text-[13px] text-text-secondary">Bosnia and Herzegovina</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-accent mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-medium">Response Time</h3>
                  <p className="text-[13px] text-text-secondary">Within 24 hours, usually same day</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Name</label>
                  <input type="text" placeholder="Your name" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Email</label>
                  <input type="email" placeholder="you@business.com" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Business Name</label>
                <input type="text" placeholder="Your business" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Current Website</label>
                <input type="url" placeholder="https:// (if you have one)" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">What do you need?</label>
                <select className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] text-text-secondary focus:border-accent focus:outline-none transition-colors">
                  <option>New website</option>
                  <option>Website redesign</option>
                  <option>Hosting & domain setup</option>
                  <option>Ongoing maintenance</option>
                  <option>Care plan</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">Tell us more</label>
                <textarea rows="4" placeholder="Brief description of your project or what you're looking for..." className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors resize-none" />
              </div>
              <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-md transition-colors text-[14px]">
                Send Inquiry
              </button>
              <p className="text-[11px] text-text-tertiary text-center">No spam. No sales pressure. Just an honest conversation about your project.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
