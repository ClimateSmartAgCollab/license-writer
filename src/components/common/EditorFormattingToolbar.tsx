import type { Editor as TiptapEditor } from "@tiptap/react";

type FormatCommand =
  | "bold"
  | "italic"
  | "formatBlock"
  | "insertUnorderedList"
  | "insertOrderedList";

interface EditorFormattingToolbarProps {
  editor: TiptapEditor;
  onRepeatClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  repeatButtonLabel?: string;
  repeatButtonTitle?: string;
}

export default function EditorFormattingToolbar({
  editor,
  onRepeatClick,
  repeatButtonLabel = "Repeat Section",
  repeatButtonTitle = "Insert repeat section",
}: EditorFormattingToolbarProps) {
  const handleFormat = (
    command: FormatCommand,
    value?: string,
    event?: React.MouseEvent,
  ) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    editor.chain().focus().run();

    switch (command) {
      case "bold":
        editor.chain().toggleBold().run();
        break;
      case "italic":
        editor.chain().toggleItalic().run();
        break;
      case "formatBlock":
        if (value === "h1") {
          editor.chain().toggleHeading({ level: 1 }).run();
        } else if (value === "h2") {
          editor.chain().toggleHeading({ level: 2 }).run();
        } else if (value === "h3") {
          editor.chain().toggleHeading({ level: 3 }).run();
        } else if (value === "blockquote") {
          editor.chain().toggleBlockquote().run();
        }
        break;
      case "insertUnorderedList":
        editor.chain().toggleBulletList().run();
        break;
      case "insertOrderedList":
        editor.chain().toggleOrderedList().run();
        break;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      <button
        onClick={(e) => handleFormat("formatBlock", "h1", e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold ${
          editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
        }`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={(e) => handleFormat("formatBlock", "h2", e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold ${
          editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={(e) => handleFormat("formatBlock", "h3", e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold ${
          editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
        }`}
        title="Heading 3"
      >
        H3
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={(e) => handleFormat("bold", undefined, e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold ${
          editor.isActive("bold") ? "bg-gray-200" : ""
        }`}
        title="Bold"
      >
        B
      </button>
      <button
        onClick={(e) => handleFormat("italic", undefined, e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm italic ${
          editor.isActive("italic") ? "bg-gray-200" : ""
        }`}
        title="Italic"
      >
        I
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={(e) => handleFormat("insertUnorderedList", undefined, e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 ${
          editor.isActive("bulletList") ? "bg-gray-200" : ""
        }`}
        title="Unordered List"
      >
        • List
      </button>
      <button
        onClick={(e) => handleFormat("insertOrderedList", undefined, e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 ${
          editor.isActive("orderedList") ? "bg-gray-200" : ""
        }`}
        title="Ordered List"
      >
        1. List
      </button>
      <button
        onClick={(e) => handleFormat("formatBlock", "blockquote", e)}
        className={`px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 ${
          editor.isActive("blockquote") ? "bg-gray-200" : ""
        }`}
        title="Quote"
      >
        Quote
      </button>
      {onRepeatClick && (
        <>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={onRepeatClick}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            title={repeatButtonTitle}
          >
            {repeatButtonLabel}
          </button>
        </>
      )}
    </div>
  );
}
