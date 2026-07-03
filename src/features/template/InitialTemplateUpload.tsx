import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import FileUpload from "@/components/common/FileUpload";
import { TbArrowRight, TbLicense, TbUpload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import {
  detectAndParseSaidJson,
  resolveSaidJsonUpload,
} from "@/lib/said/licenseTemplateRecord";

function messageForSaidParseFailure(reason: string): string {
  switch (reason) {
    case "not JSON":
      return "The selected .json file could not be parsed. Please ensure it is a valid SAID JSON file produced by License Writer.";
    case "missing required fields":
      return "The selected JSON file does not appear to be a SAID license template. Required fields (d, jinja, type) are missing.";
    default:
      return `Could not load SAID JSON file: ${reason}.`;
  }
}

function InitialTemplateUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConfirmJinja, setPendingConfirmJinja] = useState<string | null>(
    null,
  );
  const {
    dispatchTemplateCommand,
    setAttributes,
    setRawJsonData,
    setTemplateImportSaidVerified,
  } = useApp();
  const navigate = useNavigate();

  const readFileAsText = (inputFile: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          resolve(event.target.result);
          return;
        }
        reject(new Error("Failed to read template file content."));
      };
      reader.onerror = () => {
        reject(new Error("Error reading template file."));
      };
      reader.readAsText(inputFile);
    });

  const loadTemplateJinja = (normalizedJinja: string, saidVerified: boolean) => {
    setAttributes([]);
    setRawJsonData(null);
    dispatchTemplateCommand({ type: "reset_template" });
    setTemplateImportSaidVerified(saidVerified);
    dispatchTemplateCommand({
      type: "set_from_advanced_text",
      payload: { text: normalizedJinja },
    });
  };

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    setPendingConfirmJinja(null);

    if (!selectedFile) {
      return;
    }

    setIsProcessing(true);
    try {
      const rawText = await readFileAsText(selectedFile);
      const isJsonExtension = selectedFile.name.toLowerCase().endsWith(".json");

      if (isJsonExtension) {
        const result = detectAndParseSaidJson(rawText);
        if (!result.valid) {
          throw new Error(messageForSaidParseFailure(result.reason));
        }
        const normalizedJinja = result.record.jinja.replace(/\r\n/g, "\n");
        if (resolveSaidJsonUpload(result) === "confirm") {
          setPendingConfirmJinja(normalizedJinja);
          return;
        }
        loadTemplateJinja(normalizedJinja, result.saidVerified);
      } else {
        const normalizedText = rawText.replace(/\r\n/g, "\n");
        if (!normalizedText.trim()) {
          throw new Error("Template file is empty. Please upload a file with template content.");
        }
        setAttributes([]);
        setRawJsonData(null);
        dispatchTemplateCommand({ type: "reset_template" });
        dispatchTemplateCommand({
          type: "set_from_advanced_text",
          payload: { text: normalizedText },
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process template file.";
      setError(errorMessage);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmLoad = () => {
    if (!pendingConfirmJinja) {
      return;
    }
    loadTemplateJinja(pendingConfirmJinja, false);
    setPendingConfirmJinja(null);
  };

  const handleCancelConfirm = () => {
    setPendingConfirmJinja(null);
    setFile(null);
  };

  const isLoaded = file && !error && !isProcessing && !pendingConfirmJinja;

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        title="License Template (Optional)"
        icon={<TbLicense />}
        uploadIcon={<TbUpload />}
        description="Upload an existing template source file to continue editing it in Builder/Advanced mode."
        onFileSelect={handleFileSelect}
        accept=".txt,.md,.template,.jinja,.j2,.json"
        selectedFileName={file?.name}
        selectedFileInfo={
          isLoaded
            ? {
                successMessage: "Template loaded successfully.",
                nextStepMessage:
                  "You can now continue to the next step and tweak this template in Builder or Advanced mode.",
              }
            : null
        }
      />
      {isProcessing && (
        <p className="text-sm text-[var(--drt-green-dark)] text-center">
          Processing template file...
        </p>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {pendingConfirmJinja && file && !error && !isProcessing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-amber-900">
            This template failed SAID verification. It may have been edited or
            corrupted outside License Writer. Load it anyway?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleConfirmLoad}
              className="bg-[var(--drt-green)] text-white hover:bg-[var(--drt-green-dark)]"
            >
              Load anyway
            </Button>
            <Button onClick={handleCancelConfirm} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}
      {isLoaded && (
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={() => navigate("/template-editor", { replace: true })}
            className="bg-[var(--drt-green)] text-white hover:bg-[var(--drt-green-dark)] px-6 py-2"
          >
            <span>Next</span>
            <TbArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

export default InitialTemplateUpload;
