import Image from '@tiptap/extension-image'

/**
 * Extends the base Image extension with a `fileKey` attribute pointing at
 * a blob in `fileStore` - mirrors legacy's Editor.js image tool, which
 * stored `{key, url}` and re-resolved `url` from IndexedDB on load instead
 * of persisting a (session-only) blob URL. See lib/docImages.ts for the
 * strip-before-save / hydrate-after-load pair that uses this attribute.
 */
export const ProxImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileKey: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-key'),
        renderHTML: (attributes) => (attributes.fileKey ? { 'data-file-key': attributes.fileKey } : {}),
      },
    }
  },
})
