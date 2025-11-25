import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

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

const HeaderSection = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) => (
  <div className="flex align-middle items-start justify-start">
    <div className="flex items-center justify-center text-[var(--drt-green)] text-xl lg:text-2xl p-1 mr-2">
      {icon}
    </div>
    <h1 className="text-xl lg:text-2xl text-[var(--drt-green)]">{title}</h1>
  </div>
);

const UploadArea = ({
  uploadIcon,
  description,
  uploadHint = DEFAULT_UPLOAD_HINT,
  isDragActive,
}: {
  uploadIcon: React.ReactNode;
  description: string;
  uploadHint?: string;
  isDragActive?: boolean;
}) => (
  <div className="flex flex-col items-center justify-center">
    <div className="flex items-center justify-center text-[var(--drt-green-dark)] text-4xl lg:text-6xl p-1 mr-2">
      {uploadIcon}
    </div>
    <p className="text-sm lg:text-base text-[var(--drt-green-dark)] text-center mt-4 mb-1 w-full px-2 lg:px-0">
      {description}
    </p>
    <p
      className={`text-xs lg:text-sm text-center w-full px-2 lg:px-0 ${
        isDragActive
          ? "text-[var(--drt-green)] font-semibold"
          : "text-[var(--drt-green-dark)]"
      }`}
    >
      {isDragActive ? "Drop the file here" : uploadHint}
    </p>
  </div>
);

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
  // Configure onDrop handler
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0] || null;
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: accept
      ? accept.split(",").reduce((acc, ext) => {
          const trimmedExt = ext.trim();
          const mimeType =
            trimmedExt === ".json"
              ? "application/json"
              : trimmedExt === ".jinja"
              ? "application/json"
              : undefined;
          if (mimeType) {
            if (!acc[mimeType]) {
              acc[mimeType] = [];
            }
            acc[mimeType].push(trimmedExt);
          }
          return acc;
        }, {} as Record<string, string[]>)
      : undefined,
    multiple: false,
    noClick: false,
    noKeyboard: false,
  });

  const getBorderColor = () => {
    if (isDragReject) return "border-red-500";
    if (isDragAccept || isDragActive) return "border-[var(--drt-green-dark)]";
    return "border-[var(--drt-green-light)]";
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex flex-col items-start justify-start border-2 border-[var(--drt-green)] p-4 lg:p-6 rounded-xl bg-[var(--drt-green-light)] w-full max-w-2xl min-h-[300px] lg:min-h-[400px]">
        <HeaderSection title={title} icon={icon} />

        <div
          {...getRootProps()}
          className={`items-center justify-center border-2 border-dashed ${getBorderColor()} bg-[var(--drt-white)] p-4 lg:p-6 rounded-lg w-full flex-1 mt-4 lg:mt-6 cursor-pointer transition-colors ${
            isDragActive ? "bg-[var(--drt-green-light)] opacity-90" : ""
          }`}
        >
          <input {...getInputProps()} aria-label={buttonText} />
          <UploadArea
            uploadIcon={uploadIcon}
            description={description}
            uploadHint={uploadHint}
            isDragActive={isDragActive}
          />
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
