// CodeEditor.js
import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ 
    language = 'c', 
    value = '', 
    onChange, 
    readOnly = false,
    theme = 'vs-dark',
    fontSize = 14,
    onRun,
    onSubmit,
    onCompile,
    isSubmitting = false,
    isCompiling = false,
    showActions = true
}) => {
    const editorRef = useRef(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const containerRef = useRef(null);
    const resizeTimeoutRef = useRef(null);

    // Cleanup
    useEffect(() => {
        return () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, []);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        setIsEditorReady(true);
        
        editor.updateOptions({
            fontSize: fontSize,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: false,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            wrappingIndent: 'same',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: false,
            formatOnType: true,
            contextmenu: false,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            codeLens: true,
            dragAndDrop: false,
            dropIntoEditor: { enabled: false }
        });

        // Add keybindings
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onSubmit && !readOnly) onSubmit();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, (e) => {
            e.preventDefault();
            if (onCompile && !readOnly) onCompile();
        });

        // Block copy/paste
        editor.onKeyDown((e) => {
            if (e.ctrlKey || e.metaKey) {
                const key = e.keyCode;
                if (key === 67 || key === 86 || key === 88) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });

        editor.onContextMenu((e) => {
            e.event.preventDefault();
            e.event.stopPropagation();
            return false;
        });

        // Debounced layout
        const originalLayout = editor.layout.bind(editor);
        let pending = false;

        editor.layout = (dimension) => {
            if (pending) return;
            pending = true;

            if (dimension && (dimension.width <= 1 || dimension.height <= 1)) {
                pending = false;
                return;
            }

            requestAnimationFrame(() => {
                pending = false;
                try {
                    originalLayout(dimension);
                } catch (err) {}
            });
        };
    };

    // Handle resize
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) return;

        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = setTimeout(() => {
                try {
                    editor.layout();
                } catch (e) {}
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, [isEditorReady]);

    // Update font size
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isEditorReady) return;
        editor.updateOptions({ fontSize });
    }, [fontSize, isEditorReady]);

    const handleEditorChange = (value) => {
        if (onChange) {
            onChange(value);
        }
    };

    const getLanguageConfig = (lang) => {
        const configs = {
            'c': 'c',
            'cpp': 'cpp',
            'java': 'java',
            'python': 'python',
            'javascript': 'javascript'
        };
        return configs[lang] || 'c';
    };

    return (
        <div 
            ref={containerRef}
            className="editor-container" 
            style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                background: '#1e1e1e'
            }}
        >
            <div style={{ flex: 1, minHeight: '0', position: 'relative' }}>
                <Editor
                    height="100%"
                    width="100%"
                    language={getLanguageConfig(language)}
                    value={value}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme={theme}
                    options={{
                        readOnly: readOnly,
                        fontSize: fontSize,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: false,
                        wordWrap: 'on',
                        renderWhitespace: 'selection',
                        contextmenu: false,
                        quickSuggestions: true,
                        parameterHints: { enabled: true },
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
                        formatOnPaste: false,
                        formatOnType: true,
                        fixedOverflowWidgets: true,
                        dragAndDrop: false,
                        dropIntoEditor: { enabled: false }
                    }}
                />
            </div>

            {isEditorReady && (
                <div style={{
                    padding: '4px 12px',
                    background: '#252526',
                    borderTop: '1px solid #3e3e42',
                    fontSize: '11px',
                    color: '#cccccc',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Line {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span>
                    <span>{language.toUpperCase()}</span>
                </div>
            )}
        </div>
    );
};

export default CodeEditor;