import { useState } from "react";
import { TbSearch } from "react-icons/tb";
import { type AttributeInfo } from "@/lib/utils";
import { AttributeCard } from "./AttributeCard";

interface AttributeListSidebarProps {
  attributes: AttributeInfo[];
  onInsert: (attrName: string) => void;
  onInsertNested: (nestedName: string, parentName: string) => void;
  onViewDetails: (attribute: AttributeInfo) => void;
}

export function AttributeListSidebar({
  attributes,
  onInsert,
  onInsertNested,
  onViewDetails,
}: AttributeListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  const filteredAttributes = attributes.filter(
    (attr) =>
      attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAttributeExpansion = (attrName: string) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attrName)) {
      newExpanded.delete(attrName);
    } else {
      newExpanded.add(attrName);
    }
    setExpandedAttributes(newExpanded);
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Attribute List</h2>
        <div className="relative">
          <TbSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--drt-green)] focus:border-transparent"
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {filteredAttributes.length} of {attributes.length} attributes
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredAttributes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No attributes found</p>
        ) : (
          <div className="space-y-3">
            {filteredAttributes.map((attr) => (
              <AttributeCard
                key={attr.name}
                attribute={attr}
                onInsert={() => onInsert(attr.name)}
                onToggleExpand={() => toggleAttributeExpansion(attr.name)}
                isExpanded={expandedAttributes.has(attr.name)}
                onInsertNested={(nestedName) => onInsertNested(nestedName, attr.name)}
                onViewDetails={() => onViewDetails(attr)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

