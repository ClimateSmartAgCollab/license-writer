import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { OCAPackage, AttributeType } from "@/types/oca"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detailed attribute information extracted from OCA Package
 */
export interface AttributeInfo {
  name: string;
  type: AttributeType;
  label: string;
  description: string;
  isArray: boolean;
  nestedAttributes?: AttributeInfo[];
}

/**
 * Extract detailed attribute information from OCA Package
 */
export function extractDetailedAttributes(data: OCAPackage | null): AttributeInfo[] {
  if (!data || !data.oca_bundle) {
    return [];
  }

  const captureBase = data.oca_bundle.bundle?.capture_base;
  if (!captureBase || !captureBase.attributes) {
    return [];
  }

  const attributes = captureBase.attributes;
  const overlays = data.oca_bundle.bundle?.overlays;

  // Get labels from label overlays
  const attributeLabels: Record<string, string> = {};
  if (overlays?.label && Array.isArray(overlays.label)) {
    overlays.label.forEach((labelOverlay) => {
      if (labelOverlay.attribute_labels) {
        Object.assign(attributeLabels, labelOverlay.attribute_labels);
      }
    });
  }

  // Get descriptions from FormOverlay in ADC extensions
  const attributeDescriptions: Record<string, string> = {};
  if (data.extensions?.adc) {
    Object.values(data.extensions.adc).forEach((adcExtension) => {
      if (adcExtension.overlays?.form && Array.isArray(adcExtension.overlays.form)) {
        adcExtension.overlays.form.forEach((formOverlay) => {
          if (formOverlay.description && typeof formOverlay.description === 'object') {
            Object.assign(attributeDescriptions, formOverlay.description);
          }
        });
      }
    });
  }

  // Extract nested attributes from form overlays in extensions (for array attributes)
  const getNestedAttributes = (attrName: string, isArray: boolean): AttributeInfo[] => {
    if (!isArray || !data.extensions?.adc) {
      return [];
    }

    const nestedAttrs: AttributeInfo[] = [];
    
    // Check ADC extensions for form overlays
    Object.values(data.extensions.adc).forEach((adcExtension) => {
      if (adcExtension.overlays?.form && Array.isArray(adcExtension.overlays.form)) {
        adcExtension.overlays.form.forEach((formOverlay) => {
          if (formOverlay.interaction && Array.isArray(formOverlay.interaction)) {
            formOverlay.interaction.forEach((interaction) => {
              if (interaction.arguments) {
                // Look for attributes that start with the parent attribute name
                Object.keys(interaction.arguments).forEach((nestedName) => {
                  if (nestedName.startsWith(attrName + '.') || nestedName.includes(attrName)) {
                    const nestedArg = interaction.arguments[nestedName];
                    const nestedTypeValue = nestedArg.type;
                    const nestedTypeString = typeof nestedTypeValue === 'string' 
                      ? nestedTypeValue 
                      : String(nestedTypeValue);
                    const nestedType = nestedTypeString as AttributeType;
                    nestedAttrs.push({
                      name: nestedName.replace(`${attrName}.`, ''),
                      type: nestedType,
                      label: attributeLabels[nestedName] || nestedName,
                      description: attributeDescriptions[nestedName] || `Nested attribute: ${nestedName}`,
                      isArray: typeof nestedTypeString === 'string' && nestedTypeString.startsWith('Array['),
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    return nestedAttrs;
  };

  // Extract attribute information
  const attributeInfos: AttributeInfo[] = Object.keys(attributes).map((attrName) => {
    const attrTypeValue = attributes[attrName];
    // Convert to string if it's not already (handle cases where type might be stored differently)
    const attrTypeString = typeof attrTypeValue === 'string' 
      ? attrTypeValue 
      : String(attrTypeValue);
    const attrType = attrTypeString as AttributeType;
    const isArray = typeof attrTypeString === 'string' && attrTypeString.startsWith('Array[');
    const nestedAttrs = getNestedAttributes(attrName, isArray);

    return {
      name: attrName,
      type: attrType,
      label: attributeLabels[attrName] || attrName,
      description: attributeDescriptions[attrName] || `Attribute: ${attrName}`,
      isArray,
      nestedAttributes: nestedAttrs.length > 0 ? nestedAttrs : undefined,
    };
  });

  return attributeInfos;
}

/**
 * Extract attributes from OCA Package JSON
 * Handles multiple possible JSON structures
 */
export function extractAttributesFromOCA(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;

  // Check for direct attributes array
  if (Array.isArray(obj.attributes)) {
    return obj.attributes.filter(
      (attr): attr is string => typeof attr === "string"
    );
  }

  // Check for schema.attributes or schema.properties
  if (obj.schema && typeof obj.schema === "object") {
    const schema = obj.schema as Record<string, unknown>;
    if (Array.isArray(schema.attributes)) {
      return schema.attributes.filter(
        (attr): attr is string => typeof attr === "string"
      );
    }
    if (schema.properties && typeof schema.properties === "object") {
      return Object.keys(schema.properties);
    }
  }

  // Check for capture_base.attributes (OCA standard structure)
  if (obj.capture_base && typeof obj.capture_base === "object") {
    const captureBase = obj.capture_base as Record<string, unknown>;
    if (captureBase.attributes && typeof captureBase.attributes === "object") {
      return Object.keys(captureBase.attributes);
    }
  }

  // Check for oca_bundle.bundle.capture_base.attributes (OCA Package structure)
  if (obj.oca_bundle && typeof obj.oca_bundle === "object") {
    const ocaBundle = obj.oca_bundle as Record<string, unknown>;
    if (ocaBundle.bundle && typeof ocaBundle.bundle === "object") {
      const bundle = ocaBundle.bundle as Record<string, unknown>;
      if (
        bundle.capture_base &&
        typeof bundle.capture_base === "object"
      ) {
        const captureBase = bundle.capture_base as Record<string, unknown>;
        if (
          captureBase.attributes &&
          typeof captureBase.attributes === "object"
        ) {
          return Object.keys(captureBase.attributes);
        }
      }
    }
  }

  // Fallback: extract all top-level keys as attributes
  return Object.keys(obj).filter((key) => key !== "type" && key !== "d");
}


export function calculateSchemaLevels(
  ocaPackage: OCAPackage | null,
  visitedDigests: Set<string> = new Set(),
  currentLevel: number = 1
): number {
  if (!ocaPackage?.oca_bundle?.bundle?.capture_base) {
    return 0;
  }

  const captureBase = ocaPackage.oca_bundle.bundle.capture_base;
  const attributes = captureBase.attributes || {};
  const dependencies = ocaPackage.oca_bundle.dependencies || [];
  const schemaDigest = captureBase.d;

  // Prevent circular references
  if (schemaDigest && visitedDigests.has(schemaDigest)) {
    return currentLevel - 1; 
  }

  if (schemaDigest) {
    visitedDigests.add(schemaDigest);
  }

  // Find all "refs:" references in attributes
  const refsInAttributes: string[] = [];
  Object.values(attributes).forEach((attrValue) => {
    if (typeof attrValue === "string" && attrValue.startsWith("refs:")) {
      const refDigest = attrValue.replace("refs:", "");
      refsInAttributes.push(refDigest);
    }
  });

  if (refsInAttributes.length === 0 && dependencies.length === 0) {
    return currentLevel;
  }

  let maxDepth = currentLevel;

  const dependencyMap = new Map<string, any>();
  (dependencies as any[]).forEach((dep) => {
    if (typeof dep === "string") {
      dependencyMap.set(dep, null);
    } else if (dep && typeof dep === "object") {
      const depDigest = (dep as any).d || (dep as any).capture_base?.d;
      if (depDigest) {
        dependencyMap.set(depDigest, dep);
      }
    }
  });

  const allRefs = new Set([...refsInAttributes]);
  
  (dependencies as any[]).forEach((dep) => {
    if (dep && typeof dep === "object" && (dep as any).d) {
      allRefs.add((dep as any).d);
    }
  });

  for (const refDigest of allRefs) {
    const depObj = dependencyMap.get(refDigest);
    
      if (depObj) {
        const packageType = 
          (depObj as any).type || 
          ocaPackage.type || 
          "oca_package/1.0"; 
        
        const depPackage: OCAPackage = {
          d: depObj.d || refDigest,
          type: packageType,
          oca_bundle: {
            v: depObj.v || "",
            bundle: depObj.bundle || {
              v: depObj.v || "",
              d: depObj.d || refDigest,
              capture_base: depObj.capture_base || (depObj as any).capture_base,
              overlays: depObj.overlays || {},
            },
            dependencies: depObj.dependencies || [],
          },
        };

      const childDepth = calculateSchemaLevels(
        depPackage,
        new Set(visitedDigests),
        currentLevel + 1
      );
      maxDepth = Math.max(maxDepth, childDepth);
    } else {
      maxDepth = Math.max(maxDepth, currentLevel + 1);
    }
  }

  if (refsInAttributes.length > 0 && maxDepth === currentLevel) {
    maxDepth = currentLevel + 1;
  }

  return maxDepth;
}


export function validateSchemaLevels(
  ocaPackage: OCAPackage | null,
  maxLevel: number = 2
): { isValid: boolean; error?: string; actualLevel?: number } {
  if (!ocaPackage) {
    return { isValid: false, error: "No OCA package provided" };
  }

  const actualLevel = calculateSchemaLevels(ocaPackage);

  if (actualLevel > maxLevel) {
    return {
      isValid: false,
      error: `Schema nesting level (${actualLevel}) exceeds maximum allowed level (${maxLevel}). Each Reference attribute creates a child schema level.`,
      actualLevel,
    };
  }

  return {
    isValid: true,
    actualLevel,
  };
}
