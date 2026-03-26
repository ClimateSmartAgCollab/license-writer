import { builderAdapter } from "@/lib/template/builderAdapter";
import { jinjaAdapter } from "@/lib/template/jinjaAdapter";
import type { TemplateCommand, TemplateState } from "@/types/template-commands";

export const initialTemplateState: TemplateState = {
  jinjaText: "",
  warnings: [],
  builderContext: null,
};

const withWarnings = (state: TemplateState, jinjaText: string): TemplateState => {
  const normalizedText = jinjaAdapter.print(jinjaAdapter.parse(jinjaText));
  return {
    ...state,
    jinjaText: normalizedText,
    warnings: jinjaAdapter.findWarnings(normalizedText),
  };
};

export const templateReducer = (
  state: TemplateState,
  command: TemplateCommand,
): TemplateState => {
  switch (command.type) {
    case "insert_variable": {
      const { attrName, isNested, mode, parentName, cursorOffset } = command.payload;
      const nextText =
        mode === "advanced"
          ? jinjaAdapter.insertVariable({
              text: state.jinjaText,
              attrName,
              isNested,
              parentName,
              cursorOffset,
            })
          : builderAdapter.insertVariable(
              {
                text: state.jinjaText,
                attrName,
                isNested,
                parentName,
                cursorOffset,
              },
              state.builderContext,
            );

      return withWarnings(state, nextText);
    }
    case "insert_for_block": {
      const { parentName, nestedAttributes, cursorOffset } = command.payload;
      const nextText = builderAdapter.insertForBlock(
        state.jinjaText,
        cursorOffset,
        parentName,
      );

      return withWarnings(
        {
          ...state,
          builderContext: {
            parentName,
            nestedAttributes,
          },
        },
        nextText,
      );
    }
    case "set_builder_context": {
      return {
        ...state,
        builderContext: command.payload.context,
      };
    }
    case "set_from_advanced_text": {
      return withWarnings(state, command.payload.text);
    }
    default: {
      return state;
    }
  }
};
