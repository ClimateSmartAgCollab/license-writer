import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import EditorFormattingToolbar from "@/components/common/EditorFormattingToolbar";

export interface TemplateBuilderRef {
  insertAttribute: (
    attrName: string,
    isNested?: boolean,
    parentName?: string,
  ) => void;
  getText: () => string;
  handleCopy: () => Promise<void>;
  handleDownloadTxt: () => void;
  handleDownloadMarkdown: () => void;
}

export interface RepeatAttributeOption {
  name: string;
  nestedAttributes: string[];
}

export interface BuilderRepeatContext {
  parentName: string;
  nestedAttributes: string[];
}

interface TemplateBuilderProps {
  repeatAttributeOptions: RepeatAttributeOption[];
  onRepeatContextChange: (context: BuilderRepeatContext | null) => void;
  initialContent: string;
  onContentChange: (text: string) => void;
}

export const TemplateBuilder = forwardRef<
  TemplateBuilderRef,
  TemplateBuilderProps
>(
  (
    { repeatAttributeOptions, onRepeatContextChange, initialContent, onContentChange },
    ref,
  ) => {
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

  const getText = () => editor?.getText() ?? "";

  const insertAttribute = (
    attrName: string,
    isNested = false,
    parentName?: string,
  ) => {
    if (!editor) return;

    const fullAttrName =
      isNested && parentName ? `${parentName}.${attrName}` : attrName;
    const activeRepeatParent = currentRepeatContext?.parentName;

    if (activeRepeatParent) {
      let itemFieldName = attrName;

      if (fullAttrName.startsWith(`${activeRepeatParent}.`)) {
        itemFieldName = fullAttrName.replace(`${activeRepeatParent}.`, "");
      }

      editor.chain().focus().insertContent(`[item.${itemFieldName}]`).run();
      return;
    }

    editor.chain().focus().insertContent(`[${fullAttrName}]`).run();
  };

  const handleRepeat = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsRepeatModalOpen(true);
  };

  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [selectedRepeatAttr, setSelectedRepeatAttr] = useState("");
  const [currentRepeatContext, setCurrentRepeatContext] =
    useState<BuilderRepeatContext | null>(null);

  const createRepeatSection = () => {
    if (!editor || !selectedRepeatAttr) return;

    const selectedOption = repeatAttributeOptions.find(
      (option) => option.name === selectedRepeatAttr,
    );
    if (!selectedOption) return;

    const block = [
      `[Start group of attributes: ${selectedOption.name}]`,
      `This section will repeat for every item in [${selectedOption.name}].`,
      "Write here... insert sub-fields before ending the section.\n",

      "[End group of attributes]",
    ].join("\n");

    editor.chain().focus().insertContent(block).run();

    const context: BuilderRepeatContext = {
      parentName: selectedOption.name,
      nestedAttributes: selectedOption.nestedAttributes,
    };
    setCurrentRepeatContext(context);
    onRepeatContextChange(context);

    setIsRepeatModalOpen(false);
    setSelectedRepeatAttr("");
  };

  const clearRepeatContext = () => {
    setCurrentRepeatContext(null);
    onRepeatContextChange(null);
  };

  const getDatedFilename = (extension: "txt" | "md"): string => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `template-${dateStamp}.${extension}`;
  };

  const downloadBlob = (text: string, mimeType: string, filename: string) => {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getText());
  };

  const handleDownloadTxt = () => {
    downloadBlob(getText(), "text/plain", getDatedFilename("txt"));
  };

  const handleDownloadMarkdown = () => {
    downloadBlob(getText(), "text/markdown", getDatedFilename("md"));
  };

  useImperativeHandle(ref, () => ({
    insertAttribute,
    getText,
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
                collaborator entry here. The attribute list now shows only this
                section's sub-fields.
              </p>
            </div>
            <button
              onClick={clearRepeatContext}
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
                onClick={() => {
                  setIsRepeatModalOpen(false);
                  setSelectedRepeatAttr("");
                }}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createRepeatSection}
                disabled={!selectedRepeatAttr}
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
});

TemplateBuilder.displayName = "TemplateBuilder";
