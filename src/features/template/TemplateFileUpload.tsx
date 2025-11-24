import { useState } from "react";
import FileUpload from "@/components/common/FileUpload";
import { TbLicense, TbUpload } from "react-icons/tb";

function TemplateFileUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    // Add your template-specific file processing logic here 
    if (selectedFile) {
      console.log("Template file selected:", selectedFile.name);
      // Process the template file (e.g., parse, validate, etc.)
    }
  };

  return (
    <FileUpload
      title="License Template (Optional)"
      icon={<TbLicense />}
      uploadIcon={<TbUpload />}
      description="Upload your existing license template that you want to update/edit"
      onFileSelect={handleFileSelect}
      accept=".json,.template"
    />
  );
}

export default TemplateFileUpload;

