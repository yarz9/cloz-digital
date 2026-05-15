import { Settings, User, Bell, Shield, Database, Globe } from 'lucide-react'

export default function AdminSettings() {
  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[20px]">Settings</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">System configuration and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold flex items-center gap-2 mb-4"><User size={15} className="text-accent" /> Business Profile</h2>
        <div className="space-y-3">
          <div><label className="text-[11px] text-text-tertiary block mb-1">Business Name</label><input defaultValue="Cloz Digital" className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" /></div>
          <div><label className="text-[11px] text-text-tertiary block mb-1">Email</label><input defaultValue="general@cloz.digital" className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" /></div>
          <div><label className="text-[11px] text-text-tertiary block mb-1">Location</label><input defaultValue="Bosnia and Herzegovina" className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" /></div>
          <div><label className="text-[11px] text-text-tertiary block mb-1">Currency</label><input defaultValue="BAM" className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" /></div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold flex items-center gap-2 mb-4"><Shield size={15} className="text-accent" /> Security</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-elevated rounded-md">
            <span className="text-[13px]">Admin Password</span>
            <button className="text-[12px] text-accent hover:text-accent-hover font-medium">Change</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-elevated rounded-md">
            <span className="text-[13px]">Session Timeout</span>
            <span className="text-[12px] text-text-secondary">24 hours</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold flex items-center gap-2 mb-4"><Globe size={15} className="text-accent" /> Quick Links</h2>
        <div className="space-y-2">
          <a href="/ai" className="flex items-center justify-between p-3 bg-elevated hover:bg-raised rounded-md transition-colors">
            <span className="text-[13px]">AI Admin Panel</span>
            <span className="text-[12px] text-accent">/ai</span>
          </a>
          <a href="/" className="flex items-center justify-between p-3 bg-elevated hover:bg-raised rounded-md transition-colors">
            <span className="text-[13px]">Public Website</span>
            <span className="text-[12px] text-accent">/</span>
          </a>
        </div>
      </div>
    </div>
  )
}
