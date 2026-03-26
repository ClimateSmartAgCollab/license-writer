import type { BuilderTemplateAdapter, InsertVariableInput } from "@/types/template-adapters";
import type { BuilderRepeatContext } from "@/types/template-commands";

const insertAt = (text: string, insertText: string, cursorOffset: number): string => {
  const position = Math.max(0, Math.min(cursorOffset, text.length));
  return `${text.slice(0, position)}${insertText}${text.slice(position)}`;
};

const insertVariable = (
  { text, attrName, isNested, parentName, cursorOffset }: InsertVariableInput,
  context: BuilderRepeatContext | null,
): string => {
  const fullAttrName = isNested && parentName ? `${parentName}.${attrName}` : attrName;
  const activeRepeatParent = context?.parentName;

  if (activeRepeatParent) {
    let itemFieldName = attrName;
    if (fullAttrName.startsWith(`${activeRepeatParent}.`)) {
      itemFieldName = fullAttrName.replace(`${activeRepeatParent}.`, "");
    }

    return insertAt(text, `[item.${itemFieldName}]`, cursorOffset);
  }

  return insertAt(text, `[${fullAttrName}]`, cursorOffset);
};

const insertForBlock = (
  text: string,
  cursorOffset: number,
  parentName: string,
): string => {
  const block = [
    `[Start group of attributes: ${parentName}]`,
    `This section will repeat for every item in [${parentName}].`,
    "Write here... insert sub-fields before ending the section.\n",
    "[End group of attributes]",
  ].join("\n");

  return insertAt(text, block, cursorOffset);
};

const getRepeatContextHint = (context: BuilderRepeatContext | null): string | null => {
  if (!context) return null;
  return `Repeats for each item in [${context.parentName}]`;
};

export const builderAdapter: BuilderTemplateAdapter = {
  insertVariable,
  insertForBlock,
  getRepeatContextHint,
};
