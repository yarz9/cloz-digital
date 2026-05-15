import { useEffect, useRef, useState } from 'react'
import {
  Undo2, Redo2, Scissors, Copy, ClipboardPaste, ClipboardCheck, CheckSquare,
  Bold, Italic, Underline, RemoveFormatting, Heading1, Heading2, Type,
  Link, Image, Table, Minus, RectangleHorizontal, FileSignature, LayoutTemplate, Tag,
  Wand2, Languages, Sparkles, UserCheck, TrendingUp, SmilePlus, Briefcase,
  PenLine, FileText, DollarSign, Phone
} from 'lucide-react'
import { SIGNATURES, BILLING_FOOTER_HTML } from '../data/signatures'
import { SNIPPETS, MERGE_TAGS } from '../data/templates'

// ══════════════════════════════════════════════════════════════
//  CONTEXT MENU — Custom right-click menu for the editor
// ══════════════════════════════════════════════════════════════

export default function EditorContextMenu({ x, y, editor, onClose, onAIAction, sender }) {
  const menuRef = useRef(null)
  const [subMenu, setSubMenu] = useState(null) // 'ai' | 'insert' | 'format' | 'merge' | null

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Position adjustment
  const adjustedX = Math.min(x, window.innerWidth - 240)
  const adjustedY = Math.min(y, window.innerHeight - 400)

  const exec = (fn) => { fn(); onClose() }

  const getSelectedText = () => {
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to)
  }

  const aiAction = (action) => {
    const text = getSelectedText() || editor.getText()
    onAIAction?.(action, text)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[999] bg-surface border border-border rounded-xl shadow-2xl py-1.5 w-[220px] animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {!subMenu && (
        <>
          {/* EDIT */}
          <MenuSection label="Edit">
            <MenuItem icon={Undo2} label="Undo" shortcut="Ctrl+Z" onClick={() => exec(() => editor.chain().focus().undo().run())} disabled={!editor.can().undo()} />
            <MenuItem icon={Redo2} label="Redo" shortcut="Ctrl+Y" onClick={() => exec(() => editor.chain().focus().redo().run())} disabled={!editor.can().redo()} />
            <MenuItem icon={Scissors} label="Cut" shortcut="Ctrl+X" onClick={() => exec(() => document.execCommand('cut'))} />
            <MenuItem icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={() => exec(() => document.execCommand('copy'))} />
            <MenuItem icon={ClipboardPaste} label="Paste" shortcut="Ctrl+V" onClick={() => exec(() => document.execCommand('paste'))} />
            <MenuItem icon={CheckSquare} label="Select All" shortcut="Ctrl+A" onClick={() => exec(() => editor.chain().focus().selectAll().run())} />
          </MenuSection>

          <MenuDivider />

          {/* FORMATTING */}
          <MenuSection label="Format">
            <MenuItem icon={Bold} label="Bold" shortcut="Ctrl+B" onClick={() => exec(() => editor.chain().focus().toggleBold().run())} />
            <MenuItem icon={Italic} label="Italic" shortcut="Ctrl+I" onClick={() => exec(() => editor.chain().focus().toggleItalic().run())} />
            <MenuItem icon={Underline} label="Underline" shortcut="Ctrl+U" onClick={() => exec(() => editor.chain().focus().toggleUnderline().run())} />
            <MenuItem icon={RemoveFormatting} label="Clear Formatting" onClick={() => exec(() => editor.chain().focus().clearNodes().unsetAllMarks().run())} />
          </MenuSection>

          <MenuDivider />

          {/* SUBMENUS */}
          <MenuItem icon={Sparkles} label="AI Tools" hasSubmenu onClick={() => setSubMenu('ai')} />
          <MenuItem icon={LayoutTemplate} label="Insert" hasSubmenu onClick={() => setSubMenu('insert')} />
          <MenuItem icon={Tag} label="Merge Tag" hasSubmenu onClick={() => setSubMenu('merge')} />
        </>
      )}

      {/* AI TOOLS SUBMENU */}
      {subMenu === 'ai' && (
        <>
          <MenuBack onClick={() => setSubMenu(null)} label="AI Tools" />
          <MenuItem icon={Wand2} label="Improve Writing" onClick={() => aiAction('improve')} />
          <MenuItem icon={Briefcase} label="Rewrite Professionally" onClick={() => aiAction('professional')} />
          <MenuItem icon={SmilePlus} label="Make More Friendly" onClick={() => aiAction('friendly')} />
          <MenuItem icon={PenLine} label="Make Formal" onClick={() => aiAction('formal')} />
          <MenuDivider />
          <MenuItem icon={Minus} label="Shorten" onClick={() => aiAction('shorten')} />
          <MenuItem icon={TrendingUp} label="Expand" onClick={() => aiAction('expand')} />
          <MenuItem icon={CheckSquare} label="Fix Grammar" onClick={() => aiAction('grammar')} />
          <MenuItem icon={Languages} label="Translate" onClick={() => aiAction('translate')} />
          <MenuDivider />
          <MenuItem icon={UserCheck} label="Personalize for Lead" onClick={() => aiAction('personalize')} />
          <MenuItem icon={TrendingUp} label="Increase Conversion" onClick={() => aiAction('conversion')} />
        </>
      )}

      {/* INSERT SUBMENU */}
      {subMenu === 'insert' && (
        <>
          <MenuBack onClick={() => setSubMenu(null)} label="Insert" />
          <MenuItem icon={Link} label="Link" onClick={() => exec(() => {
            const url = prompt('Enter URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          })} />
          <MenuItem icon={Image} label="Image" onClick={() => exec(() => {
            const url = prompt('Enter image URL:')
            if (url) editor.chain().focus().setImage({ src: url }).run()
          })} />
          <MenuItem icon={Table} label="Table" onClick={() => exec(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} />
          <MenuItem icon={Minus} label="Divider" onClick={() => exec(() => editor.chain().focus().setHorizontalRule().run())} />
          <MenuDivider />
          <MenuItem icon={FileSignature} label="Signature" onClick={() => exec(() => {
            const sig = SIGNATURES[sender] || SIGNATURES.general
            editor.chain().focus().insertContent(sig.html).run()
          })} />
          <MenuItem icon={DollarSign} label="Billing Footer" onClick={() => exec(() => editor.chain().focus().insertContent(BILLING_FOOTER_HTML).run())} />
          <MenuItem icon={Phone} label="Contact Block" onClick={() => exec(() => {
            const snippet = SNIPPETS.find(s => s.id === 'contact-block')
            if (snippet) editor.chain().focus().insertContent(snippet.html).run()
          })} />
          <MenuItem icon={RectangleHorizontal} label="CTA Button" onClick={() => exec(() => {
            const snippet = SNIPPETS.find(s => s.id === 'cta-call')
            if (snippet) editor.chain().focus().insertContent(snippet.html).run()
          })} />
          <MenuDivider />
          {SNIPPETS.slice(0, 5).map(s => (
            <MenuItem key={s.id} icon={FileText} label={s.name} onClick={() => exec(() => editor.chain().focus().insertContent(s.html).run())} />
          ))}
        </>
      )}

      {/* MERGE TAGS SUBMENU */}
      {subMenu === 'merge' && (
        <>
          <MenuBack onClick={() => setSubMenu(null)} label="Merge Tags" />
          {MERGE_TAGS.map(tag => (
            <MenuItem
              key={tag.tag}
              icon={Tag}
              label={tag.label}
              sublabel={tag.tag}
              onClick={() => exec(() => editor.chain().focus().insertContent(`<span style="background:#DBEAFE;color:#1E40AF;padding:1px 4px;border-radius:3px;font-size:12px">${tag.tag}</span>&nbsp;`).run())}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ── Menu Components ──

function MenuSection({ label, children }) {
  return (
    <div>
      <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">{label}</div>
      {children}
    </div>
  )
}

function MenuItem({ icon: Icon, label, sublabel, shortcut, onClick, disabled, hasSubmenu }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors disabled:opacity-40 disabled:pointer-events-none text-left"
    >
      <Icon size={13} strokeWidth={1.6} className="shrink-0 text-text-tertiary" />
      <span className="flex-1 truncate">{label}</span>
      {sublabel && <span className="text-[9px] text-text-tertiary font-mono">{sublabel}</span>}
      {shortcut && <span className="text-[9px] text-text-tertiary">{shortcut}</span>}
      {hasSubmenu && <span className="text-[9px] text-text-tertiary">▸</span>}
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-border" />
}

function MenuBack({ onClick, label }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-elevated border-b border-border mb-1">
      <span>←</span> {label}
    </button>
  )
}
