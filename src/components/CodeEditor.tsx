import { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';

function langExt(language: string): Extension {
  switch (language) {
    case 'typescript':
      return javascript({ typescript: true });
    case 'python':
      return python();
    case 'sql':
      return sql();
    case 'javascript':
      return javascript();
    default:
      return [];
  }
}

interface Props {
  language: string;
  value: string;
  onChange: (code: string) => void;
  onRun?: () => void;
  label: string;
  readOnly?: boolean;
}

/** Lazy-loaded CodeMirror editor (only ever imported by the practice workspace). */
export function CodeEditor({ language, value, onChange, onRun, label, readOnly = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cbRef = useRef({ onChange, onRun });
  cbRef.current = { onChange, onRun };
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      doc: valueRef.current,
      parent: hostRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Mod-Enter',
            run: () => {
              cbRef.current.onRun?.();
              return true;
            },
          },
        ]),
        EditorView.contentAttributes.of({ 'aria-label': label }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) cbRef.current.onChange(u.state.doc.toString());
        }),
        EditorState.readOnly.of(readOnly),
        langExt(language),
        EditorView.lineWrapping,
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly, label]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className="code-editor" />;
}
