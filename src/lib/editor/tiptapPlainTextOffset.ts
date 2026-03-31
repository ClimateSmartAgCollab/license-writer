import { getTextBetween, getTextSerializersFromSchema } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

function textBetweenOpts(editor: Editor, blockSeparator: string) {
  return {
    blockSeparator,
    textSerializers: getTextSerializersFromSchema(editor.schema),
  };
}

/**
 * Plain-text length from document start to PM position `pos`, using the same rules as
 * `editor.getText({ blockSeparator })`. Do not use `doc.textBetween` here — it diverges
 * for lists, blockquote, etc.
 */
export function plainTextLengthBeforePos(editor: Editor, pos: number, blockSeparator: string): number {
  return getTextBetween(
    editor.state.doc,
    { from: 0, to: pos },
    textBetweenOpts(editor, blockSeparator),
  ).length;
}

/** Map a plain-text offset (from `getText`) to a PM document position. */
export function pmPosFromPlainTextOffset(
  editor: Editor,
  textOffset: number,
  blockSeparator: string,
): number {
  const maxPos = editor.state.doc.content.size;
  if (maxPos <= 0) return 0;
  const boundedOffset = Math.max(0, textOffset);
  if (plainTextLengthBeforePos(editor, maxPos, blockSeparator) <= boundedOffset) {
    return maxPos;
  }
  let lo = 1;
  let hi = maxPos;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (plainTextLengthBeforePos(editor, mid, blockSeparator) >= boundedOffset) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}
