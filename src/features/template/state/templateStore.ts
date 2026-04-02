import { builderAdapter } from "@/lib/template/builderAdapter";
import { jinjaAdapter } from "@/lib/template/jinjaAdapter";
import type { TemplateCommand, TemplateState } from "@/types/templateStateAndCommands";

const emptyDocument = jinjaAdapter.parse("");

export const initialTemplateState: TemplateState = {
  document: emptyDocument,
  jinjaText: "",
  builderText: "",
  warnings: [],
  isBuilderLimited: false,
  builderWarning: null,
  builderContext: null,
};

const withDerivedViews = (
  state: TemplateState,
  document: TemplateState["document"],
): TemplateState => {
  const normalizedText = jinjaAdapter.print(document);
  const normalizedDocument = jinjaAdapter.parse(normalizedText);
  const builderProjection = builderAdapter.print(normalizedDocument);
  const jinjaWarnings = jinjaAdapter.findWarnings(normalizedDocument);
  const warnings = builderProjection.isLimited
    ? [...jinjaWarnings, builderProjection.warning]
    : jinjaWarnings;

  return {
    ...state,
    document: normalizedDocument,
    jinjaText: normalizedText,
    builderText: builderProjection.text,
    warnings,
    isBuilderLimited: builderProjection.isLimited,
    builderWarning: builderProjection.isLimited ? builderProjection.warning : null,
  };
};

export const templateReducer = (
  state: TemplateState,
  command: TemplateCommand,
): TemplateState => {
  switch (command.type) {
    case "insert_variable": {
      const { attrName, isNested, mode, parentName, cursorOffset, basePlainText } = command.payload;
      if (mode === "builder" && state.isBuilderLimited) {
        return state;
      }

      const nextDocument =
        mode === "advanced"
          ? jinjaAdapter.insertVariable({
              document: state.document,
              attrName,
              isNested,
              parentName,
              cursorOffset,
              basePlainText,
            })
          : builderAdapter.insertVariable(
              {
                document: state.document,
                attrName,
                isNested,
                parentName,
                cursorOffset,
                basePlainText,
              },
              state.builderContext,
            );

      return withDerivedViews(state, nextDocument);
    }
    case "insert_for_block": {
      const { parentName, nestedAttributes, cursorOffset, basePlainText } = command.payload;
      if (state.isBuilderLimited) {
        return state;
      }

      const nextDocument = builderAdapter.insertForBlock(
        state.document,
        cursorOffset,
        parentName,
        basePlainText,
      );

      return withDerivedViews(
        {
          ...state,
          builderContext: {
            parentName,
            nestedAttributes,
          },
        },
        nextDocument,
      );
    }
    case "set_builder_context": {
      return {
        ...state,
        builderContext: command.payload.context,
      };
    }
    case "set_from_advanced_text": {
      return withDerivedViews(state, jinjaAdapter.parse(command.payload.text));
    }
    case "set_from_builder_text": {
      if (state.isBuilderLimited) {
        return state;
      }
      return withDerivedViews(state, builderAdapter.parse(command.payload.text));
    }
    case "reset_template": {
      return { ...initialTemplateState };
    }
    default: {
      return state;
    }
  }
};
