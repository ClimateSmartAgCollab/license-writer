import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import EditorFormattingToolbar from "@/components/common/EditorFormattingToolbar";
import {
  applyPlainTextSurgeryIfPossible,
  tryApplyVerifiedPlainInsert,
} from "@/lib/editor/editorTiptapPlainTextInsertSync";
import {
  plainTextLengthBeforePos,
  pmPosFromPlainTextOffset,
} from "@/lib/editor/editorTiptapPlainTextOffset";
import type { JSONContent } from "@tiptap/core";

const EDITOR_BLOCK_SEPARATOR = "\n";
const JINJA_FOR_OPEN = "{% for";
const JINJA_FOR_CLOSE = "{% endfor %}";

function mapPlainTextOffsetToPmPos(
  ed: NonNullable<ReturnType<typeof useEditor>>,
  textOffset: number,
): number {
  return pmPosFromPlainTextOffset(ed, textOffset, EDITOR_BLOCK_SEPARATOR);
}

export interface AdvancedTemplateEditorRef {
  getText: () => string;
  getTipTapJSON: () => JSONContent;
  getPlainTextCursorOffset: () => number;
  focusEditor: () => void;
  handleCopy: () => Promise<void>;
  handleDownloadTxt: () => void;
  handleDownloadMarkdown: () => void;
}

interface AdvancedTemplateEditorProps {
  initialContent: string;
  onContentChange: (text: string) => void;
  onCursorChange: (offset: number) => void;
  pendingPlainInsertRef?: RefObject<{ at: number; text: string } | null>;
  initialDocJson?: JSONContent | null;
}

export const AdvancedTemplateEditor = forwardRef<
  AdvancedTemplateEditorRef,
  AdvancedTemplateEditorProps
