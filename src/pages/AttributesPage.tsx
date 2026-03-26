import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import {
  extractDetailedAttributes,
  extractFormAttributeOrder,
  type AttributeInfo,
} from "@/lib/utils";
import { TbArrowLeft, TbCopy, TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { AttributeDetailsModal } from "@/components/AttributeDetailsModal";
import { AttributeListSidebar } from "@/components/AttributeListSidebar";
import { TemplateEditor, type TemplateEditorRef } from "@/components/TemplateEditor";
import {
  TemplateBuilder,
  type RepeatAttributeOption,
  type TemplateBuilderRef,
} from "@/components/TemplateBuilder";

function AttributesPage() {
  const {
    rawJsonData,
    jinjaText,
    templateWarnings,
    builderRepeatContext,
    dispatchTemplateCommand,
  } = useApp();
  const navigate = useNavigate();
  const editorRef = useRef<TemplateEditorRef>(null);
  const builderRef = useRef<TemplateBuilderRef>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeInfo | null>(null);
  const [mode, setMode] = useState<"builder" | "advanced">("builder");
  const [cursorByMode, setCursorByMode] = useState({ builder: 0, advanced: 0 });

  const attributes = extractDetailedAttributes(rawJsonData);
  const formAttributeOrder = extractFormAttributeOrder(rawJsonData);
  const repeatAttributeOptions: RepeatAttributeOption[] = attributes
    .filter((attr) => attr.isReference && (attr.nestedAttributes?.length ?? 0) > 0)
    .map((attr) => ({
      name: attr.name,
      nestedAttributes: (attr.nestedAttributes ?? []).map((nested) => nested.name),
    }));

  const repeatParentAttribute = builderRepeatContext
    ? attributes.find((attr) => attr.name === builderRepeatContext.parentName)
    : undefined;

  const sidebarAttributes =
    mode === "builder" && repeatParentAttribute?.nestedAttributes
      ? repeatParentAttribute.nestedAttributes
      : attributes;

  const sidebarAttributeOrder =
    mode === "builder" && repeatParentAttribute?.nestedAttributes
      ? repeatParentAttribute.nestedAttributes.map((nested) => nested.name)
      : formAttributeOrder;

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
              <p className="text-sm opacity-90">Insert attributes to build your Jinja template.</p>
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

  const handleInsertAttribute = (attrName: string, isNested = false, parentName?: string) => {
    dispatchTemplateCommand({
      type: "insert_variable",
      payload: {
        mode,
        cursorOffset: cursorByMode[mode],
        attrName,
        isNested,
        parentName,
      },
    });
  };

  const handleInsertNested = (nestedName: string, parentName: string) => {
    handleInsertAttribute(nestedName, true, parentName);
  };

  const handleCopy = async () => {
    if (mode === "advanced") {
      await editorRef.current?.handleCopy();
      return;
    }

    await builderRef.current?.handleCopy();
  };

  const handleDownloadTxt = () => {
    if (mode === "advanced") {
      editorRef.current?.handleDownloadTxt();
      return;
    }

    builderRef.current?.handleDownloadTxt();
  };

  const handleDownloadMarkdown = () => {
    if (mode === "advanced") {
      editorRef.current?.handleDownloadMarkdown();
      return;
    }

    builderRef.current?.handleDownloadMarkdown();
  };

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
            <p className="text-sm opacity-90">Insert attributes to build your Jinja template.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setMode("builder")}
            className={`px-4 py-2 ${
              mode === "builder"
                ? "bg-white text-[var(--drt-green)] hover:bg-gray-100"
                : "bg-[var(--drt-green-dark)] text-white hover:bg-[var(--drt-green-dark)]/90"
            }`}
          >
            Builder mode
          </Button>
          <Button
            onClick={() => setMode("advanced")}
            className={`px-4 py-2 ${
              mode === "advanced"
                ? "bg-white text-[var(--drt-green)] hover:bg-gray-100"
                : "bg-[var(--drt-green-dark)] text-white hover:bg-[var(--drt-green-dark)]/90"
            }`}
          >
            Advanced mode
          </Button>
          <Button
            onClick={handleDownloadTxt}
            className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
          >
            <TbDownload className="w-4 h-4" />
            <span>Download TXT</span>
          </Button>
          <Button
            onClick={handleDownloadMarkdown}
            className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
          >
            <TbDownload className="w-4 h-4" />
            <span>Download Markdown</span>
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
      {templateWarnings.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-sm">
          {templateWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Attribute List */}
        <AttributeListSidebar
          attributes={sidebarAttributes}
          attributeOrder={sidebarAttributeOrder}
          onInsert={handleInsertAttribute}
          onInsertNested={handleInsertNested}
          onViewDetails={setSelectedAttribute}
        />

        {/* Main Editor Area */}
        {mode === "builder" ? (
          <TemplateBuilder
            ref={builderRef}
            repeatAttributeOptions={repeatAttributeOptions}
            currentRepeatContext={builderRepeatContext}
            onInsertForBlock={(parentName, nestedAttributes) => {
              dispatchTemplateCommand({
                type: "insert_for_block",
                payload: {
                  parentName,
                  nestedAttributes,
                  cursorOffset: cursorByMode.builder,
                },
              });
            }}
            onClearRepeatContext={() => {
              dispatchTemplateCommand({
                type: "set_builder_context",
                payload: { context: null },
              });
            }}
            initialContent={jinjaText}
            onContentChange={(text) => {
              dispatchTemplateCommand({
                type: "set_from_advanced_text",
                payload: { text },
              });
            }}
            onCursorChange={(offset) =>
              setCursorByMode((current) => ({ ...current, builder: offset }))
            }
          />
        ) : (
          <TemplateEditor
            ref={editorRef}
            initialContent={jinjaText}
            onContentChange={(text) => {
              dispatchTemplateCommand({
                type: "set_from_advanced_text",
                payload: { text },
              });
            }}
            onCursorChange={(offset) =>
              setCursorByMode((current) => ({ ...current, advanced: offset }))
            }
          />
        )}
      </div>

      {/* Attribute Details Modal */}
      <AttributeDetailsModal
        attribute={selectedAttribute}
        onClose={() => setSelectedAttribute(null)}
        onInsert={(attrName, isNested, parentName) => {
          handleInsertAttribute(attrName, isNested, parentName);
          setSelectedAttribute(null);
        }}
      />
    </div>
  );
}

export default AttributesPage;
