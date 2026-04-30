import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { TbArrowLeft, TbCopy, TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import {
  AdvancedTemplateEditor,
  type AdvancedTemplateEditorRef,
} from "@/components/AdvancedTemplateEditor";
import {
  BuilderTemplateEditor,
  type BuilderTemplateEditorRef,
} from "@/components/BuilderTemplateEditor";
import {
  builderPlainChunkToJinja,
  jinjaPlainChunkToBuilder,
  mapTipTapJsonTextNodes,
} from "@/lib/editor/editorTiptapBuilderJinjaJson";
import {
  buildLicenseTemplateRecord,
  saidifyRecord,
  verifyRecord,
  toSaidJsonString,
  downloadTextFile,
} from "@/lib/said/licenseTemplateRecord";

function TemplateEditorPage() {
  const {
    jinjaText,
    builderText,
    templateWarnings,
    isBuilderLimited,
    builderRepeatContext,
    dispatchTemplateCommand,
  } = useApp();
  const navigate = useNavigate();
  const editorRef = useRef<AdvancedTemplateEditorRef>(null);
  const builderRef = useRef<BuilderTemplateEditorRef>(null);
  const pendingPlainInsertRef = useRef<{ at: number; text: string } | null>(null);
  const [mode, setMode] = useState<"builder" | "advanced">("builder");
  const [editorSwitchSeed, setEditorSwitchSeed] = useState<JSONContent | null>(null);
  const [cursorByMode, setCursorByMode] = useState({ builder: 0, advanced: 0 });
  const [saidError, setSaidError] = useState<string | null>(null);

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

  const handleDownloadSaidJson = useCallback(() => {
    try {
      setSaidError(null);
      const record = buildLicenseTemplateRecord({
        jinjaText,
        // TemplateEditorPage has no OCA package — unlike AttributesPage,
        // ocaPackageD is always null and attributeNames is always empty.
        // The exported SAID identifies a template-only artifact with no
        // cryptographic link to any OCA.
        ocaPackageD: null,
        attributeNames: [],
      });
      const sad = saidifyRecord(record);
      if (!verifyRecord(sad)) {
        setSaidError(
          "SAID verification failed after compute. Export aborted — the digest does not match its own content.",
        );
        return;
      }
      const json = toSaidJsonString(sad);
      downloadTextFile(
        "license_template.said.json",
        json,
        "application/json",
      );
    } catch (err) {
      setSaidError(
        `SAID export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [jinjaText]);

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
              Edit your Jinja template without an OCA package.
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
            onClick={handleDownloadSaidJson}
            className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
          >
            <TbDownload className="w-4 h-4" />
            <span>Download SAID JSON</span>
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
      {saidError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-900 text-sm flex items-center justify-between">
          <span>{saidError}</span>
          <button
            onClick={() => setSaidError(null)}
            className="text-red-700 hover:text-red-900 underline text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {mode === "builder" ? (
          <BuilderTemplateEditor
            ref={builderRef}
            repeatAttributeOptions={[]}
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
    </div>
  );
}

export default TemplateEditorPage;
