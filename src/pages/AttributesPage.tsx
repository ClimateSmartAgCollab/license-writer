import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import {
  extractDetailedAttributes,
  extractFormAttributeOrder,
  type AttributeInfo,
} from "@/lib/oca/ocaPackageAttributes";
import { TbArrowLeft, TbCopy, TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { AttributeDetailsModal } from "@/components/AttributeDetailsModal";
import { AttributeListSidebar } from "@/components/AttributeListSidebar";
import {
  AdvancedTemplateEditor,
  type AdvancedTemplateEditorRef,
} from "@/components/AdvancedTemplateEditor";
import {
  BuilderTemplateEditor,
  type RepeatAttributeOption,
  type BuilderTemplateEditorRef,
} from "@/components/BuilderTemplateEditor";
import { getBuilderVariableSnippet } from "@/lib/template/builderAdapter";
import {
  builderPlainChunkToJinja,
  jinjaPlainChunkToBuilder,
  mapTipTapJsonTextNodes,
} from "@/lib/editor/editorTiptapBuilderJinjaJson";

function AttributesPage() {
  const {
    rawJsonData,
    jinjaText,
    builderText,
    templateWarnings,
    isBuilderLimited,
    builderWarning,
    builderRepeatContext,
    dispatchTemplateCommand,
  } = useApp();
  const navigate = useNavigate();
  const editorRef = useRef<AdvancedTemplateEditorRef>(null);
  const builderRef = useRef<BuilderTemplateEditorRef>(null);
  const pendingPlainInsertRef = useRef<{ at: number; text: string } | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeInfo | null>(null);
  const [mode, setMode] = useState<"builder" | "advanced">("builder");
  const [editorSwitchSeed, setEditorSwitchSeed] = useState<JSONContent | null>(null);
  const [cursorByMode, setCursorByMode] = useState({ builder: 0, advanced: 0 });

  useEffect(() => {
    pendingPlainInsertRef.current = null;
  }, [mode]);

  const switchToBuilder = useCallback(() => {
    if (mode === "builder") return;
    const seed =
      mode === "advanced" && editorRef.current
        ? mapTipTapJsonTextNodes(editorRef.current.getTipTapJSON(), jinjaPlainChunkToBuilder)
        : null;
    setEditorSwitchSeed(seed);
    setMode("builder");
  }, [mode]);

  const switchToAdvanced = useCallback(() => {
    if (mode === "advanced") return;
    const seed =
      mode === "builder" && builderRef.current
        ? mapTipTapJsonTextNodes(builderRef.current.getTipTapJSON(), builderPlainChunkToJinja)
        : null;
    setEditorSwitchSeed(seed);
    setMode("advanced");
  }, [mode]);

  const attributes = useMemo(() => extractDetailedAttributes(rawJsonData), [rawJsonData]);
  const formAttributeOrder = useMemo(() => extractFormAttributeOrder(rawJsonData), [rawJsonData]);
  const repeatAttributeOptions = useMemo<RepeatAttributeOption[]>(
    () =>
      attributes
        .filter((attr) => attr.isReference && (attr.nestedAttributes?.length ?? 0) > 0)
        .map((attr) => ({
          name: attr.name,
          nestedAttributes: (attr.nestedAttributes ?? []).map((nested) => nested.name),
        })),
    [attributes],
  );

  const repeatParentAttribute = useMemo(
    () =>
      builderRepeatContext
        ? attributes.find((attr) => attr.name === builderRepeatContext.parentName)
        : undefined,
    [attributes, builderRepeatContext],
  );

  const sidebarAttributes = useMemo(
    () =>
      mode === "builder" && repeatParentAttribute?.nestedAttributes
        ? repeatParentAttribute.nestedAttributes
        : attributes,
    [attributes, mode, repeatParentAttribute],
  );

  const sidebarAttributeOrder = useMemo(
    () =>
      mode === "builder" && repeatParentAttribute?.nestedAttributes
        ? repeatParentAttribute.nestedAttributes.map((nested) => nested.name)
        : formAttributeOrder,
    [formAttributeOrder, mode, repeatParentAttribute],
  );

  const handleInsertAttribute = useCallback(
    (attrName: string, isNested = false, parentName?: string) => {
      const liveCursor =
        mode === "builder"
          ? builderRef.current?.getPlainTextCursorOffset()
          : editorRef.current?.getPlainTextCursorOffset();
      const cursorForInsert = liveCursor ?? cursorByMode[mode];
      const rawLive =
        mode === "builder"
          ? (builderRef.current?.getText() ?? "")
          : (editorRef.current?.getText() ?? "");
      const storePlain = mode === "builder" ? builderText : jinjaText;
      // `??` only replaces null/undefined — not "". First interaction often has getText()==="" while ref/cursor are stale vs typed bytes; that forced insertAt("", …, cursor>0) → clamp to 0 and corrupted jinja/builder mixes.
      const basePlainText = rawLive.length > 0 ? rawLive : storePlain;

      if (mode === "builder" && !isBuilderLimited) {
        pendingPlainInsertRef.current = {
          at: cursorForInsert,
          text: getBuilderVariableSnippet(
            attrName,
            isNested,
            parentName,
            builderRepeatContext,
          ),
        };
      } else if (mode === "advanced" && !isNested) {
        pendingPlainInsertRef.current = {
          at: cursorForInsert,
          text: `{{ ${attrName} }}`,
        };
      } else {
        pendingPlainInsertRef.current = null;
      }
      const insertNonce = crypto.randomUUID();
      dispatchTemplateCommand({
        type: "insert_variable",
        payload: {
          mode,
          cursorOffset: cursorForInsert,
          attrName,
          isNested,
          parentName,
          basePlainText,
          insertNonce,
        },
      });
    },
    [
      builderRepeatContext,
      builderText,
      cursorByMode,
      dispatchTemplateCommand,
      isBuilderLimited,
      jinjaText,
      mode,
    ],
  );

  const handleInsertNested = useCallback(
    (nestedName: string, parentName: string) => {
      handleInsertAttribute(nestedName, true, parentName);
    },
    [handleInsertAttribute],
  );

  const getActiveEditorRef = useCallback(
    () => (mode === "advanced" ? editorRef.current : builderRef.current),
    [mode],
  );

  const handleCopy = useCallback(async () => {
    await getActiveEditorRef()?.handleCopy();
  }, [getActiveEditorRef]);

  const handleDownloadTxt = useCallback(() => {
    getActiveEditorRef()?.handleDownloadTxt();
  }, [getActiveEditorRef]);

  const handleDownloadMarkdown = useCallback(() => {
    getActiveEditorRef()?.handleDownloadMarkdown();
  }, [getActiveEditorRef]);

  const handleInsertForBlock = useCallback(
    (parentName: string, nestedAttributes: string[]) => {
      const cursorForInsert =
        builderRef.current?.getPlainTextCursorOffset() ?? cursorByMode.builder;
      const rawLive = builderRef.current?.getText() ?? "";
      const basePlainText = rawLive.length > 0 ? rawLive : builderText;
      const insertNonce = crypto.randomUUID();
      dispatchTemplateCommand({
        type: "insert_for_block",
        payload: {
          parentName,
          nestedAttributes,
          cursorOffset: cursorForInsert,
          basePlainText,
          insertNonce,
        },
      });
    },
    [builderText, cursorByMode.builder, dispatchTemplateCommand],
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
              <h1 className="text-lg font-semibold">Schema-assisted template</h1>
              <p className="text-sm opacity-90">
                Upload an OCA package on the home page, then return here to insert fields from your
                schema.
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
            <h1 className="text-lg font-semibold">Schema-assisted template</h1>
            <p className="text-sm opacity-90">
              Insert attributes from your OCA package to build your Jinja template.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={switchToBuilder}
            className={`px-4 py-2 ${
              mode === "builder"
                ? "bg-white text-[var(--drt-green)] hover:bg-gray-100"
                : "bg-[var(--drt-green-dark)] text-white hover:bg-[var(--drt-green-dark)]/90"
            }`}
          >
            Builder mode
          </Button>
          <Button
            onClick={switchToAdvanced}
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
      {mode === "builder" && isBuilderLimited && builderWarning && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-amber-950 text-sm">
          {builderWarning}
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
          <BuilderTemplateEditor
            ref={builderRef}
            repeatAttributeOptions={repeatAttributeOptions}
            currentRepeatContext={builderRepeatContext}
            onInsertForBlock={handleInsertForBlock}
            onClearRepeatContext={() => {
              dispatchTemplateCommand({
                type: "set_builder_context",
                payload: { context: null },
              });
            }}
            initialContent={builderText}
            onContentChange={(text) => {
              dispatchTemplateCommand({
                type: "set_from_builder_text",
                payload: { text },
              });
            }}
            onCursorChange={(offset) =>
              setCursorByMode((current) => ({ ...current, builder: offset }))
            }
            isReadOnly={isBuilderLimited}
            pendingPlainInsertRef={pendingPlainInsertRef}
            initialDocJson={mode === "builder" ? editorSwitchSeed : null}
          />
        ) : (
          <AdvancedTemplateEditor
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
            pendingPlainInsertRef={pendingPlainInsertRef}
            initialDocJson={mode === "advanced" ? editorSwitchSeed : null}
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
