import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { ProxImage } from './tiptapImage'

/**
 * Shared extension list for the draft editor, so the live Tiptap instance
 * and the read-only preview (via generateHTML) render identically. Maps
 * onto legacy's Editor.js tools (header/list/quote/code/table/image/embed/
 * inlineCode/marker/underline) - see the migration plan's Tiptap section
 * for the full mapping and accepted simplifications (embed -> link).
 */
export const draftExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
  ProxImage.configure({ inline: false }),
  TableKit.configure({ table: { resizable: false } }),
  Underline,
  Highlight,
  Link.configure({ openOnClick: false, autolink: true }),
  Placeholder.configure({ placeholder: 'Tell your story…' }),
  CharacterCount,
]
