import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Typography } from '@tiptap/extension-typography'
import { FontFamily } from '@tiptap/extension-font-family'
import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, CheckSquare, Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Minus, Quote, Code, Heading1, Heading2, Heading3, Undo2, Redo2, Type, Palette,
  Highlighter, RemoveFormatting, Maximize2, Minimize2,
} from 'lucide-react'
import EditorContextMenu from './ContextMenu'

// ══════════════════════════════════════════════════════════════
//  TIPTAP EDITOR — Premium rich text email editor
// ══════════════════════════════════════════════════════════════

const TipTapEditor = forwardRef(function TipTapEditor({
  content = '',
  onChange,
  onSave,
  onSend,
  placeholder = 'Write your email...',
  sender,
  onAIAction,
  className = '',
}, ref) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const editorContainerRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', style: 'color:#3B82F6;text-decoration:underline' },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { style: 'max-width:100%;height:auto;border-radius:4px' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      FontFamily,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-[13px] leading-relaxed',
      },
      handleKeyDown: (_view, event) => {
        // Ctrl+S = save draft
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault()
          onSave?.()
          return true
        }
        // Ctrl+Enter = send
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          onSend?.()
          return true
        }
        return false
      },
    },
  })

  // Expose editor methods to parent
  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    getText: () => editor?.getText() || '',
    setContent: (html) => editor?.commands.setContent(html),
    insertContent: (html) => editor?.commands.insertContent(html),
    focus: () => editor?.commands.focus(),
    clear: () => editor?.commands.clearContent(),
    editor,
  }))

  // Sync content from outside
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Context menu handler
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setShowContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => setShowContextMenu(null), [])

  // Link insertion
  const insertLink = useCallback(() => {
    if (!linkUrl) return
    editor?.chain().focus().setLink({ href: linkUrl }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div
      ref={editorContainerRef}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-bg' : ''} ${className}`}
      onContextMenu={handleContextMenu}
    >
      {/* ── Toolbar ── */}
      <Toolbar
        editor={editor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onInsertLink={() => setShowLinkInput(!showLinkInput)}
        onInsertImage={insertImage}
        onInsertTable={insertTable}
      />

      {/* Link input */}
      {showLinkInput && (
        <div className="px-3 py-2 border-b border-border bg-elevated flex items-center gap-2">
          <LinkIcon size={12} className="text-text-tertiary" />
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insertLink()}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            autoFocus
          />
          <button onClick={insertLink} className="px-2 py-0.5 bg-accent text-white rounded text-[10px] font-medium">Insert</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl('') }} className="text-[10px] text-text-tertiary">Cancel</button>
        </div>
      )}

      {/* ── Editor Content ── */}
      <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'max-w-[700px] mx-auto w-full' : ''}`}>
        <EditorContent editor={editor} className="email-editor" />
      </div>

      {/* ── Context Menu ── */}
      {showContextMenu && (
        <EditorContextMenu
          x={showContextMenu.x}
          y={showContextMenu.y}
          editor={editor}
          onClose={closeContextMenu}
          onAIAction={onAIAction}
          sender={sender}
        />
      )}
    </div>
  )
})

export default TipTapEditor

// ══════════════════════════════════════════════════════════════
//  TOOLBAR
// ══════════════════════════════════════════════════════════════

function Toolbar({ editor, isFullscreen, onToggleFullscreen, onInsertLink, onInsertImage, onInsertTable }) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface flex-wrap">
      {/* History */}
      <ToolBtn icon={Undo2} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)" />
      <ToolBtn icon={Redo2} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)" />
      <Divider />

      {/* Text formatting */}
      <ToolBtn icon={Bold} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)" />
      <ToolBtn icon={Italic} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)" />
      <ToolBtn icon={UnderlineIcon} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)" />
      <ToolBtn icon={Strikethrough} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" />
      <Divider />

      {/* Headings */}
      <ToolBtn icon={Heading1} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" />
      <ToolBtn icon={Heading2} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" />
      <ToolBtn icon={Heading3} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" />
      <ToolBtn icon={Type} active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph" />
      <Divider />

      {/* Lists */}
      <ToolBtn icon={List} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List" />
      <ToolBtn icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List" />
      <ToolBtn icon={CheckSquare} active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List" />
      <Divider />

      {/* Alignment */}
      <ToolBtn icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left" />
      <ToolBtn icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center" />
      <ToolBtn icon={AlignRight} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right" />
      <Divider />

      {/* Insert */}
      <ToolBtn icon={LinkIcon} onClick={onInsertLink} title="Insert Link (Ctrl+K)" />
      <ToolBtn icon={ImageIcon} onClick={onInsertImage} title="Insert Image" />
      <ToolBtn icon={TableIcon} onClick={onInsertTable} title="Insert Table" />
      <ToolBtn icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" />
      <ToolBtn icon={Quote} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote" />
      <ToolBtn icon={Code} active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" />
      <Divider />

      {/* Formatting */}
      <ToolBtn icon={RemoveFormatting} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting" />

      {/* Color picker */}
      <div className="relative">
        <input
          type="color"
          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 opacity-0 absolute inset-0"
          title="Text Color"
        />
        <div className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-elevated cursor-pointer">
          <Palette size={12} className="text-text-tertiary" />
        </div>
      </div>

      {/* Highlight */}
      <div className="relative">
        <input
          type="color"
          defaultValue="#FBBF24"
          onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 opacity-0 absolute inset-0"
          title="Highlight"
        />
        <div className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-elevated cursor-pointer">
          <Highlighter size={12} className="text-text-tertiary" />
        </div>
      </div>

      {/* Fullscreen */}
      <div className="ml-auto">
        <ToolBtn icon={isFullscreen ? Minimize2 : Maximize2} onClick={onToggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} />
      </div>
    </div>
  )
}

function ToolBtn({ icon: Icon, active, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <Icon size={14} strokeWidth={1.8} />
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />
}