>(({ initialContent, onContentChange, onCursorChange, pendingPlainInsertRef, initialDocJson }, ref) => {
  const mountContentRef = useRef<string | JSONContent | null>(null);
  if (mountContentRef.current === null) {
    mountContentRef.current = initialDocJson ?? initialContent;
  }
  const skipFirstStoreHydrationRef = useRef(Boolean(initialDocJson));

  const isSyncingFromStoreRef = useRef(false);
  const onContentChangeRef = useRef(onContentChange);
  const onCursorChangeRef = useRef(onCursorChange);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: mountContentRef.current ?? initialContent,
    onUpdate: ({ editor: updatedEditor }) => {
      if (isSyncingFromStoreRef.current) return;
      onContentChangeRef.current(
        updatedEditor.getText({ blockSeparator: EDITOR_BLOCK_SEPARATOR }),
      );
    },
    onSelectionUpdate: ({ editor: updatedEditor }) => {
      const cursorOffset = plainTextLengthBeforePos(
        updatedEditor,
        updatedEditor.state.selection.anchor,
        EDITOR_BLOCK_SEPARATOR,
      );
      onCursorChangeRef.current(cursorOffset);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-full w-full max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-6 focus:outline-none focus:ring-2 focus:ring-[var(--drt-green)] focus:border-transparent prose prose-sm",
        style: "white-space: pre-wrap; word-wrap: break-word;",
      },
    },
  });

  const setContentFromStore = useCallback(
    (text: string) => {
      if (!editor) return;
      const currentText = editor.getText({ blockSeparator: EDITOR_BLOCK_SEPARATOR });
      if (currentText === text) {
        if (pendingPlainInsertRef?.current) pendingPlainInsertRef.current = null;
        return;
      }

      const normalizedCurrent = currentText.replace(/\r\n/g, "\n");
      const normalizedIncoming = text.replace(/\r\n/g, "\n");
      let firstDiffIndex = -1;
      const minLen = Math.min(normalizedCurrent.length, normalizedIncoming.length);
      for (let i = 0; i < minLen; i += 1) {
        if (normalizedCurrent[i] !== normalizedIncoming[i]) {
          firstDiffIndex = i;
          break;
        }
      }
      if (firstDiffIndex === -1 && normalizedCurrent.length !== normalizedIncoming.length) {
        firstDiffIndex = minLen;
      }

      isSyncingFromStoreRef.current = true;
      const previousAnchor = editor.state.selection.anchor;
      const previousTextOffset = plainTextLengthBeforePos(editor, previousAnchor, EDITOR_BLOCK_SEPARATOR);

      const pending = pendingPlainInsertRef?.current ?? null;
      if (
        pending &&
        tryApplyVerifiedPlainInsert(
          editor,
          normalizedCurrent,
          normalizedIncoming,
          pending,
          mapPlainTextOffsetToPmPos,
          previousTextOffset,
        )
      ) {
        if (pendingPlainInsertRef) pendingPlainInsertRef.current = null;
        isSyncingFromStoreRef.current = false;
        return;
      }
      if (pendingPlainInsertRef?.current) pendingPlainInsertRef.current = null;

      const surgeryApplied = applyPlainTextSurgeryIfPossible(
        editor,
        normalizedCurrent,
        normalizedIncoming,
        mapPlainTextOffsetToPmPos,
        previousTextOffset,
      );
      if (surgeryApplied) {
        isSyncingFromStoreRef.current = false;
        return;
      }

      editor.commands.clearContent(true);
      if (text) {
        editor.commands.insertContent(text);
      }
      const hasJinjaRepeatBlock =
        normalizedCurrent.includes(JINJA_FOR_OPEN) ||
        normalizedIncoming.includes(JINJA_FOR_OPEN) ||
        normalizedCurrent.includes(JINJA_FOR_CLOSE) ||
        normalizedIncoming.includes(JINJA_FOR_CLOSE);
      if (hasJinjaRepeatBlock) {
        const lengthDelta = normalizedIncoming.length - normalizedCurrent.length;
        const shouldAdvanceOffset =
          lengthDelta > 0 && firstDiffIndex >= 0 && firstDiffIndex <= previousTextOffset;
        const targetTextOffset = shouldAdvanceOffset
          ? previousTextOffset + lengthDelta
          : previousTextOffset;
        const restoredAnchor = mapPlainTextOffsetToPmPos(editor, targetTextOffset);
        editor.commands.setTextSelection(restoredAnchor);
      }
      isSyncingFromStoreRef.current = false;
    },
    [editor, pendingPlainInsertRef],
  );

  useEffect(() => {
    if (skipFirstStoreHydrationRef.current) {
      skipFirstStoreHydrationRef.current = false;
      return;
    }
    setContentFromStore(initialContent);
  }, [initialContent, setContentFromStore]);

  const getText = useCallback(
    () => editor?.getText({ blockSeparator: EDITOR_BLOCK_SEPARATOR }) ?? "",
    [editor],
  );

  const getPlainTextCursorOffset = useCallback(() => {
    if (!editor) return 0;
    return plainTextLengthBeforePos(editor, editor.state.selection.anchor, EDITOR_BLOCK_SEPARATOR);
  }, [editor]);

  const getTipTapJSON = useCallback((): JSONContent => {
    if (!editor) return { type: "doc", content: [] };
    return editor.getJSON();
  }, [editor]);

  const focusEditor = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  const handleCopy = useCallback(async () => {
    const text = getText();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch (error) {
      console.error("Failed to copy template content to clipboard.", error);
    }
  }, [getText]);

  const getDatedFilename = useCallback((extension: "txt" | "md"): string => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `template-${dateStamp}.${extension}`;
  }, []);

  const downloadBlob = useCallback(
    (content: string, mimeType: string, filename: string) => {
      let url: string | null = null;
      try {
        const blob = new Blob([content], { type: mimeType });
        url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Failed to download template content.", error);
      } finally {
        if (url) URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const handleDownloadTxt = useCallback(() => {
    downloadBlob(getText(), "text/plain", getDatedFilename("txt"));
  }, [downloadBlob, getDatedFilename, getText]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!editor) return;

    let markdown = "";
    try {
      markdown = defaultMarkdownSerializer.serialize(editor.state.doc);
    } catch {
      // Keep export functional even if serializer hits an unsupported node.
      markdown = getText();
    }

    downloadBlob(markdown, "text/markdown", getDatedFilename("md"));
  }, [downloadBlob, editor, getDatedFilename, getText]);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      getText,
      getTipTapJSON,
      getPlainTextCursorOffset,
      focusEditor,
      handleCopy,
      handleDownloadTxt,
      handleDownloadMarkdown,
    }),
    [
      focusEditor,
      getPlainTextCursorOffset,
      getTipTapJSON,
      getText,
      handleCopy,
      handleDownloadMarkdown,
      handleDownloadTxt,
    ],
  );

  if (!editor) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Insert attribute
        </h2>

        <EditorFormattingToolbar editor={editor} />
      </div>

      {/* Editable Text Area */}
      <div className="flex-1 overflow-auto p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

AdvancedTemplateEditor.displayName = "AdvancedTemplateEditor";
