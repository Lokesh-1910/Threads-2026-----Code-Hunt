// CodeEditor.js
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ 
    language = 'python', 
    value = '', 
    onChange, 
    readOnly = false,
    theme = 'vs-dark',
    fontSize = 14,
    onRun,
    onSubmit,
    isSubmitting = false,
    showActions = true
}) => {
    const editorRef = useRef(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        setIsEditorReady(true);
        
        // Configure editor settings
        editor.updateOptions({
            fontSize: fontSize,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            wrappingIndent: 'same',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'inline',
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: true,
                verticalHasArrows: true,
                horizontalHasArrows: true
            }
        });

        // Add custom keybindings
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onSubmit && !readOnly) {
                onSubmit();
            }
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (onRun && !readOnly) {
                onRun();
            }
        });
    };

    const handleEditorChange = (value) => {
        if (onChange) {
            onChange(value);
        }
    };

    const handleFormat = () => {
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument').run();
        }
    };

    // Language-specific configuration
    const getLanguageConfig = (lang) => {
        const configs = {
            'python': 'python',
            'javascript': 'javascript',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'csharp': 'csharp',
            'ruby': 'ruby',
            'go': 'go',
            'rust': 'rust',
            'php': 'php'
        };
        return configs[lang] || 'python';
    };

    return (
        <div className="editor-container" style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #334155',
            borderRadius: '10px',
            overflow: 'hidden'
        }}>
            {/* Editor Toolbar */}
            {showActions && (
                <div style={{
                    padding: '10px 15px',
                    background: '#1e293b',
                    borderBottom: '2px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleFormat}
                            style={{
                                padding: '6px 12px',
                                background: '#334155',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#e2e8f0',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                            title="Format Code (Auto)"
                        >
                            <span>🔧</span> Format
                        </button>
                        <span style={{
                            padding: '6px 12px',
                            background: '#0f172a',
                            borderRadius: '6px',
                            color: '#94a3b8',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                        }}>
                            {language.toUpperCase()}
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {onRun && (
                            <button
                                onClick={onRun}
                                disabled={isSubmitting}
                                style={{
                                    padding: '6px 16px',
                                    background: '#059669',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    opacity: isSubmitting ? 0.5 : 1
                                }}
                            >
                                <span>▶</span> Run
                            </button>
                        )}
                        {onSubmit && (
                            <button
                                onClick={onSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '6px 16px',
                                    background: '#4f46e5',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    opacity: isSubmitting ? 0.5 : 1
                                }}
                            >
                                <span>🚀</span> Submit
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Monaco Editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    language={getLanguageConfig(language)}
                    value={value}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme={theme}
                    options={{
                        readOnly: readOnly,
                        readOnlyMessage: { value: 'This submission is read-only' },
                        fontSize: fontSize,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        renderWhitespace: 'selection',
                        contextmenu: true,
                        quickSuggestions: true,
                        parameterHints: { enabled: true },
                        snippetSuggestions: 'inline',
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        tabCompletion: 'on',
                        wordBasedSuggestions: true,
                        selectionHighlight: true,
                        occurrencesHighlight: true,
                        renderLineHighlight: 'all',
                        hideCursorInOverviewRuler: false,
                        matchBrackets: 'always',
                        autoIndent: 'full',
                        formatOnPaste: true,
                        formatOnType: true
                    }}
                />
            </div>

            {/* Status Bar */}
            {isEditorReady && (
                <div style={{
                    padding: '5px 15px',
                    background: '#1e293b',
                    borderTop: '2px solid #334155',
                    fontSize: '11px',
                    color: '#94a3b8',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Line: {editorRef.current?.getPosition()?.lineNumber || 1}, Column: {editorRef.current?.getPosition()?.column || 1}</span>
                    <span>Tab Size: 4 | UTF-8</span>
                </div>
            )}
        </div>
    );
};

export default CodeEditor;