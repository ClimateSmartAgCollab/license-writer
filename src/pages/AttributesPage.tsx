import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { extractDetailedAttributes, type AttributeInfo } from "@/lib/utils";
import { TbArrowLeft, TbSearch, TbInfoCircle, TbCopy, TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { AttributeDetailsModal } from "@/components/AttributeDetailsModal";

function AttributesPage() {
  const { rawJsonData } = useApp();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [templateContent, setTemplateContent] = useState("");
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeInfo | null>(null);

  const attributes = extractDetailedAttributes(rawJsonData);
  const filteredAttributes = attributes.filter((attr) =>
    attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attr.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!rawJsonData) {
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-[var(--drt-green)] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1 hover:bg-[var(--drt-green-dark)] rounded transition-colors"
              aria-label="Back"
            >
              <TbArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Template Editor</h1>
              <p className="text-sm opacity-90">
                Insert attributes to build your Jinja template.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <p className="text-lg text-gray-600 mb-4">
              No OCA Package data found. Please upload an OCA Package file first.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-[var(--drt-green)] text-white hover:bg-[var(--drt-green-dark)]"
            >
              Go to Upload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const toggleAttributeExpansion = (attrName: string) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attrName)) {
      newExpanded.delete(attrName);
    } else {
      newExpanded.add(attrName);
    }
    setExpandedAttributes(newExpanded);
  };

  const insertAttribute = (attrName: string, isNested = false, parentName?: string) => {
    const placeholder = isNested && parentName
      ? `{{ ${parentName}.${attrName} }}`
      : `{{ ${attrName} }}`;
    
    if (editorRef.current) {
      // Ensure the editor is focused first
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
            const walker = document.createTreeWalker(
              lastNode,
              NodeFilter.SHOW_TEXT,
              null
            );
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
      
      range.deleteContents();
      const textNode = document.createTextNode(placeholder);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      editorRef.current.focus();
      updateTemplateContent();
    }
  };

  const updateTemplateContent = () => {
    if (editorRef.current) {
      setTemplateContent(editorRef.current.innerHTML);
    }
  };

  const handleFormat = (command: string, value?: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!editorRef.current) return;
    
    // Ensure the editor is focused
    editorRef.current.focus();
    
    // Undo and Redo don't require a selection - they work on the editor's history
    if (command === "undo" || command === "redo") {
      document.execCommand(command, false);
      updateTemplateContent();
      editorRef.current.focus();
      return;
    }
    
    // For other commands, ensure we have a valid selection
    const selection = window.getSelection();
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      // Check if the selection is within the editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range = null;
      }
    }
    
    // If no valid selection, create one at the cursor position or end of content
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
          const walker = document.createTreeWalker(
            lastNode,
            NodeFilter.SHOW_TEXT,
            null
          );
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
        range.collapse(false); // Collapse to end
      }
      
      // Set the selection
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
      updateTemplateContent();
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

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.addEventListener("input", updateTemplateContent);
      return () => {
        editorRef.current?.removeEventListener("input", updateTemplateContent);
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Green Header Bar */}
      <div className="bg-[var(--drt-green)] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1 hover:bg-[var(--drt-green-dark)] rounded transition-colors"
            aria-label="Back"
          >
            <TbArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Template Editor</h1>
            <p className="text-sm opacity-90">
              Insert attributes to build your Jinja template.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownload}
            className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
          >
            <TbDownload className="w-4 h-4" />
            <span>Download Template</span>
          </Button>
          <Button
            onClick={handleCopy}
            className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
          >
            <TbCopy className="w-4 h-4" />
            <span>Copy</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Attribute List */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Attribute List</h2>
            <div className="relative">
              <TbSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search attributes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--drt-green)] focus:border-transparent"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {filteredAttributes.length} of {attributes.length} attributes
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredAttributes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No attributes found
              </p>
            ) : (
              <div className="space-y-3">
                {filteredAttributes.map((attr) => (
                  <AttributeCard
                    key={attr.name}
                    attribute={attr}
                    onInsert={() => insertAttribute(attr.name)}
                    onToggleExpand={() => toggleAttributeExpansion(attr.name)}
                    isExpanded={expandedAttributes.has(attr.name)}
                    onInsertNested={(nestedName) => insertAttribute(nestedName, true, attr.name)}
                    onViewDetails={() => setSelectedAttribute(attr)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={(e) => handleFormat("insertOrderedList", undefined, e)}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Ordered List"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </button>
              <button
                onClick={(e) => handleFormat("formatBlock", "blockquote", e)}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Quote"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={(e) => handleFormat("undo", undefined, e)}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Undo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={(e) => handleFormat("redo", undefined, e)}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Redo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
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
      </div>

      {/* Attribute Details Modal */}
      <AttributeDetailsModal
        attribute={selectedAttribute}
        onClose={() => setSelectedAttribute(null)}
        onInsert={(attrName, isNested, parentName) => {
          insertAttribute(attrName, isNested, parentName);
          setSelectedAttribute(null);
        }}
      />
    </div>
  );
}

interface AttributeCardProps {
  attribute: AttributeInfo;
  onInsert: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  onInsertNested: (nestedName: string) => void;
  onViewDetails: () => void;
}

function AttributeCard({ attribute, onInsert, onToggleExpand, isExpanded, onInsertNested, onViewDetails }: AttributeCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[var(--drt-green)] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{attribute.name}</span>
          {attribute.isArray && (
            <span className="px-2 py-0.5 bg-[var(--drt-green-light)] text-[var(--drt-green-dark)] text-xs font-medium rounded">
              Array
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{attribute.label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors border border-gray-300"
          title="View details"
        >
          <TbInfoCircle className="w-4 h-4" />
          <span>Details</span>
        </button>
        <button
          onClick={onInsert}
          className="flex items-center gap-1 px-3 py-1 bg-[var(--drt-green)] text-white text-sm rounded hover:bg-[var(--drt-green-dark)] transition-colors"
        >
          <span>+</span>
          <span>Insert</span>
        </button>
      </div>
      {attribute.isArray && attribute.nestedAttributes && attribute.nestedAttributes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 w-full"
          >
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &gt;
            </span>
            <span>Nested Attributes ({attribute.nestedAttributes.length})</span>
          </button>
          {isExpanded && (
            <div className="mt-2 space-y-2 pl-6">
              {attribute.nestedAttributes.map((nested) => (
                <div key={nested.name} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{nested.name}</span>
                    <p className="text-xs text-gray-500">{nested.description}</p>
                  </div>
                  <button
                    onClick={() => onInsertNested(nested.name)}
                    className="px-2 py-1 bg-[var(--drt-green)] text-white text-xs rounded hover:bg-[var(--drt-green-dark)] transition-colors"
                  >
                    + Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AttributesPage;
