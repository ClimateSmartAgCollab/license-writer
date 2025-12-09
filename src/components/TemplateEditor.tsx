import { useRef, forwardRef, useImperativeHandle } from "react";

export interface TemplateEditorRef {
  insertAttribute: (attrName: string, isNested?: boolean, parentName?: string) => void;
  handleCopy: () => Promise<void>;
  handleDownload: () => void;
}

interface TemplateEditorProps {
  // Props can be added here if needed in the future
}

export const TemplateEditor = forwardRef<TemplateEditorRef, TemplateEditorProps>((props, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Helper function to get editor text content
  const getEditorText = (editor: HTMLDivElement): string => {
    return editor.innerText || editor.textContent || "";
  };

  // Helper function to get cursor position in editor text
  const getCursorPosition = (editor: HTMLDivElement, range: Range | null): number => {
    if (!range) return getEditorText(editor).length;

    const editorText = editor.innerText || "";

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return NodeFilter.FILTER_ACCEPT;
        }
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "BR") {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    let cursorPos = 0;
    let node: Node | null = null;
    let foundCursor = false;

    while ((node = walker.nextNode())) {
      if (node === range.startContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          cursorPos += range.startOffset;
          foundCursor = true;
          break;
        } else if (node.nodeName === "BR") {
          // Cursor is at a BR element - position is right after the BR
          // BR adds one character in innerText, so add 1 to position
          cursorPos += 1;
          foundCursor = true;
          break;
        }
      } else if (node.contains && node.contains(range.startContainer)) {
        // The cursor is inside this node or one of its children
        if (node.nodeType === Node.TEXT_NODE) {
          // If cursor is in a child text node, we need to find it
          // For now, add the full length - this will be approximate
          cursorPos += (node.textContent || "").length;
          foundCursor = true;
          break;
        } else if (node.nodeName === "BR") {
          // Cursor is after a BR element that contains the startContainer
          cursorPos += 1;
          foundCursor = true;
          break;
        }
      }

      if (node.nodeType === Node.TEXT_NODE) {
        cursorPos += (node.textContent || "").length;
      } else if (node.nodeName === "BR") {
        cursorPos += 1; // BR adds one character in innerText
      }
    }

    // If we still haven't found the cursor, try a different approach
    // Check if the range is positioned right after a BR or between nodes
    if (!foundCursor && range.startContainer) {
      // If the range is positioned between nodes (common after BR tags)
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        // We should have found it above, but if not, calculate from text
        const textBefore = editorText.substring(0, Math.min(cursorPos, editorText.length));
        return textBefore.length + range.startOffset;
      } else if (
        range.startContainer.nodeName === "BR" ||
        (range.startContainer.parentNode && range.startContainer.parentNode.nodeName === "BR")
      ) {
        // Cursor is at or after a BR - find the BR position
        const brWalker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
          acceptNode: (n) => (n.nodeName === "BR" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
        });
        let brPos = 0;
        let brNode: Node | null = null;
        while ((brNode = brWalker.nextNode())) {
          if (brNode === range.startContainer || brNode.contains(range.startContainer)) {
            break;
          }
          brPos += 1;
        }
        // Count text before this BR
        const textWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let textPos = 0;
        let textNode: Node | null = null;
        while ((textNode = textWalker.nextNode())) {
          if (textNode.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) {
            break;
          }
          textPos += (textNode.textContent || "").length;
        }
        return textPos + brPos;
      }
    }

    // If we didn't find the cursor in the walker, try to calculate it differently
    if (!foundCursor && range.startContainer.nodeType === Node.TEXT_NODE) {
      // Fallback: calculate position by walking from the start
      const textBefore = editorText.substring(0, Math.min(cursorPos, editorText.length));
      return textBefore.length;
    }

    return cursorPos;
  };

  // Helper function to set cursor at a specific text position
  const setCursorAtPosition = (editor: HTMLDivElement, position: number, selection: Selection | null): void => {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return NodeFilter.FILTER_ACCEPT;
        }
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "BR") {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    let currentPos = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = (node.textContent || "").length;
        if (currentPos + nodeLength >= position) {
          targetNode = node;
          targetOffset = position - currentPos;
          break;
        }
        currentPos += nodeLength;
      } else if (node.nodeName === "BR") {
        if (currentPos >= position) {
          targetNode = node;
          targetOffset = 0;
          break;
        }
        currentPos += 1;
      }
    }

    if (targetNode && selection) {
      const newRange = document.createRange();
      if (targetNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
      } else {
        // For BR elements, insert before it
        newRange.setStartBefore(targetNode);
      }
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      editor.focus();
    }
  };

  const insertAttribute = (attrName: string, isNested = false, parentName?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();

      const selection = window.getSelection();
      let range: Range | null = null;

      if (selection && selection.rangeCount > 0) {
        const selectionRange = selection.getRangeAt(0);
        // Verify the selection is actually within the editor element
        if (editorRef.current.contains(selectionRange.commonAncestorContainer)) {
          range = selectionRange;
        }
      }

      // If no valid selection in the editor, create one at the end of editor content
      if (!range) {
        range = document.createRange();
        const editor = editorRef.current;

        if (editor.childNodes.length > 0) {
          const lastNode = editor.childNodes[editor.childNodes.length - 1];
          if (lastNode.nodeType === Node.TEXT_NODE) {
            const textLength = lastNode.textContent?.length || 0;
            range.setStart(lastNode, textLength);
            range.setEnd(lastNode, textLength);
          } else {
            const walker = document.createTreeWalker(lastNode, NodeFilter.SHOW_TEXT, null);
            let lastTextNode: Node | null = null;
            while (walker.nextNode()) {
              lastTextNode = walker.currentNode;
            }
            if (lastTextNode && lastTextNode.textContent) {
              const textLength = lastTextNode.textContent.length;
              range.setStart(lastTextNode, textLength);
              range.setEnd(lastTextNode, textLength);
            } else {
              range.setStartAfter(lastNode);
              range.setEndAfter(lastNode);
            }
          }
        } else {
          range.selectNodeContents(editor);
          range.collapse(true);
        }

        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      if (isNested && parentName) {
        const editor = editorRef.current;
        // Always get the current selection to ensure we have the latest cursor position
        // This is important because after auto-positioning, the range might have changed
        const currentSelection = window.getSelection();
        let currentRange: Range | null = null;

        if (currentSelection && currentSelection.rangeCount > 0) {
          const selRange = currentSelection.getRangeAt(0);
          // Verify the selection is within the editor
          if (editor.contains(selRange.commonAncestorContainer)) {
            currentRange = selRange;
          }
        }

        // Fallback to the passed range if no valid current selection
        if (!currentRange) {
          currentRange = range;
        }

        const editorText = getEditorText(editor);
        const cursorPos = getCursorPosition(editor, currentRange);

        // Escape special characters for regex
        const escParent = parentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const escAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Find all for loops for this parent
        const loopRegex = new RegExp(
          `{%\\s*for\\s+${escParent}\\s+in\\s+${escParent}\\s*%}([\\s\\S]*?){%\\s*endfor\\s*%}`,
          "g"
        );

        let match: RegExpExecArray | null;
        let cursorInsideLoop = false;

        // Check if cursor is inside any existing loop for this parent
        while ((match = loopRegex.exec(editorText)) !== null) {
          const loopStart = match.index;
          const loopEnd = loopStart + match[0].length;

          // Find where the opening tag ends and closing tag begins
          const openingTag = match[0].match(/{%\s*for\s+[^%]+%}/)?.[0] || "";
          const closingTag = match[0].match(/{%\s*endfor\s*%}/)?.[0] || "";

          const contentStart = loopStart + openingTag.length;
          const contentEnd = loopEnd - closingTag.length;

          // Check if cursor is between {% for %} and {% endfor %}
          // Use a more lenient check - cursor should be anywhere in the loop content area
          // Account for the fact that cursor might be on a new line (after BR tag)
          const tolerance = 10; // Increased tolerance to handle newlines and whitespace

          // Check if cursor position is within the loop content bounds
          // Allow cursor to be anywhere from just after {% for %} to just before {% endfor %}
          const isInRange = cursorPos >= contentStart - tolerance && cursorPos <= contentEnd + tolerance;

          if (isInRange) {
            cursorInsideLoop = true;

            // Check if this exact attribute already exists in this loop
            const attrPattern = new RegExp(`{{\\s*${escParent}\\.${escAttr}\\s*}}`, "i");

            if (attrPattern.test(match[1])) {
              // Attribute already exists, just move cursor to it
              const attrMatch = match[1].match(attrPattern);
              if (attrMatch) {
                const attrIndex = match[1].indexOf(attrMatch[0]);
                const attrPos = contentStart + attrIndex + attrMatch[0].length;
                setCursorAtPosition(editor, attrPos, selection);
              }
              return;
            }

            // Insert the attribute at current cursor position inside the loop
            range?.deleteContents();

            const insertText = `{{ ${parentName}.${attrName} }}`;
            const textNode = document.createTextNode(insertText);
            range?.insertNode(textNode);

            // Move cursor to the end of the inserted attribute
            // Position cursor at the end of the text node content to match cursor position calculation
            const newRange = document.createRange();
            newRange.setStart(textNode, textNode.textContent?.length || 0);
            newRange.collapse(true);

            selection?.removeAllRanges();
            selection?.addRange(newRange);
            editor.focus();
            return;
          }
        }

        // Cursor is NOT inside any existing loop for this parent
        // Create a new for loop block at cursor position
        if (!cursorInsideLoop) {
          range?.deleteContents();

          const loopLines = [
            `{% for ${parentName} in ${parentName} %}`,
            `  {{ ${parentName}.${attrName} }}`,
            `{% endfor %}`,
          ];

          const fragment = document.createDocumentFragment();
          let attributeTextNode: Text | null = null;

          loopLines.forEach((line, index) => {
            const textNode = document.createTextNode(line);
            fragment.appendChild(textNode);

            // Remember the text node containing the attribute (second line)
            if (index === 1) {
              attributeTextNode = textNode;
            }

            if (index < loopLines.length - 1) {
              fragment.appendChild(document.createElement("br"));
            }
          });

          range?.insertNode(fragment);

          // Move cursor to the end of the inserted attribute
          const newRange = document.createRange();
          if (attributeTextNode !== null) {
            // Position cursor at the end of the attribute text node content
            const textLength = (attributeTextNode as Text).textContent?.length || 0;
            newRange.setStart(attributeTextNode as Text, textLength);
          } else {
            // Fallback: set after the fragment's last child
            newRange.setStartAfter(fragment.lastChild!);
          }
          newRange.collapse(true);

          selection?.removeAllRanges();
          selection?.addRange(newRange);
          editor.focus();
          return;
        }
      } else {
        // Non-nested attribute - simple insertion
        range?.deleteContents();
        const textNode = document.createTextNode(`{{ ${attrName} }}`);
        range?.insertNode(textNode);

        // Move cursor to the end of the inserted attribute
        const newRange = document.createRange();
        newRange.setStart(textNode, textNode.textContent?.length || 0);
        newRange.collapse(true);

        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }

      editorRef.current.focus();
    }
  };

  const handleFormat = (command: string, value?: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!editorRef.current) return;

    editorRef.current.focus();

    // Undo and Redo don't require a selection - they work on the editor's history
    if (command === "undo" || command === "redo") {
      document.execCommand(command, false);
      editorRef.current.focus();
      return;
    }

    // For other commands, ensure we have a valid selection
    const selection = window.getSelection();
    let range: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range = null;
      }
    }

    if (!range) {
      range = document.createRange();
      const editor = editorRef.current;

      // Try to find the last text node or create a selection at the end
      if (editor.childNodes.length > 0) {
        const lastNode = editor.childNodes[editor.childNodes.length - 1];
        if (lastNode.nodeType === Node.TEXT_NODE) {
          const textLength = lastNode.textContent?.length || 0;
          range.setStart(lastNode, textLength);
          range.setEnd(lastNode, textLength);
        } else {
          // For block elements, try to find the last text node within
          const walker = document.createTreeWalker(lastNode, NodeFilter.SHOW_TEXT, null);
          let lastTextNode: Node | null = null;
          while (walker.nextNode()) {
            lastTextNode = walker.currentNode;
          }
          if (lastTextNode && lastTextNode.textContent) {
            const textLength = lastTextNode.textContent.length;
            range.setStart(lastTextNode, textLength);
            range.setEnd(lastTextNode, textLength);
          } else {
            range.setStartAfter(lastNode);
            range.setEndAfter(lastNode);
          }
        }
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // For list commands with collapsed selection, insert a list item with placeholder text
    if ((command === "insertUnorderedList" || command === "insertOrderedList") && range.collapsed) {
      // Insert a placeholder text so the list item has content
      const textNode = document.createTextNode("List item");
      range.insertNode(textNode);
      range.selectNodeContents(textNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // Execute the formatting command
    try {
      document.execCommand(command, false, value);
    } catch (error) {
      console.error("Format command failed:", error);
    }

    // Maintain focus after formatting
    editorRef.current.focus();
  };

  const handleCopy = async () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || "";
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    }
  };

  const handleDownload = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || "";
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    insertAttribute,
    handleCopy,
    handleDownload,
  }));

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Insert attribute</h2>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={(e) => handleFormat("formatBlock", "h1", e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold"
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={(e) => handleFormat("formatBlock", "h2", e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold"
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={(e) => handleFormat("formatBlock", "h3", e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold"
            title="Heading 3"
          >
            H3
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={(e) => handleFormat("bold", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            onClick={(e) => handleFormat("italic", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-sm italic"
            title="Italic"
          >
            I
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={(e) => handleFormat("insertUnorderedList", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            title="Unordered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            onClick={(e) => handleFormat("insertOrderedList", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            title="Ordered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
          </button>
          <button
            onClick={(e) => handleFormat("formatBlock", "blockquote", e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            title="Quote"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={(e) => handleFormat("undo", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>
          <button
            onClick={(e) => handleFormat("redo", undefined, e)}
            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Editable Text Area */}
      <div className="flex-1 overflow-auto p-6">
        <div
          ref={editorRef}
          contentEditable
          className="min-h-full w-full max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-6 focus:outline-none focus:ring-2 focus:ring-[var(--drt-green)] focus:border-transparent prose prose-sm"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {/* Default content - can be removed or customized */}
        </div>
      </div>
    </div>
  );
});

TemplateEditor.displayName = "TemplateEditor";

