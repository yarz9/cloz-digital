import { Outlet, Link, NavLink } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-semibold text-[16px] text-text-primary tracking-tight">
            Cloz Digital
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/services" className={({isActive}) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>Services</NavLink>
            <NavLink to="/packages" className={({isActive}) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>Packages</NavLink>
            <NavLink to="/work" className={({isActive}) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>Work</NavLink>
            <NavLink to="/about" className={({isActive}) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>About</NavLink>
            <NavLink to="/contact" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-bg bg-text-primary hover:bg-accent hover:text-white px-4 py-2 rounded-md transition-colors">
              Get in Touch
              <ArrowUpRight size={13} />
            </NavLink>
          </nav>
        </div>
      </header>

      <Outlet />

      {/* Footer */}
      <footer className="border-t border-border py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <span className="font-display font-semibold text-[15px]">Cloz Digital</span>
              <p className="mt-3 text-[13px] text-text-secondary max-w-[320px] leading-relaxed">
                Premium web design, hosting, and ongoing care for businesses that take their online presence seriously.
              </p>
            </div>
            <div>
              <h4 className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary mb-4">Services</h4>
              <ul className="space-y-2.5 text-[13px]">
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">Website Design</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">Website Redesign</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">Hosting & Setup</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">Ongoing Maintenance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary mb-4">Packages</h4>
              <ul className="space-y-2.5 text-[13px]">
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">Launch Care</Link></li>
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">Growth Care</Link></li>
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">Presence Care</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-[12px] text-text-tertiary">&copy; 2026 Cloz Digital. All rights reserved.</span>
            <div className="flex gap-6 text-[12px] text-text-tertiary">
              <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
