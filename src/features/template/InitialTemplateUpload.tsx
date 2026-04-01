import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import FileUpload from "@/components/common/FileUpload";
import { TbArrowRight, TbLicense, TbUpload } from "react-icons/tb";
import { Button } from "@/components/ui/button";

function InitialTemplateUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { dispatchTemplateCommand } = useApp();
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

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);

    if (!selectedFile) {
      return;
    }

    setIsProcessing(true);
    try {
      const rawText = await readFileAsText(selectedFile);
      const normalizedText = rawText.replace(/\r\n/g, "\n");

      if (!normalizedText.trim()) {
        throw new Error("Template file is empty. Please upload a file with template content.");
      }

      dispatchTemplateCommand({
        type: "set_builder_context",
        payload: { context: null },
      });
      dispatchTemplateCommand({
        type: "set_from_advanced_text",
        payload: { text: normalizedText },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process template file.";
      setError(errorMessage);
      setFile(null);
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        title="License Template (Optional)"
        icon={<TbLicense />}
        uploadIcon={<TbUpload />}
        description="Upload an existing template source file to continue editing it in Builder/Advanced mode."
        onFileSelect={handleFileSelect}
        accept=".txt,.md,.template,.jinja,.j2"
        selectedFileName={file?.name}
        selectedFileInfo={
          file && !error && !isProcessing
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
      {file && !error && !isProcessing && (
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={() => navigate("/attributes")}
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
