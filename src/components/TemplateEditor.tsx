import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import EditorFormattingToolbar from "@/components/common/EditorFormattingToolbar";

export interface TemplateEditorRef {
  handleCopy: () => Promise<void>;
  handleDownloadTxt: () => void;
  handleDownloadMarkdown: () => void;
}

interface TemplateEditorProps {
  initialContent: string;
  onContentChange: (text: string) => void;
  onCursorChange: (offset: number) => void;
}

export const TemplateEditor = forwardRef<
  TemplateEditorRef,
  TemplateEditorProps
>(({ initialContent, onContentChange, onCursorChange }, ref) => {
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
    content: initialContent,
    onUpdate: ({ editor: updatedEditor }) => {
      if (isSyncingFromStoreRef.current) return;
      onContentChangeRef.current(updatedEditor.getText());
    },
    onSelectionUpdate: ({ editor: updatedEditor }) => {
      const { doc, selection } = updatedEditor.state;
      const cursorOffset = doc.textBetween(0, selection.anchor, "\n", "\n").length;
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
      if (editor.getText() === text) return;

      isSyncingFromStoreRef.current = true;
      editor.commands.clearContent(true);
      if (text) {
        editor.commands.insertContent(text);
      }
      isSyncingFromStoreRef.current = false;
    },
    [editor],
  );

  useEffect(() => {
    setContentFromStore(initialContent);
  }, [initialContent, setContentFromStore]);

  const handleCopy = async () => {
    if (editor) {
      const text = editor.getText();
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    }
  };

  const getDatedFilename = (extension: "txt" | "md"): string => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `template-${dateStamp}.${extension}`;
  };

  const downloadBlob = (
    content: string,
    mimeType: string,
    filename: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    if (!editor) return;
    const text = editor.getText();
    downloadBlob(text, "text/plain", getDatedFilename("txt"));
  };

  const handleDownloadMarkdown = () => {
    if (!editor) return;

    let markdown = "";
    try {
      markdown = defaultMarkdownSerializer.serialize(editor.state.doc);
    } catch {
      // Keep export functional even if serializer hits an unsupported node.
      markdown = editor.getText();
    }

    downloadBlob(markdown, "text/markdown", getDatedFilename("md"));
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handleCopy,
    handleDownloadTxt,
    handleDownloadMarkdown,
  }));

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

TemplateEditor.displayName = "TemplateEditor";
