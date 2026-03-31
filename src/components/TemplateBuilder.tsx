import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import EditorFormattingToolbar from "@/components/common/EditorFormattingToolbar";
import {
  applyPlainTextSurgeryIfPossible,
  tryApplyVerifiedPlainInsert,
} from "@/lib/editor/plainTextSurgerySync";
import {
  plainTextLengthBeforePos,
  pmPosFromPlainTextOffset,
} from "@/lib/editor/tiptapPlainTextOffset";
import type { BuilderRepeatContext } from "@/types/template-commands";
import type { JSONContent } from "@tiptap/core";

const EDITOR_BLOCK_SEPARATOR = "\n";

function mapPlainTextOffsetToPmPos(
  ed: NonNullable<ReturnType<typeof useEditor>>,
  textOffset: number,
): number {
  return pmPosFromPlainTextOffset(ed, textOffset, EDITOR_BLOCK_SEPARATOR);
}

export interface TemplateBuilderRef {
  getText: () => string;
  getTipTapJSON: () => JSONContent;
  getPlainTextCursorOffset: () => number;
  focusEditor: () => void;
  handleCopy: () => Promise<void>;
  handleDownloadTxt: () => void;
  handleDownloadMarkdown: () => void;
}

export interface RepeatAttributeOption {
  name: string;
  nestedAttributes: string[];
}

interface TemplateBuilderProps {
  repeatAttributeOptions: RepeatAttributeOption[];
  currentRepeatContext: BuilderRepeatContext | null;
  onInsertForBlock: (parentName: string, nestedAttributes: string[]) => void;
  onClearRepeatContext: () => void;
  initialContent: string;
  onContentChange: (text: string) => void;
  onCursorChange: (offset: number) => void;
  isReadOnly: boolean;
  pendingPlainInsertRef?: RefObject<{ at: number; text: string } | null>;
  initialDocJson?: JSONContent | null;
}

export const TemplateBuilder = forwardRef<
  TemplateBuilderRef,
  TemplateBuilderProps
