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

const SUPPORTED_TEMPLATE_BLOCK_TAGS = new Set([
  "for",
  "endfor",
  "if",
  "elif",
  "else",
  "endif",
]);

export interface TemplateEditorRef {
  insertAttribute: (
    attrName: string,
    isNested?: boolean,
    parentName?: string,
  ) => void;
  handleCopy: () => Promise<void>;
  handleDownloadTxt: () => void;
  handleDownloadMarkdown: () => void;
}

interface TemplateEditorProps {
  initialContent: string;
  onContentChange: (text: string) => void;
}

export const TemplateEditor = forwardRef<
  TemplateEditorRef,
  TemplateEditorProps
>(({ initialContent, onContentChange }, ref) => {
  const isSyncingFromStoreRef = useRef(false);
  const onContentChangeRef = useRef(onContentChange);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor: updatedEditor }) => {
      if (isSyncingFromStoreRef.current) return;
      onContentChangeRef.current(updatedEditor.getText());
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

  // Keep all matching/index checks in plain-text coordinates.
  const getPlainText = (): string => {
    if (!editor) return "";
    const { doc } = editor.state;
    return doc.textBetween(0, doc.content.size, "\n", "\n");
  };

  const getCursorTextOffset = (): number => {
    if (!editor) return 0;
    const { doc, selection } = editor.state;
    return doc.textBetween(0, selection.anchor, "\n", "\n").length;
  };

  const insertAttribute = (
    attrName: string,
    isNested = false,
    parentName?: string,
  ) => {
    if (!editor) return;

    editor.chain().focus().run();

    if (isNested && parentName) {
      const text = getPlainText();
      const cursorPos = getCursorTextOffset();

      // Escape special characters for regex
      const escParent = parentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Find all for loops for this parent
      const loopRegex = new RegExp(
        `{%\\s*for\\s+\\w+\\s+in\\s+${escParent}\\s*%}([\\s\\S]*?){%\\s*endfor\\s*%}`,
        "g",
      );

      let match: RegExpExecArray | null;
      let cursorInsideLoop = false;

      // Check if cursor is inside any existing loop for this parent
      while ((match = loopRegex.exec(text)) !== null) {
        const loopStart = match.index;
        const loopEnd = loopStart + match[0].length;

        // Find where the opening tag ends and closing tag begins
        const openingTag = match[0].match(/{%\s*for\s+[^%]+%}/)?.[0] || "";
        const closingTag = match[0].match(/{%\s*endfor\s*%}/)?.[0] || "";

        const contentStart = loopStart + openingTag.length;
        const contentEnd = loopEnd - closingTag.length;

        // Check if cursor is between {% for %} and {% endfor %}
        const tolerance = 10; // Tolerance to handle newlines and whitespace
        const isInRange =
          cursorPos >= contentStart - tolerance &&
          cursorPos <= contentEnd + tolerance;

        if (isInRange) {
          cursorInsideLoop = true;

          // Extract the loop variable name from the for opening tag
          const loopVarMatch = openingTag.match(/{%\s*for\s+(\w+)\s+in/);
          const loopVar = loopVarMatch ? loopVarMatch[1] : "item";

          // Check if this exact attribute already exists in this loop
          const attrPattern = new RegExp(
            `{{\\s*${loopVar}\\.${escAttr}\\s*}}`,
            "i",
          );

          if (attrPattern.test(match[1])) {
            // Attribute already exists in this loop.
            return;
          }

          // Insert the attribute at current cursor position inside the loop
          editor.chain().insertContent(`{{ ${loopVar}.${attrName} }}`).run();
          return;
        }
      }

      // Cursor is NOT inside any existing loop for this parent
      // Create a new for loop block at cursor position
      if (!cursorInsideLoop) {
        const loopContent = `{% for item in ${parentName} %}\n  {{ item.${attrName} }}\n{% endfor %}`;
        editor.chain().insertContent(loopContent).run();
        return;
      }
    } else {
      // Non-nested attribute - simple insertion
      editor.chain().insertContent(`{{ ${attrName} }}`).run();
    }
  };

  const findUnsupportedTemplateTags = (content: string): string[] => {
    const blockTagRegex = /{%\s*([a-zA-Z_][\w]*)\b[^%]*%}/g;
    const unsupported = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = blockTagRegex.exec(content)) !== null) {
      const tag = match[1].toLowerCase();
      if (!SUPPORTED_TEMPLATE_BLOCK_TAGS.has(tag)) {
        unsupported.add(tag);
      }
    }

    return [...unsupported];
  };

  const validateSupportedTemplateRules = (content: string): boolean => {
    const unsupportedTags = findUnsupportedTemplateTags(content);

    if (unsupportedTags.length > 0) {
      console.warn(
        "Unsupported template tags found:",
        unsupportedTags.join(", "),
      );
      window.alert(
        `Unsupported template tags detected: ${unsupportedTags.join(", ")}.\n` +
          "This editor only supports variable insertion, for-loop blocks, and optional if-blocks.",
      );
      return false;
    }

    return true;
  };

  const handleCopy = async () => {
    if (editor) {
      const text = editor.getText();
      if (!validateSupportedTemplateRules(text)) return;
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
    if (!validateSupportedTemplateRules(text)) return;
    downloadBlob(text, "text/plain", getDatedFilename("txt"));
  };

  const handleDownloadMarkdown = () => {
    if (!editor) return;

    const plainText = editor.getText();
    if (!validateSupportedTemplateRules(plainText)) return;

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
    insertAttribute,
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
