import { TbInfoCircle } from "react-icons/tb";
import { type AttributeInfo, isReferenceType } from "@/lib/utils";

interface AttributeCardProps {
  attribute: AttributeInfo;
  onInsert: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  onInsertNested: (nestedName: string) => void;
  onViewDetails: () => void;
}

export function AttributeCard({
  attribute,
  onInsert,
  onToggleExpand,
  isExpanded,
  onInsertNested,
  onViewDetails,
}: AttributeCardProps) {
  const isRefType = attribute.isReference || isReferenceType(attribute.type);
  const hasNestedAttributes = attribute.nestedAttributes && attribute.nestedAttributes.length > 0;
  const showNestedSection = (attribute.isArray || isRefType) && hasNestedAttributes;

  return (
    <div
      className={`border border-gray-200 rounded-lg p-4 hover:border-[var(--drt-green)] transition-colors ${
        isRefType ? "bg-[var(--drt-green-light)] bg-opacity-20" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800">{attribute.name}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{attribute.label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors border border-gray-300 bg-white"
          title="View details"
        >
          <TbInfoCircle className="w-4 h-4" />
          <span>Details</span>
        </button>
        {!isRefType && (
          <button
            onClick={onInsert}
            className="flex items-center gap-1 px-3 py-1 bg-[var(--drt-green)] text-white text-sm rounded hover:bg-[var(--drt-green-dark)] transition-colors"
          >
            <span>+</span>
            <span>Insert</span>
          </button>
        )}
      </div>
      {showNestedSection && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 w-full"
          >
            <span className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}>
              &gt;
            </span>
            <span>Nested Attributes ({attribute.nestedAttributes!.length})</span>
          </button>
          {isExpanded && (
            <div className="mt-2 space-y-2 pl-6">
              {attribute.nestedAttributes!.map((nested) => (
                <div key={nested.name} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{nested.name}</span>
                    {nested.description && (
                      <p className="text-xs text-gray-500">{nested.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onInsertNested(nested.name)}
                    className="px-2 py-1 bg-[var(--drt-green)] text-white text-xs rounded hover:bg-[var(--drt-green-dark)] transition-colors"
                  >
                    + Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