>(
  (
    {
      repeatAttributeOptions,
      currentRepeatContext,
      onInsertForBlock,
      onClearRepeatContext,
      initialContent,
      onContentChange,
      onCursorChange,
      isReadOnly,
      pendingPlainInsertRef,
      initialDocJson,
    },
    ref,
  ) => {
    const mountContentRef = useRef<string | JSONContent | null>(null);
    if (mountContentRef.current === null) {
      mountContentRef.current = initialDocJson ?? initialContent;
    }
    const skipFirstStoreHydrationRef = useRef(Boolean(initialDocJson));

    const isSyncingFromStoreRef = useRef(false);
    const onContentChangeRef = useRef(onContentChange);
    const onCursorChangeRef = useRef(onCursorChange);
    const currentRepeatContextRef = useRef<BuilderRepeatContext | null>(
      currentRepeatContext,
    );
    const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
    const [selectedRepeatAttr, setSelectedRepeatAttr] = useState("");

    useEffect(() => {
      onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    useEffect(() => {
      onCursorChangeRef.current = onCursorChange;
    }, [onCursorChange]);

    useEffect(() => {
      currentRepeatContextRef.current = currentRepeatContext;
    }, [currentRepeatContext]);

    const editor = useEditor({
      extensions: [StarterKit],
      content: mountContentRef.current ?? initialContent,
      editable: !isReadOnly,
      onUpdate: ({ editor: updatedEditor }) => {
        if (isSyncingFromStoreRef.current) return;
        const nextText = updatedEditor.getText({
          blockSeparator: EDITOR_BLOCK_SEPARATOR,
        });
        onContentChangeRef.current(nextText);
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
        const currentText = editor.getText({
          blockSeparator: EDITOR_BLOCK_SEPARATOR,
        });
        if (currentText === text) {
          if (pendingPlainInsertRef?.current)
            pendingPlainInsertRef.current = null;
          return;
        }
        const normalizedCurrent = currentText.replace(/\r\n/g, "\n");
        const normalizedIncoming = text.replace(/\r\n/g, "\n");
        let firstDiffIndex = -1;
        const minLen = Math.min(
          normalizedCurrent.length,
          normalizedIncoming.length,
        );
        for (let i = 0; i < minLen; i += 1) {
          if (normalizedCurrent[i] !== normalizedIncoming[i]) {
            firstDiffIndex = i;
            break;
          }
        }
        if (
          firstDiffIndex === -1 &&
          normalizedCurrent.length !== normalizedIncoming.length
        ) {
          firstDiffIndex = minLen;
        }
        const closeToken = "[End group of attributes]";
        const hasCloseMarkers =
          normalizedCurrent.includes(closeToken) ||
          normalizedIncoming.includes(closeToken);
        const shouldRestoreSelection =
          Boolean(currentRepeatContextRef.current) && hasCloseMarkers;

        isSyncingFromStoreRef.current = true;
        const previousAnchor = editor.state.selection.anchor;
        const previousTextOffset = plainTextLengthBeforePos(
          editor,
          previousAnchor,
          EDITOR_BLOCK_SEPARATOR,
        );

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
        if (pendingPlainInsertRef?.current)
          pendingPlainInsertRef.current = null;

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
        if (shouldRestoreSelection) {
          const lengthDelta =
            normalizedIncoming.length - normalizedCurrent.length;
          const shouldAdvanceAnchor =
            lengthDelta > 0 &&
            firstDiffIndex >= 0 &&
            firstDiffIndex <= previousAnchor;
          const targetTextOffset = shouldAdvanceAnchor
            ? previousTextOffset + lengthDelta
            : previousTextOffset;
          const restoredAnchor = mapPlainTextOffsetToPmPos(
            editor,
            targetTextOffset,
          );
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

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!isReadOnly);
    }, [editor, isReadOnly]);

    const getText = useCallback(
      () => editor?.getText({ blockSeparator: EDITOR_BLOCK_SEPARATOR }) ?? "",
      [editor],
    );

    const getPlainTextCursorOffset = useCallback(() => {
      if (!editor) return 0;
      return plainTextLengthBeforePos(
        editor,
        editor.state.selection.anchor,
        EDITOR_BLOCK_SEPARATOR,
      );
    }, [editor]);

    const getTipTapJSON = useCallback((): JSONContent => {
      if (!editor) return { type: "doc", content: [] };
      return editor.getJSON();
    }, [editor]);

    const focusEditor = useCallback(() => {
      editor?.commands.focus();
    }, [editor]);

    const handleRepeat = useCallback(
      (event?: React.MouseEvent) => {
        if (isReadOnly) return;
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        setIsRepeatModalOpen(true);
      },
      [isReadOnly],
    );

    const createRepeatSection = useCallback(() => {
      if (!selectedRepeatAttr) return;

      const selectedOption = repeatAttributeOptions.find(
        (option) => option.name === selectedRepeatAttr,
      );
      if (!selectedOption) return;

      onInsertForBlock(selectedOption.name, selectedOption.nestedAttributes);
      setIsRepeatModalOpen(false);
      setSelectedRepeatAttr("");
    }, [onInsertForBlock, repeatAttributeOptions, selectedRepeatAttr]);

    const getDatedFilename = useCallback((extension: "txt" | "md"): string => {
      const dateStamp = new Date().toISOString().slice(0, 10);
      return `template-${dateStamp}.${extension}`;
    }, []);

    const downloadBlob = useCallback(
      (text: string, mimeType: string, filename: string) => {
        let url: string | null = null;
        try {
          const blob = new Blob([text], { type: mimeType });
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

    const handleDownloadTxt = useCallback(() => {
      downloadBlob(getText(), "text/plain", getDatedFilename("txt"));
    }, [downloadBlob, getDatedFilename, getText]);

    const handleDownloadMarkdown = useCallback(() => {
      downloadBlob(getText(), "text/markdown", getDatedFilename("md"));
    }, [downloadBlob, getDatedFilename, getText]);

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
          <h2 className="text-lg font-semibold text-gray-800">Builder mode</h2>

          <EditorFormattingToolbar
            editor={editor}
            onRepeatClick={handleRepeat}
            repeatButtonLabel="group of attributes"
            repeatButtonTitle="Insert group of attributes"
          />

          {currentRepeatContext && (
            <div className="mt-3 border border-emerald-300 bg-emerald-50 rounded-md p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Repeats for each item in [{currentRepeatContext.parentName}]
                </p>
                <p className="text-xs text-emerald-800 mt-1">
                  Example: if this is collaborator information, add every
                  collaborator entry here. The attribute list now shows only
                  this section's sub-fields.
                </p>
              </div>
              <button
                onClick={onClearRepeatContext}
                className="px-2 py-1 border border-emerald-400 text-emerald-900 rounded text-xs hover:bg-emerald-100"
              >
                Exit repeat context
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <EditorContent editor={editor} />
        </div>

        {isRepeatModalOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-lg border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900">
                Create repeating section
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Repeat for which attribute?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pick a list attribute. This means the section repeats once per
                item in that list.
              </p>

              <select
                value={selectedRepeatAttr}
                onChange={(e) => setSelectedRepeatAttr(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select list attribute</option>
                {repeatAttributeOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setIsRepeatModalOpen(false);
                    setSelectedRepeatAttr("");
                  }}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={createRepeatSection}
                  disabled={!selectedRepeatAttr || isReadOnly}
                  className="px-3 py-2 bg-[var(--drt-green)] text-white rounded hover:bg-[var(--drt-green-dark)] disabled:opacity-50 text-sm"
                >
                  Insert Section
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

TemplateBuilder.displayName = "TemplateBuilder";
