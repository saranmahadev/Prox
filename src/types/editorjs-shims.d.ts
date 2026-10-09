/** @editorjs/marker ships no TypeScript declarations, and @editorjs/embed's
 * declaration file exists but isn't resolvable through its package.json
 * "exports" map under this project's moduleResolution setting. */
declare module '@editorjs/marker'
declare module '@editorjs/embed'

declare module 'editorjs-undo' {
  import type EditorJS from '@editorjs/editorjs'
  import type { OutputData } from '@editorjs/editorjs'

  export default class Undo {
    constructor(config: { editor: EditorJS })
    initialize(data: OutputData | { blocks: OutputData['blocks'] }): void
    undo(): void
    redo(): void
  }
}
