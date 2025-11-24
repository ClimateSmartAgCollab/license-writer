import { useState } from "react";
import FileUpload from "@/components/common/FileUpload";
import { TbPackage, TbUpload } from "react-icons/tb";

function LicenseFileUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    // Add your license-specific file processing logic here
    if (selectedFile) {
      console.log("License file selected:", selectedFile.name); 
      // Process the license file (e.g., parse, validate, etc.)
    }
  };

  return (
    <FileUpload
      title="OCA Package"
      icon={<TbPackage />}
      uploadIcon={<TbUpload />}
      description="Upload your questionnaire to populate the list of attributes that can be used in the license (OCA Package)"
      onFileSelect={handleFileSelect}
      accept=".json,.oca"
    />
  );
}

export default LicenseFileUpload;

