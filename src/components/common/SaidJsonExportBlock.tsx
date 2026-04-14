import { useCallback, useState } from "react";
import { TbDownload } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { downloadSaidifiedLicenseTemplateJson } from "@/lib/said/licenseTemplateRecord";

export interface SaidJsonExportBlockProps {
  jinjaText: string;
  ocaPackageD: string | null;
  attributeNames: string[];
}

export function SaidJsonExportBlock({
  jinjaText,
  ocaPackageD,
  attributeNames,
}: SaidJsonExportBlockProps) {
  const [saidJsonError, setSaidJsonError] = useState<string | null>(null);
  const [lastSaidDigest, setLastSaidDigest] = useState<string | null>(null);

  const handleDownloadSaidJson = useCallback(() => {
    setSaidJsonError(null);
    try {
      const result = downloadSaidifiedLicenseTemplateJson({
        jinja: jinjaText,
        ocaPackageD,
        attributeNames,
      });
      setLastSaidDigest(result.sad.d);
    } catch (err) {
      setLastSaidDigest(null);
      setSaidJsonError(err instanceof Error ? err.message : "Failed to export SAID JSON.");
    }
  }, [attributeNames, jinjaText, ocaPackageD]);

  return (
    <div className="flex flex-col items-end gap-1 min-w-0 max-w-full">
      <Button
        onClick={handleDownloadSaidJson}
        className="bg-white text-[var(--drt-green)] hover:bg-gray-100 px-4 py-2"
        title="Download canonical JSON with embedded SAID (d) for your data store"
      >
        <TbDownload className="w-4 h-4" />
        <span>SAID JSON</span>
      </Button>
      {saidJsonError && (
        <p className="text-xs text-red-200 max-w-md text-right" role="alert">
          {saidJsonError}
        </p>
      )}
      {lastSaidDigest && !saidJsonError && (
        <p className="text-xs opacity-90 max-w-md truncate text-right" title={lastSaidDigest}>
          Last export d (truncated): …{lastSaidDigest.slice(-16)}
        </p>
      )}
    </div>
  );
}
