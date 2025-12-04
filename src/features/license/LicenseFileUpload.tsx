import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "@/components/common/FileUpload";
import { TbPackage, TbUpload, TbArrowRight } from "react-icons/tb";
import { useApp } from "@/App";
import { extractAttributesFromOCA, calculateSchemaLevels, validateSchemaLevels } from "@/lib/utils";
import type { OCAPackage } from "@/types/oca";
import { Button } from "@/components/ui/button";

const MAX_SCHEMA_LEVEL = 2; 

function LicenseFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [schemaLevels, setSchemaLevels] = useState<number>(0);
  const { attributes, rawJsonData, setAttributes, setRawJsonData } = useApp();
  const navigate = useNavigate();

  const hasExistingData = attributes.length > 0 || rawJsonData !== null;

  // Calculate schema levels when component loads with existing data
  useEffect(() => {
    if (rawJsonData && !file) {
      const levels = calculateSchemaLevels(rawJsonData);
      setSchemaLevels(levels);
    }
  }, [rawJsonData, file]);

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);

    if (!selectedFile) {
      return;
    }

    setIsProcessing(true);

    try {
      const fileContent = await readFileAsText(selectedFile);

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error("Invalid JSON file. Please upload a valid JSON file.");
      }

      if (!parsedData || typeof parsedData !== "object") {
        throw new Error("Invalid JSON structure. Expected an object.");
      }

      const extractedAttributes = extractAttributesFromOCA(parsedData);

      if (extractedAttributes.length === 0) {
        throw new Error(
          "No attributes found in the OCA Package. Please check the file structure."
        );
      }

      const ocaPackage = parsedData as OCAPackage;

      const levels = calculateSchemaLevels(ocaPackage);
      setSchemaLevels(levels);

      const validation = validateSchemaLevels(ocaPackage, MAX_SCHEMA_LEVEL);
      if (!validation.isValid) {
        throw new Error(validation.error || "Schema validation failed");
      }

      // Store in context
      setAttributes(extractedAttributes);
      setRawJsonData(ocaPackage);

      console.log("License file processed successfully:", {
        fileName: selectedFile.name,
        attributesCount: extractedAttributes.length,
        schemaLevels: levels,
        attributes: extractedAttributes,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process file";
      setError(errorMessage);
      console.error("Error processing license file:", err);
    } finally {
      setIsProcessing(false);
    }
  };


  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          resolve(event.target.result);
        } else {
          reject(new Error("Failed to read file content"));
        }
      };
      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="flex flex-col gap-4">

      <FileUpload
        title="OCA Package"
        icon={<TbPackage />}
        uploadIcon={<TbUpload />}
        description="Upload your questionnaire to populate the list of attributes that can be used in the license (OCA Package)"
        onFileSelect={handleFileSelect}
        accept=".json,.oca"
        selectedFileName={
          (file || hasExistingData) && !error && !isProcessing ? file?.name || undefined : undefined
        }
        selectedFileInfo={
          (file || hasExistingData) && !error && !isProcessing
            ? {
                schemaLevels: schemaLevels || (rawJsonData ? calculateSchemaLevels(rawJsonData) : 0),
                nextStepMessage:
                  "Ready to proceed to the next step. You can upload a new file to replace the existing data.",
              }
            : null
        }
      />
      {isProcessing && (
        <p className="text-sm text-[var(--drt-green-dark)] text-center">
          Processing file...
        </p>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {(file || hasExistingData) && !error && !isProcessing && (
        <div className="flex justify-center">
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

export default LicenseFileUpload;

