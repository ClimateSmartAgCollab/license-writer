import { TbX } from "react-icons/tb";
import { type AttributeInfo, isReferenceType } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AttributeDetailsModalProps {
  attribute: AttributeInfo | null;
  onClose: () => void;
  onInsert: (attrName: string, isNested?: boolean, parentName?: string) => void;
}

export function AttributeDetailsModal({
  attribute,
  onClose,
  onInsert,
}: AttributeDetailsModalProps) {
  if (!attribute) return null;

  const isRefType = attribute.isReference || isReferenceType(attribute.type);

  const getTypeDisplay = (type: string, isArray: boolean, hasEntryCodes: boolean, isRef: boolean) => {
    // If attribute has entry codes, it's a list type
    if (hasEntryCodes) {
      return "List";
    }
    if (isArray || isRef) {
      return "Array/List";
    }
    // Map common types to display names
    if (type === "Text") return "Text";
    if (type === "Numeric") return "Number";
    if (type === "DateTime" || type === "Date") return "DateTime";
    if (type === "Boolean") return "Boolean";
    return type.toLowerCase();
  };

  const getTemplateUsage = (attrName: string, isNested = false, parentName?: string) => {
    if (isNested && parentName) {
      return `{{ ${parentName}.${attrName} }}`;
    }
    return `{{ ${attrName} }}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 backdrop-brightness-30">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Attribute Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete information about this attribute.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <TbX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Attribute Name */}
          <div className="mb-6">
          <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-1">
              Attribute Name
            </label>
            <h3 className="text-lg text-gray-800">{attribute.name}</h3>
          </div>

          {/* Question */}
          <div className="mb-4">
            <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-1">
              Question Label
            </label>
            <p className="text-gray-900">
              {attribute.label || `What is the ${attribute.name}?`}
            </p>
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-2">
              Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {isRefType ? (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--drt-green-light)] text-[var(--drt-green-dark)]">
                  Reference
                </span>
              ) : attribute.hasEntryCodes ? (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--drt-green-light)] text-[var(--drt-green-dark)]">
                  List
                </span>
              ) : attribute.isArray ? (
                <>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    array
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--drt-green-light)] text-[var(--drt-green-dark)]">
                    Array/List
                  </span>
                </>
              ) : (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--drt-green-light)] text-[var(--drt-green-dark)]">
                  {getTypeDisplay(String(attribute.type), attribute.isArray, attribute.hasEntryCodes, isRefType)}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {attribute.description && (
            <div className="mb-4">
              <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-1">
                Description
              </label>
              <p className="text-gray-900">{attribute.description}</p>
            </div>
          )}

          {/* Usage in template */}
          <div className="mb-6">
            <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-2">
              Usage in template
            </label>
            <div className="bg-[var(--drt-green-light)] border border-[var(--drt-green)] rounded-lg p-3">
              {isRefType && attribute.nestedAttributes && attribute.nestedAttributes.length > 0 ? (
                <code className="text-sm text-[var(--drt-green-dark)] font-mono whitespace-pre-wrap">
                  {`{% for ${attribute.name} in ${attribute.name} %}\n  {{ ${attribute.name}.${attribute.nestedAttributes[0]?.name || 'attribute'} }}\n{% endfor %}`}
                </code>
              ) : (
                <code className="text-sm text-[var(--drt-green-dark)] font-mono">
                  {getTemplateUsage(attribute.name)}
                </code>
              )}
            </div>
          </div>

          {/* Nested Attributes Section */}
          {((attribute.isArray || isRefType) && attribute.nestedAttributes && attribute.nestedAttributes.length > 0) && (
            <div className="mb-6">
              <label className="block text-md font-medium text-[var(--drt-green-dark)] mb-3">
                Nested Attributes ({attribute.nestedAttributes.length})
              </label>
              <div className="space-y-4">
                {attribute.nestedAttributes.map((nested) => (
                  <div
                    key={nested.name}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {`${attribute.name}.${nested.name}`}
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">
                          {nested.label || `What is the ${nested.name}?`}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-[var(--drt-green-light)] text-[var(--drt-green-dark)] text-xs font-medium rounded">
                            {getTypeDisplay(String(nested.type), nested.isArray, nested.hasEntryCodes, false)}
                          </span>
                        </div>
                        {nested.description && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-[var(--drt-green-dark)] mb-1">
                              Description
                            </label>
                            <p className="text-sm text-gray-900">{nested.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="bg-[var(--drt-green-light)] border border-[var(--drt-green)] rounded-lg p-2 flex-1 mr-3">
                          <code className="text-xs text-[var(--drt-green-dark)] font-mono">
                            {getTemplateUsage(nested.name, true, attribute.name)}
                          </code>
                        </div>
                        <Button
                          onClick={() => onInsert(nested.name, true, attribute.name)}
                          className="bg-[var(--drt-green)] text-white hover:bg-[var(--drt-green-dark)] px-4 py-2 whitespace-nowrap"
                        >
                          <span className="mr-1">+</span>
                          <span>Insert {nested.name}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insert Button */}
          {!isRefType && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => onInsert(attribute.name)}
                className="w-full bg-[var(--drt-green)] text-white hover:bg-[var(--drt-green-dark)] py-3 text-base"
              >
                <span className="mr-2">+</span>
                Insert into Template
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

