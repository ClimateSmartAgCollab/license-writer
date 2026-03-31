import type { Editor } from "@tiptap/core";

const EDITOR_BLOCK_SEPARATOR = "\n";

function normalizedEditorPlain(editor: Editor): string {
  return editor.getText({ blockSeparator: EDITOR_BLOCK_SEPARATOR }).replace(/\r\n/g, "\n");
}

/** Offsets to try when plain-string equality finds no index (PM getText can differ from JS splice at block edges). */
function insertionOffsetsNearHint(hint: number, prevLen: number, windowSize: number): number[] {
  const h = Math.max(0, Math.min(hint, prevLen));
  const seen = new Set<number>();
  const out: number[] = [];
  const add = (v: number) => {
    if (v >= 0 && v <= prevLen && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  };
  add(h);
  for (let d = 1; d <= windowSize; d += 1) {
    add(h + d);
    add(h - d);
  }
  return out;
}

/** Trim shared prefix/suffix; middle must be empty on one side for a single contiguous insert/delete. */
function detectSingleInsertion(prev: string, next: string): { index: number; inserted: string } | null {
  if (next.length <= prev.length) return null;
  let i = 0;
  let j = 0;
  while (i < prev.length && j < next.length && prev[i] === next[j]) {
    i += 1;
    j += 1;
  }
  let i2 = prev.length - 1;
  let j2 = next.length - 1;
  while (i2 >= i && j2 >= j && prev[i2] === next[j2]) {
    i2 -= 1;
    j2 -= 1;
  }
  if (i2 >= i) return null;
  return { index: i, inserted: next.slice(j, j2 + 1) };
}

function detectSingleDeletion(prev: string, next: string): { index: number; deletedLen: number } | null {
  if (prev.length <= next.length) return null;
  let i = 0;
  let j = 0;
  while (i < prev.length && j < next.length && prev[i] === next[j]) {
    i += 1;
    j += 1;
  }
  let i2 = prev.length - 1;
  let j2 = next.length - 1;
  while (i2 >= i && j2 >= j && prev[i2] === next[j2]) {
    i2 -= 1;
    j2 -= 1;
  }
  if (j2 >= j) return null;
  return { index: i, deletedLen: i2 - i + 1 };
}

function caretAfterDeletion(prevCaret: number, delIndex: number, deletedLen: number): number {
  const delEnd = delIndex + deletedLen;
  if (prevCaret <= delIndex) return prevCaret;
  if (prevCaret >= delEnd) return prevCaret - deletedLen;
  return delIndex;
}

function resolveInsertAtForSnippet(
  prev: string,
  next: string,
  snippet: string,
  cursorHint: number,
): number | null {
  const clampedHint = Math.max(0, Math.min(cursorHint, prev.length));
  const strict =
    prev.slice(0, clampedHint) + snippet + prev.slice(clampedHint);
  if (next === strict) return clampedHint;
  if (next.length !== prev.length + snippet.length) return null;
  const candidates: number[] = [];
  for (let i = 0; i <= prev.length; i += 1) {
    if (prev.slice(0, i) + snippet + prev.slice(i) === next) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.reduce((best, i) =>
    Math.abs(i - clampedHint) < Math.abs(best - clampedHint) ? i : best,
  );
}

/**
 * Applies a sidebar attribute insert at ProseMirror positions when store plain text equals
 * the editor plain text with exactly one insertion of `pending.text`, using cursor hint or
 * resolving the index when strict (hint) placement does not match (e.g. cursor vs store offset).
 */
export function tryApplyVerifiedPlainInsert(
  editor: Editor,
  normalizedCurrent: string,
  normalizedIncoming: string,
  pending: { at: number; text: string } | null,
  getPmPosFromTextOffset: (ed: Editor, textOffset: number) => number,
  previousTextOffset: number,
): boolean {
  if (!pending) return false;
  const insertAt = resolveInsertAtForSnippet(
    normalizedCurrent,
    normalizedIncoming,
    pending.text,
    pending.at,
  );
  if (insertAt !== null) {
    const from = getPmPosFromTextOffset(editor, insertAt);
    const ok = editor.chain().focus().insertContentAt(from, pending.text).run();
    if (!ok) return false;
    const newTextOffset =
      insertAt <= previousTextOffset
        ? previousTextOffset + pending.text.length
        : previousTextOffset;
    editor.commands.setTextSelection(getPmPosFromTextOffset(editor, newTextOffset));
    return true;
  }

  if (normalizedIncoming.length !== normalizedCurrent.length + pending.text.length) {
    return false;
  }

  if (!editor.can().undo()) {
    return false;
  }

  const offsets = insertionOffsetsNearHint(pending.at, normalizedCurrent.length, 48);
  for (const tryAt of offsets) {
    const from = getPmPosFromTextOffset(editor, tryAt);
    if (!editor.chain().focus().insertContentAt(from, pending.text).run()) continue;
    if (normalizedEditorPlain(editor) === normalizedIncoming) {
      const newTextOffset =
        tryAt <= previousTextOffset
          ? previousTextOffset + pending.text.length
          : previousTextOffset;
      editor.commands.setTextSelection(getPmPosFromTextOffset(editor, newTextOffset));
      return true;
    }
    editor.chain().focus().undo().run();
  }
  return false;
}

/**
 * When store plain text differs from the editor by exactly one contiguous insert or delete
 * (e.g. attribute insertion), patch the ProseMirror doc in place so marks / blocks survive.
 */
export function applyPlainTextSurgeryIfPossible(
  editor: Editor,
  normalizedCurrent: string,
  normalizedIncoming: string,
  getPmPosFromTextOffset: (ed: Editor, textOffset: number) => number,
  previousTextOffset: number,
): boolean {
  const ins = detectSingleInsertion(normalizedCurrent, normalizedIncoming);
  if (ins) {
    const from = getPmPosFromTextOffset(editor, ins.index);
    const insertedOk = editor.chain().focus().insertContentAt(from, ins.inserted).run();
    if (!insertedOk) return false;
    const newTextOffset =
      ins.index <= previousTextOffset ? previousTextOffset + ins.inserted.length : previousTextOffset;
    editor.commands.setTextSelection(getPmPosFromTextOffset(editor, newTextOffset));
    return true;
  }

  const del = detectSingleDeletion(normalizedCurrent, normalizedIncoming);
  if (del) {
    const from = getPmPosFromTextOffset(editor, del.index);
    const to = getPmPosFromTextOffset(editor, del.index + del.deletedLen);
    const deletedOk = editor.chain().focus().deleteRange({ from, to }).run();
    if (!deletedOk) return false;
    const newTextOffset = caretAfterDeletion(previousTextOffset, del.index, del.deletedLen);
    editor.commands.setTextSelection(getPmPosFromTextOffset(editor, newTextOffset));
    return true;
  }

  return false;
}
