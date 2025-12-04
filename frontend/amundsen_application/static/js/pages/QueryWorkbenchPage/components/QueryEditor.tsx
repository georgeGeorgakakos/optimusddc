// ==============================================================================
// FILE: amundsen_application/static/js/pages/QueryWorkbenchPage/components/QueryEditor.tsx
// ==============================================================================

import * as React from 'react';
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { QueryMode, SchemaNode } from '../index';

interface QueryEditorProps {
  query: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  schema: SchemaNode[];
  theme: string;
  autoComplete: boolean;
  readOnly: boolean;
  queryMode: QueryMode; // ⭐ Added this prop
}

  const QueryEditor: React.FC<QueryEditorProps> = ({
                                                   query,
                                                   onChange,
                                                   onExecute,
                                                   schema,
                                                   theme,
                                                   autoComplete,
                                                   readOnly,
                                                   queryMode, // ⭐ Now included
                                                 }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Determine language based on mode
    const language = queryMode === 'sql' ? 'sql' : 'plaintext';

    // Create Monaco editor
    const editor = monaco.editor.create(editorRef.current, {
      value: query,
      language: language,
      theme: theme,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      readOnly: readOnly,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      suggestOnTriggerCharacters: autoComplete,
      quickSuggestions: autoComplete,
    });

    monacoEditorRef.current = editor;

    // Handle value changes
    editor.onDidChangeModelContent(() => {
      onChange(editor.getValue());
    });

    // Handle Ctrl+Enter for execute
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute();
    });

    // SQL-specific autocomplete (only in SQL mode)
    if (queryMode === 'sql' && autoComplete && schema.length > 0) {
      const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: monaco.languages.CompletionItem[] = [];

          // Add SQL keywords
          const sqlKeywords = [
            'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE',
            'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
            'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
            'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
            'IS', 'NULL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
          ];

          sqlKeywords.forEach(keyword => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range: range,
            });
          });

          // Add table names from schema
          schema.forEach(context => {
            if (context.children) {
              context.children.forEach(table => {
                if (table.type === 'table') {
                  suggestions.push({
                    label: table.name,
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: table.name,
                    detail: table.description || 'Table',
                    range: range,
                  });

                  // Add columns for this table
                  if (table.children) {
                    table.children.forEach(column => {
                      suggestions.push({
                        label: `${table.name}.${column.name}`,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: `${table.name}.${column.name}`,
                        detail: `${column.dataType} - ${column.description || ''}`,
                        range: range,
                      });
                    });
                  }
                }
              });
            }
          });

          return { suggestions };
        },
      });

      return () => {
        completionProvider.dispose();
        editor.dispose();
      };
    }

    return () => {
      editor.dispose();
    };
  }, []);

  // Update editor value when query prop changes externally
  useEffect(() => {
    if (monacoEditorRef.current) {
      const currentValue = monacoEditorRef.current.getValue();
      if (currentValue !== query) {
        monacoEditorRef.current.setValue(query);
      }
    }
  }, [query]);

  // Update editor language when mode changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      const model = monacoEditorRef.current.getModel();
      if (model) {
        const language = queryMode === 'sql' ? 'sql' : 'plaintext';
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [queryMode]);

  // Update read-only state
  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  return (
    <div className={`query-editor ${queryMode}-mode`}>
      <div className="editor-header">
        <span className="editor-label">
          {queryMode === 'sql' ? '📝 SQL Query' : '📦 CRUD Command'}
        </span>
        <span className="editor-hint">
          Press <kbd>F5</kbd> or <kbd>Ctrl+Enter</kbd> to execute
        </span>
      </div>
      <div ref={editorRef} style={{ height: 'calc(100% - 40px)', width: '100%' }} />
    </div>
  );
};

export default QueryEditor;
