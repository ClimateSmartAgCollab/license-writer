import FileUpload from "@/components/common/FileUpload";
import { TbLicense, TbUpload } from "react-icons/tb";

function TemplateFileUpload() {
  const handleFileSelect = (selectedFile: File | null) => {
    // TODO: In the next step, parse raw template text and dispatch to template store.
    if (selectedFile) {
      console.log("Template file selected:", selectedFile.name);
    }
  };

  return (
    <FileUpload
      title="License Template (Optional)"
      icon={<TbLicense />}
      uploadIcon={<TbUpload />}
      description="Upload an existing template source file to continue editing it in Builder/Advanced mode."
      onFileSelect={handleFileSelect}
      accept=".txt,.md,.template,.jinja,.j2"
    />
  );
}

export default TemplateFileUpload;

