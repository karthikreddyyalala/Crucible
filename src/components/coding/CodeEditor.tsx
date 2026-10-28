import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import CodeMirror, { Decoration, EditorView, Prec, keymap, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export interface CodeEditorHandle {
  /** Replace the whole document as one undoable edit (Cmd/Ctrl+Z brings the old code back). */
  replace: (code: string) => void;
}

interface Props {
  initialValue: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  /** 1-based line to mark after a failed run; null clears it. */
  errorLine: number | null;
  /** id of the text explaining Tab / Escape-then-Tab. */
  hintId: string;
}

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "var(--color-ink)", color: "var(--color-chalk)", fontSize: "14px" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6", fontVariantLigatures: "none" },
    ".cm-content": { padding: "14px 0", caretColor: "var(--color-accent)" },
    ".cm-line": { padding: "0 20px 0 14px" },
    ".cm-cursor, .cm-dropCursor": { borderLeft: "2px solid var(--color-accent)" },
    ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "rgba(74, 124, 255, 0.26)" },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.025)" },
    ".cm-selectionMatch": { backgroundColor: "rgba(255, 255, 255, 0.07)" },
    ".cm-gutters": { backgroundColor: "var(--color-ink)", color: "#80808f", border: "none" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 4px 0 18px", minWidth: "44px" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-chalk)" },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgba(74, 124, 255, 0.16)",
      outline: "1px solid rgba(74, 124, 255, 0.45)",
    },
    ".cm-matchingBracket": { backgroundColor: "transparent", color: "inherit" },
    "&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "rgba(255, 107, 61, 0.18)", color: "inherit" },
    ".cm-errorLine": { backgroundColor: "rgba(255, 107, 61, 0.09)", boxShadow: "inset 2px 0 0 var(--color-fail)" },
    ".cm-tooltip": { backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-line-bright)", color: "var(--color-chalk)" },
    ".cm-panels": { backgroundColor: "var(--color-surface)", color: "var(--color-chalk)" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--color-line)" },
    ".cm-textfield": { backgroundColor: "var(--color-ink)", border: "1px solid var(--color-line-bright)", borderRadius: "6px" },
    ".cm-button": { backgroundImage: "none", backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-line-bright)", borderRadius: "6px", color: "var(--color-chalk)" },
    ".cm-searchMatch": { backgroundColor: "rgba(74, 124, 255, 0.18)" },
  },
  { dark: true },
);

// Calm, low-saturation syntax colors drawn from the palette (all ≥ 4.5:1 on ink).
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword, t.modifier], color: "#86a2ff" },
  { tag: [t.string, t.special(t.string), t.escape], color: "#8fd3bf" },
  { tag: [t.number, t.bool, t.null], color: "#e3a983" },
  { tag: t.lineComment, color: "#80808f", fontStyle: "italic" },
  { tag: t.function(t.definition(t.variableName)), color: "#f6f6f8", fontWeight: "500" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#d9ddf0" },
  { tag: t.definition(t.className), color: "#a9bcf5", fontWeight: "500" },
  { tag: t.propertyName, color: "#c9cde0" },
  { tag: [t.paren, t.squareBracket, t.brace, t.separator, t.derefOperator, t.punctuation], color: "#9a9aa8" },
  { tag: [t.arithmeticOperator, t.compareOperator, t.definitionOperator, t.updateOperator, t.bitwiseOperator], color: "#b4b4c2" },
  { tag: t.meta, color: "#a9bcf5" },
]);

const BASIC_SETUP = { foldGutter: false, autocompletion: false, highlightActiveLineGutter: true, tabSize: 4 } as const;
const errorMark = Decoration.line({ class: "cm-errorLine" });

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { initialValue, onChange, onRun, onSubmit, errorLine, hintId },
  ref,
) {
  const cm = useRef<ReactCodeMirrorRef>(null);
  // The document is owned by CodeMirror after the first render (keeps undo history intact).
  const [value] = useState(initialValue);
  // Through a ref so the editor isn't reconfigured on every parent render.
  const actions = useRef({ onChange, onRun, onSubmit });
  actions.current = { onChange, onRun, onSubmit };
  const handleChange = useCallback((code: string) => actions.current.onChange(code), []);

  useImperativeHandle(ref, () => ({
    replace: (code) => {
      const view = cm.current?.view;
      if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code }, userEvent: "input.reset" });
    },
  }));

  const base = useMemo(
    () => [
      python(),
      syntaxHighlighting(highlight),
      Prec.highest(
        keymap.of([
          { key: "Mod-Shift-Enter", run: () => (actions.current.onSubmit(), true) },
          { key: "Mod-Enter", run: () => (actions.current.onRun(), true) },
        ]),
      ),
      EditorView.contentAttributes.of({ "aria-label": "Python code editor", "aria-describedby": hintId }),
    ],
    [hintId],
  );

  const extensions = useMemo(() => {
    if (!errorLine) return base;
    const marks = EditorView.decorations.of((view) =>
      errorLine <= view.state.doc.lines ? Decoration.set([errorMark.range(view.state.doc.line(errorLine).from)]) : Decoration.none,
    );
    return [...base, marks];
  }, [base, errorLine]);

  // Bring a reported error line into view.
  useEffect(() => {
    const view = cm.current?.view;
    if (!view || !errorLine || errorLine > view.state.doc.lines) return;
    view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.line(errorLine).from, { y: "nearest" }) });
  }, [errorLine]);

  return (
    <CodeMirror
      ref={cm}
      value={value}
      height="100%"
      className="h-full min-h-0 flex-1"
      theme={theme}
      basicSetup={BASIC_SETUP}
      extensions={extensions}
      onChange={handleChange}
    />
  );
});
