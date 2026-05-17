import { Outlet, Link, NavLink } from 'react-router-dom'
import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import CookieConsent from '@/components/CookieConsent'
import WelcomeLanguageModal from '@/i18n/WelcomeLanguageModal'
import LanguageSwitcher from '@/i18n/LanguageSwitcher'
import { useT } from '@/i18n/I18nProvider'

export default function PublicLayout() {
  const t = useT()
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <WelcomeLanguageModal />

      {/* ── Navigation ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-semibold text-[16px] text-text-primary tracking-tight hover:text-accent transition-colors">
            Cloz Digital
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/services"
              className={({ isActive }) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>
              {t('nav.services')}
            </NavLink>
            <NavLink to="/packages"
              className={({ isActive }) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>
              {t('nav.packages')}
            </NavLink>
            <NavLink to="/about"
              className={({ isActive }) => `text-[13px] ${isActive ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors`}>
              {t('nav.about')}
            </NavLink>
            <LanguageSwitcher variant="header" />
            <NavLink to="/contact"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-accent hover:bg-accent-hover px-4 py-2 rounded-md transition-colors">
              {t('nav.bookCta')}
              <ArrowUpRight size={13} />
            </NavLink>
          </nav>
          {/* Mobile CTA */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher variant="header" />
            <NavLink to="/contact"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-accent hover:bg-accent-hover px-3 py-1.5 rounded-md">
              {t('nav.contactShort')}
              <ArrowUpRight size={11} />
            </NavLink>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface/30">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="grid md:grid-cols-12 gap-10">
            {/* Brand */}
            <div className="md:col-span-5">
              <span className="font-display font-semibold text-[15px]">Cloz Digital</span>
              <p className="mt-3 text-[13px] text-text-secondary max-w-[340px] leading-relaxed">
                {t('footer.tagline')}
              </p>
              <div className="mt-5 space-y-2 text-[12px] text-text-tertiary">
                <div className="flex items-center gap-2">
                  <MapPin size={12} />
                  <span>{t('footer.location')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={12} />
                  <a href="https://cloz.digital" className="hover:text-text-secondary transition-colors">cloz.digital</a>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="md:col-span-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-tertiary mb-4">{t('footer.servicesHead')}</h4>
              <ul className="space-y-2.5 text-[13px]">
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.svc.design')}</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.svc.redesign')}</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.svc.hosting')}</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.svc.maint')}</Link></li>
                <li><Link to="/services" className="text-text-secondary hover:text-text-primary transition-colors">{t('footer.svc.seo')}</Link></li>
              </ul>
            </div>

            {/* Packages */}
            <div className="md:col-span-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-tertiary mb-4">{t('footer.packagesHead')}</h4>
              <ul className="space-y-2.5 text-[13px]">
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">{t('home.pkg.launch.name')}</Link></li>
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">{t('home.pkg.growth.name')}</Link></li>
                <li><Link to="/packages" className="text-text-secondary hover:text-text-primary transition-colors">{t('home.pkg.presence.name')}</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-tertiary mb-4">{t('footer.contactHead')}</h4>
              <ul className="space-y-2.5 text-[13px]">
                <li>
                  <a href="mailto:general@cloz.digital" className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5">
                    general@cloz.digital
                  </a>
                  <span className="text-[10px] text-text-tertiary">{t('footer.role.general')}</span>
                </li>
                <li>
                  <a href="mailto:anes@cloz.digital" className="text-text-secondary hover:text-text-primary transition-colors">
                    anes@cloz.digital
                  </a>
                  <span className="block text-[10px] text-text-tertiary">{t('footer.role.founder')}</span>
                </li>
                <li>
                  <a href="mailto:denis@cloz.digital" className="text-text-secondary hover:text-text-primary transition-colors">
                    denis@cloz.digital
                  </a>
                  <span className="block text-[10px] text-text-tertiary">{t('footer.role.success')}</span>
                </li>
                <li>
                  <a href="mailto:billing@cloz.digital" className="text-text-secondary hover:text-text-primary transition-colors">
                    billing@cloz.digital
                  </a>
                  <span className="block text-[10px] text-text-tertiary">{t('footer.role.billing')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-text-tertiary">
                &copy; {new Date().getFullYear()} Cloz Digital. {t('footer.copyright')}
              </span>
              <LanguageSwitcher variant="footer" />
            </div>
            <div className="flex gap-6 text-[12px] text-text-tertiary">
              <Link to="/contact" className="hover:text-text-secondary transition-colors">{t('nav.contact')}</Link>
              <Link to="/privacy-policy" className="hover:text-text-secondary transition-colors">{t('footer.privacy')}</Link>
              <Link to="/terms-of-service" className="hover:text-text-secondary transition-colors">{t('footer.terms')}</Link>
              <Link to="/cookie-policy" className="hover:text-text-secondary transition-colors">{t('footer.cookies')}</Link>
            </div>
          </div>
        </div>
      </footer>

      <CookieConsent />
    </div>
  )
}
