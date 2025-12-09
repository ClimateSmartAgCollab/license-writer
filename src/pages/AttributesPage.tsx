import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { extractDetailedAttributes, type AttributeInfo } from "@/lib/utils";
import { TbArrowLeft, TbCopy, TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { AttributeDetailsModal } from "@/components/AttributeDetailsModal";
import { AttributeListSidebar } from "@/components/AttributeListSidebar";
import { TemplateEditor, type TemplateEditorRef } from "@/components/TemplateEditor";

function AttributesPage() {
  const { rawJsonData } = useApp();
  const navigate = useNavigate();
  const editorRef = useRef<TemplateEditorRef>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeInfo | null>(null);

  const attributes = extractDetailedAttributes(rawJsonData);

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
    editorRef.current?.insertAttribute(attrName, isNested, parentName);
  };

  const handleInsertNested = (nestedName: string, parentName: string) => {
    editorRef.current?.insertAttribute(nestedName, true, parentName);
  };

  const handleCopy = async () => {
    await editorRef.current?.handleCopy();
  };

  const handleDownload = () => {
    editorRef.current?.handleDownload();
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
        <AttributeListSidebar
          attributes={attributes}
          onInsert={handleInsertAttribute}
          onInsertNested={handleInsertNested}
          onViewDetails={setSelectedAttribute}
        />

        {/* Main Editor Area */}
        <TemplateEditor ref={editorRef} />
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
