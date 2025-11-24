import { Button } from "../ui/button";
import { useDropzone } from "react-dropzone";


const DEFAULT_UPLOAD_HINT = "Drag and drop your file here, or click to browse";
const DEFAULT_BUTTON_TEXT = "Choose File";

interface FileUploadProps {
  title: string;
  icon: React.ReactNode;
  uploadIcon: React.ReactNode;
  description: string;
  uploadHint?: string;
  buttonText?: string;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
}

const HeaderSection = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="flex align-middle items-start justify-start">
    <div className="flex items-center justify-center text-[var(--drt-green)] text-2xl p-1 mr-2">
      {icon}
    </div>
    <h1 className="text-2xl text-[var(--drt-green)]">{title}</h1>
  </div>
);

const UploadArea = ({
  uploadIcon,
  description,
  uploadHint = DEFAULT_UPLOAD_HINT,
}: {
  uploadIcon: React.ReactNode;
  description: string;
  uploadHint?: string;
}) => (
  <div className="flex flex-col items-center justify-center">
    <div className="flex items-center justify-center text-[var(--drt-green-dark)] text-6xl p-1 mr-2">
      {uploadIcon}
    </div>
    <p className="text-md text-[var(--drt-green-dark)] text-center mt-4 mb-1 w-full">
      {description}
    </p>
    <p className="text-sm text-[var(--drt-green-dark)] text-center w-full">
      {uploadHint}
    </p>
  </div>
);

const FileUploadButton = ({
  buttonText = DEFAULT_BUTTON_TEXT,
  onFileSelect,
  accept,
  uniqueId,
}: {
  buttonText?: string;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
  uniqueId: string;
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onFileSelect?.(file);
  };

  return (
    <div className="flex items-center justify-center">
      <input
        type="file"
        id={uniqueId}
        className="hidden"
        onChange={handleFileChange}
        accept={accept}
        aria-label={buttonText}
      />
      <Button
        variant="default"
        className="bg-[var(--drt-green)] text-white p-4 rounded-md mt-8 hover:bg-[var(--drt-green-dark)]"
        onClick={() => document.getElementById(uniqueId)?.click()}
        type="button"
      >
        {buttonText}
      </Button>
    </div>
  );
};

function FileUpload({
  title,
  icon,
  uploadIcon,
  description,
  uploadHint = DEFAULT_UPLOAD_HINT,
  buttonText = DEFAULT_BUTTON_TEXT,
  onFileSelect,
  accept,
}: FileUploadProps) {
  // Generate unique ID for file input to avoid conflicts with multiple instances
  const fileInputId = `file-upload-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-start justify-start border-2 border-[var(--drt-green)] p-6 rounded-xl bg-[var(--drt-green-light)] w-250 h-100">
        <HeaderSection title={title} icon={icon} />

        <div className="items-center justify-center border-2 border-dashed border-[var(--drt-green-light)] bg-[var(--drt-white)] p-6 rounded-lg w-full h-full mt-6">
          <UploadArea
            uploadIcon={uploadIcon}
            description={description}
            uploadHint={uploadHint}
          />
          <FileUploadButton
            buttonText={buttonText}
            onFileSelect={onFileSelect}
            accept={accept}
            uniqueId={fileInputId}
          />
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
