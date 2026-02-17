// Round2CodingPlatform.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from './CodeEditor';
import ErrorBoundary from './ErrorBoundary';

// Suppress only critical ResizeObserver errors
const originalError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string' && 
        (args[0].includes('ResizeObserver loop') || 
         args[0].includes('ResizeObserver loop limit exceeded'))) {
        return;
    }
    originalError.apply(console, args);
};

const Round2CodingPlatform = () => {
    const { questionId } = useParams();
    const navigate = useNavigate();
    
    const [question, setQuestion] = useState(null);
    const [language, setLanguage] = useState('c'); // Default to C
    const [prevLanguage, setPrevLanguage] = useState('c');
    const [code, setCode] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('problem');
    const [fontSize, setFontSize] = useState(14);
    const [timeLeft, setTimeLeft] = useState(90 * 60);
    const [filename, setFilename] = useState('solution');
    const [userInput, setUserInput] = useState('');
    const [showInputDialog, setShowInputDialog] = useState(false);
    const [compilerOutput, setCompilerOutput] = useState({
        stdout: '',
        stderr: '',
        error: '',
        warning: '',
        exitCode: null,
        executionTime: 0,
        compilationError: null,
        runtimeError: null
    });
    
    // Anti-cheat states
    const [cheatWarnings, setCheatWarnings] = useState([]);
    const [cheatScore, setCheatScore] = useState(0);
    const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
    
    // Refs
    const timerRef = useRef(null);
    const fetchExecutedRef = useRef(false);
    const fullscreenCheckRef = useRef(null);
    const containerRef = useRef(null);
    const fullscreenRetryRef = useRef(null);

    // Language templates with proper structure
    const languageTemplates = {
        c: `#include <stdio.h>

int main() {
    // Write your C code here
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`,
        
        cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
        
        java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your Java code here
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
        sc.close();
    }
}`,
        
        python: `# Write your Python code here
def solve():
    try:
        # Read input
        data = input().strip().split()
        a = int(data[0])
        b = int(data[1])
        # Your solution here
        print(a + b)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    solve()`,
        
        javascript: `// Write your JavaScript code here
function solve() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    let input = [];
    rl.on('line', (line) => {
        input.push(line);
    });
    
    rl.on('close', () => {
        // Your solution here
        const [a, b] = input[0].split(' ').map(Number);
        console.log(a + b);
    });
}

solve();`
    };

    // ============ ADVANCED FULLSCREEN MANAGEMENT ============

    const forceFullscreen = useCallback(() => {
        // Clear any pending retry
        if (fullscreenRetryRef.current) {
            clearTimeout(fullscreenRetryRef.current);
            fullscreenRetryRef.current = null;
        }

        const enterFullscreen = () => {
            const elem = document.documentElement;
            const requestFullscreen = 
                elem.requestFullscreen ||
                elem.webkitRequestFullscreen ||
                elem.msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(elem).then(() => {
                    setFullscreenEnabled(true);
                }).catch(() => {
                    // Retry after a short delay
                    fullscreenRetryRef.current = setTimeout(forceFullscreen, 50);
                });
            }
        };

        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            enterFullscreen();
        } else {
            setFullscreenEnabled(true);
        }
    }, []);

    // Aggressive fullscreen enforcement
    useEffect(() => {
        // Force fullscreen immediately
        forceFullscreen();

        const handleFullscreenChange = () => {
            const isFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );

            setFullscreenEnabled(isFullscreen);

            if (!isFullscreen) {
                // Immediate re-entry (faster than a blink)
                forceFullscreen();
                
                // Add penalty but no warning (silent)
                setTimeLeft(prev => Math.max(0, prev - 10));
                setCheatScore(prev => prev + 1);
            }
        };

        const handleKeyDown = (e) => {
            // Block ALL escape attempts
            if (e.key === 'Escape' || e.keyCode === 27 ||
                e.key === 'F11' || e.keyCode === 122 ||
                e.altKey || e.metaKey) {
                
                e.preventDefault();
                e.stopPropagation();
                
                // Immediate fullscreen re-entry
                if (!document.fullscreenElement) {
                    forceFullscreen();
                }
                
                // Silent penalty
                setTimeLeft(prev => Math.max(0, prev - 5));
                setCheatScore(prev => prev + 1);
                
                return false;
            }
        };

        // Ultra-fast fullscreen check (every 100ms)
        fullscreenCheckRef.current = setInterval(() => {
            if (!document.fullscreenElement && 
                !document.webkitFullscreenElement && 
                !document.msFullscreenElement) {
                forceFullscreen();
                setTimeLeft(prev => Math.max(0, prev - 2));
            }
        }, 100);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown, true);
            
            if (fullscreenCheckRef.current) {
                clearInterval(fullscreenCheckRef.current);
            }
            if (fullscreenRetryRef.current) {
                clearTimeout(fullscreenRetryRef.current);
            }

            // Clean exit
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        };
    }, [forceFullscreen]);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Auto-submit when time expires
    const handleAutoSubmit = async () => {
        // Silent auto-submit
        await handleSubmit();
    };

    // Language change handler
    useEffect(() => {
        if (language !== prevLanguage) {
            if (code && code !== languageTemplates[prevLanguage]) {
                if (!window.confirm('Changing language will reset your code. Continue?')) {
                    setLanguage(prevLanguage);
                    return;
                }
            }
            setCode(languageTemplates[language]);
            setPrevLanguage(language);
            // Clear previous outputs
            setCompilerOutput({
                stdout: '',
                stderr: '',
                error: '',
                warning: '',
                exitCode: null,
                executionTime: 0,
                compilationError: null,
                runtimeError: null
            });
        }
    }, [language, prevLanguage, code]);

    // Fetch question data
    useEffect(() => {
        if (!questionId) return;

        const fetchData = async () => {
            if (fetchExecutedRef.current) return;
            fetchExecutedRef.current = true;

            try {
                const token = localStorage.getItem('token');
                
                const questionRes = await axios.get(
                    `https://codehunt-backend-xo52.onrender.com/api/round2/questions/${questionId}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                
                setQuestion(questionRes.data);

                try {
                    const submissionsRes = await axios.get(
                        `https://codehunt-backend-xo52.onrender.com/api/round2/submissions/${questionId}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    setSubmissions(submissionsRes.data);
                } catch (subError) {}

                try {
                    const sessionRes = await axios.post(
                        'https://codehunt-backend-xo52.onrender.com/api/round2/start', 
                        {},
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    localStorage.setItem('round2SessionId', sessionRes.data.sessionId);
                } catch (sessionError) {}

            } catch (err) {
                console.error('Error fetching question:', err);
            }
        };

        fetchData();
    }, [questionId]);

    // Set initial template
    useEffect(() => {
        if (languageTemplates[language] && !code) {
            setCode(languageTemplates[language]);
        }
    }, [language, code]);

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ============ PROFESSIONAL COMPILER IMPLEMENTATION ============

    // 1️⃣ COMPILE FUNCTION - Checks syntax, shows compilation errors
    const handleCompile = async () => {
        if (!code.trim()) {
            setCompilerOutput({
                ...compilerOutput,
                error: 'Error: No code to compile',
                compilationError: 'Empty code'
            });
            return;
        }

        setIsCompiling(true);
        setCompilerOutput({
            stdout: '',
            stderr: '',
            error: '',
            warning: '',
            exitCode: null,
            executionTime: 0,
            compilationError: null,
            runtimeError: null
        });

        try {
            const token = localStorage.getItem('token');
            const startTime = Date.now();

            // Compile only - no execution
            const response = await axios.post(
                'https://codehunt-backend-xo52.onrender.com/api/round2/compile',
                {
                    language,
                    code
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const executionTime = Date.now() - startTime;

            if (response.data.compilationError) {
                // Compilation failed
                setCompilerOutput({
                    ...compilerOutput,
                    stderr: response.data.compilationError,
                    compilationError: response.data.compilationError,
                    exitCode: 1,
                    executionTime
                });
            } else {
                // Compilation successful
                setCompilerOutput({
                    ...compilerOutput,
                    stdout: '✅ Compilation successful',
                    warning: response.data.warnings || '',
                    exitCode: 0,
                    executionTime
                });
                // Ask for input to run
                setShowInputDialog(true);
            }

        } catch (error) {
            setCompilerOutput({
                ...compilerOutput,
                error: error.response?.data?.error || error.message,
                compilationError: error.response?.data?.error || error.message,
                exitCode: 1,
                executionTime: 0
            });
        } finally {
            setIsCompiling(false);
        }
    };

    // 2️⃣ RUN FUNCTION - Executes with user input, shows runtime errors
    const executeWithInput = async () => {
        setShowInputDialog(false);
        setIsRunning(true);

        try {
            const token = localStorage.getItem('token');
            const startTime = Date.now();

            const response = await axios.post(
                'https://codehunt-backend-xo52.onrender.com/api/round2/execute',
                {
                    language,
                    code,
                    input: userInput
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const executionTime = Date.now() - startTime;

            if (response.data.runtimeError) {
                // Runtime error occurred
                setCompilerOutput({
                    ...compilerOutput,
                    stderr: response.data.runtimeError,
                    runtimeError: response.data.runtimeError,
                    exitCode: response.data.exitCode || 1,
                    executionTime
                });
            } else {
                // Successful execution
                setCompilerOutput({
                    ...compilerOutput,
                    stdout: response.data.stdout || '',
                    stderr: response.data.stderr || '',
                    warning: response.data.warning || '',
                    exitCode: response.data.exitCode || 0,
                    executionTime
                });
            }

        } catch (error) {
            setCompilerOutput({
                ...compilerOutput,
                error: error.response?.data?.error || error.message,
                runtimeError: error.response?.data?.error || error.message,
                exitCode: 1,
                executionTime: 0
            });
        } finally {
            setIsRunning(false);
        }
    };

    // 3️⃣ RUN SAMPLE FUNCTION - Tests with sample test cases
    const handleRun = async () => {
        if (!code.trim()) {
            setCompilerOutput({
                ...compilerOutput,
                error: 'Error: No code to run'
            });
            return;
        }

        setIsRunning(true);
        setResult(null);
        setCompilerOutput({
            stdout: '',
            stderr: '',
            error: '',
            warning: '',
            exitCode: null,
            executionTime: 0,
            compilationError: null,
            runtimeError: null
        });

        try {
            const token = localStorage.getItem('token');

            const response = await axios.post(
                'https://codehunt-backend-xo52.onrender.com/api/round2/run',
                {
                    questionId: parseInt(questionId),
                    language,
                    code
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setResult({
                ...response.data,
                isRunOnly: true
            });
            
            setActiveTab('results');

        } catch (error) {
            setCompilerOutput({
                ...compilerOutput,
                error: error.response?.data?.error || error.message,
                runtimeError: error.response?.data?.error || error.message
            });
        } finally {
            setIsRunning(false);
        }
    };

    // 4️⃣ SUBMIT FUNCTION - Full evaluation
    const handleSubmit = async () => {
        if (!code.trim()) {
            setCompilerOutput({
                ...compilerOutput,
                error: 'Error: No code to submit'
            });
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const token = localStorage.getItem('token');
            const sessionId = localStorage.getItem('round2SessionId');

            const response = await axios.post(
                'https://codehunt-backend-xo52.onrender.com/api/round2/submit',
                {
                    questionId: parseInt(questionId),
                    language,
                    code,
                    sessionId
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setResult(response.data);
            
            try {
                const submissionsRes = await axios.get(
                    `https://codehunt-backend-xo52.onrender.com/api/round2/submissions/${questionId}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                setSubmissions(submissionsRes.data);
            } catch (subError) {}
            
            setActiveTab('results');

        } catch (error) {
            setCompilerOutput({
                ...compilerOutput,
                error: error.response?.data?.error || error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Reset code to template?')) {
            setCode(languageTemplates[language]);
            setCompilerOutput({
                stdout: '',
                stderr: '',
                error: '',
                warning: '',
                exitCode: null,
                executionTime: 0,
                compilationError: null,
                runtimeError: null
            });
        }
    };

    const handleSave = () => {
        const ext = {
            'c': 'c',
            'cpp': 'cpp',
            'java': 'java',
            'python': 'py',
            'javascript': 'js'
        }[language] || 'txt';
        
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearUserInput = () => {
        setUserInput('');
        setShowInputDialog(false);
    };

    const getLanguageDisplay = () => {
        const map = {
            'c': 'C',
            'cpp': 'C++',
            'java': 'Java',
            'python': 'Python',
            'javascript': 'JavaScript'
        };
        return map[language] || language;
    };

    if (!question) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '40px',
                    borderRadius: '20px',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f4f6',
                        borderTop: '5px solid #4f46e5',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p>Loading coding platform...</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div ref={containerRef} style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative'
            }}>
                {/* Fullscreen status - minimal indicator */}
                {!fullscreenEnabled && (
                    <div style={{
                        position: 'fixed',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        zIndex: 2000,
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}>
                        🔒 Fullscreen
                    </div>
                )}

                {/* Header with Timer */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '12px 24px',
                    borderBottom: '2px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    height: '60px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <h2 style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: 'bold'
                        }}>
                            Code Hunt - Round 2
                        </h2>
                        <span style={{
                            background: '#f3f4f6',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            color: '#4b5563',
                            fontWeight: '500'
                        }}>
                            {getLanguageDisplay()}
                        </span>
                    </div>

                    <div style={{
                        background: timeLeft < 300 ? '#fee2e2' : '#f3f4f6',
                        padding: '6px 16px',
                        borderRadius: '30px',
                        border: `1px solid ${timeLeft < 300 ? '#ef4444' : '#e5e7eb'}`,
                        fontSize: '20px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        color: timeLeft < 300 ? '#dc2626' : '#4f46e5'
                    }}>
                        ⏰ {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{
                    display: 'flex',
                    height: 'calc(100vh - 60px)',
                    marginTop: '60px',
                    overflow: 'hidden'
                }}>
                    {/* Left Panel - Problem Statement */}
                    <div style={{
                        width: '35%',
                        background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRight: '2px solid #e5e7eb',
                        overflowY: 'auto',
                        padding: '24px',
                        color: '#1f2937'
                    }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#4f46e5' }}>
                            {question.title}
                        </h1>
                        <div style={{ 
                            fontSize: '15px', 
                            lineHeight: '1.7',
                            color: '#374151'
                        }}>
                            {question.description || question.problem_statement || 'No problem description available.'}
                        </div>
                    </div>

                    {/* Right Panel - Code Editor */}
                    <div style={{
                        width: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#f9fafb'
                    }}>
                        {/* Toolbar */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderBottom: '2px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        background: 'white',
                                        color: '#1f2937',
                                        fontSize: '14px',
                                        height: '38px',
                                        minWidth: '100px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="c">C</option>
                                    <option value="cpp">C++</option>
                                    <option value="java">Java</option>
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                </select>

                                <select
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        background: 'white',
                                        color: '#1f2937',
                                        fontSize: '14px',
                                        height: '38px',
                                        width: '70px'
                                    }}
                                >
                                    <option value="12">12</option>
                                    <option value="14">14</option>
                                    <option value="16">16</option>
                                    <option value="18">18</option>
                                </select>

                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#f3f4f6',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        height: '38px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: '500'
                                    }}
                                >
                                    🔄 Reset
                                </button>

                                <input
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        background: 'white',
                                        color: '#1f2937',
                                        fontSize: '14px',
                                        height: '38px',
                                        width: '120px'
                                    }}
                                    placeholder="Filename"
                                />

                                <button
                                    onClick={handleSave}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#f3f4f6',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        height: '38px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: '500'
                                    }}
                                >
                                    💾 Save
                                </button>
                            </div>

                            {/* Three main action buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleCompile}
                                    disabled={isCompiling || isRunning || isSubmitting}
                                    style={{
                                        padding: '8px 20px',
                                        background: isCompiling ? '#9ca3af' : '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: (isCompiling || isRunning || isSubmitting) ? 'not-allowed' : 'pointer',
                                        height: '38px',
                                        minWidth: '90px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isCompiling ? '⏳' : '⚙️'} Compile
                                </button>

                                <button
                                    onClick={handleRun}
                                    disabled={isCompiling || isRunning || isSubmitting}
                                    style={{
                                        padding: '8px 20px',
                                        background: (isCompiling || isRunning || isSubmitting) ? '#9ca3af' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: (isCompiling || isRunning || isSubmitting) ? 'not-allowed' : 'pointer',
                                        height: '38px',
                                        minWidth: '80px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isRunning ? '⏳' : '▶'} Run
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isCompiling || isRunning || isSubmitting}
                                    style={{
                                        padding: '8px 24px',
                                        background: (isCompiling || isRunning || isSubmitting) ? '#9ca3af' : '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: (isCompiling || isRunning || isSubmitting) ? 'not-allowed' : 'pointer',
                                        height: '38px',
                                        minWidth: '90px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isSubmitting ? '⏳' : '🚀'} Submit
                                </button>
                            </div>
                        </div>

                        {/* Code Editor */}
                        <div style={{ 
                            flex: 1, 
                            padding: '16px', 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            minHeight: '400px'
                        }}>
                            <CodeEditor
                                language={language}
                                value={code}
                                onChange={(value) => setCode(value || '')}
                                theme="vs-dark"
                                fontSize={fontSize}
                                onRun={handleRun}
                                onSubmit={handleSubmit}
                                onCompile={handleCompile}
                                isSubmitting={isSubmitting}
                                isCompiling={isCompiling}
                                showActions={false}
                            />
                        </div>

                        {/* Input Dialog for Manual Testing */}
                        {showInputDialog && (
                            <div style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'white',
                                padding: '28px',
                                borderRadius: '16px',
                                border: '2px solid #4f46e5',
                                zIndex: 3000,
                                width: '450px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                            }}>
                                <h3 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '20px', fontWeight: 'bold' }}>
                                    Program Input
                                </h3>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                                    Enter input for your program (stdin):
                                </p>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: '#f9fafb',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        color: '#1f2937',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        minHeight: '120px',
                                        marginBottom: '20px',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Enter your program input here...
Example for C/C++:
5 3"
                                />
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={clearUserInput}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#f3f4f6',
                                            color: '#374151',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeWithInput}
                                        disabled={isRunning}
                                        style={{
                                            padding: '10px 24px',
                                            background: isRunning ? '#9ca3af' : '#4f46e5',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: isRunning ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {isRunning ? '⏳ Running...' : '▶ Run Program'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Compiler Output Panel - Professional Display */}
                        {(compilerOutput.stdout || compilerOutput.stderr || compilerOutput.error || compilerOutput.compilationError || compilerOutput.runtimeError) && (
                            <div style={{
                                borderTop: '2px solid #e5e7eb',
                                background: 'white',
                                padding: '16px 20px',
                                maxHeight: '280px',
                                overflowY: 'auto'
                            }}>
                                {/* Header with exit code and time */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ 
                                            fontWeight: 'bold',
                                            color: compilerOutput.exitCode === 0 ? '#10b981' : '#ef4444'
                                        }}>
                                            {compilerOutput.exitCode === 0 ? '✅ Success' : '❌ Failed'}
                                        </span>
                                        {compilerOutput.exitCode !== null && (
                                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                Exit Code: {compilerOutput.exitCode}
                                            </span>
                                        )}
                                    </div>
                                    {compilerOutput.executionTime > 0 && (
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                            ⏱️ {compilerOutput.executionTime}ms
                                        </span>
                                    )}
                                </div>

                                {/* Compilation Error */}
                                {compilerOutput.compilationError && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
                                            ❌ Compilation Error:
                                        </div>
                                        <pre style={{
                                            background: '#fef2f2',
                                            color: '#b91c1c',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #fee2e2',
                                            margin: 0
                                        }}>
                                            {compilerOutput.compilationError}
                                        </pre>
                                    </div>
                                )}

                                {/* Runtime Error */}
                                {compilerOutput.runtimeError && !compilerOutput.compilationError && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
                                            ❌ Runtime Error:
                                        </div>
                                        <pre style={{
                                            background: '#fef2f2',
                                            color: '#b91c1c',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #fee2e2',
                                            margin: 0
                                        }}>
                                            {compilerOutput.runtimeError}
                                        </pre>
                                    </div>
                                )}

                                {/* General Error */}
                                {compilerOutput.error && !compilerOutput.compilationError && !compilerOutput.runtimeError && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
                                            ❌ Error:
                                        </div>
                                        <pre style={{
                                            background: '#fef2f2',
                                            color: '#b91c1c',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #fee2e2',
                                            margin: 0
                                        }}>
                                            {compilerOutput.error}
                                        </pre>
                                    </div>
                                )}

                                {/* Warnings */}
                                {compilerOutput.warning && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                                            ⚠️ Warning:
                                        </div>
                                        <pre style={{
                                            background: '#fffbeb',
                                            color: '#b45309',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word'
                                        }}>
                                            {compilerOutput.warning}
                                        </pre>
                                    </div>
                                )}

                                {/* Standard Output */}
                                {compilerOutput.stdout && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                                            📤 Program Output (stdout):
                                        </div>
                                        <pre style={{
                                            background: '#f0fdf4',
                                            color: '#166534',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #bbf7d0',
                                            margin: 0
                                        }}>
                                            {compilerOutput.stdout}
                                        </pre>
                                    </div>
                                )}

                                {/* Standard Error */}
                                {compilerOutput.stderr && !compilerOutput.compilationError && !compilerOutput.runtimeError && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                                            ⚠️ Standard Error (stderr):
                                        </div>
                                        <pre style={{
                                            background: '#fff7ed',
                                            color: '#9a3412',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            border: '1px solid #fed7aa',
                                            margin: 0
                                        }}>
                                            {compilerOutput.stderr}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Run Results Panel */}
                        {result && (
                            <div style={{
                                borderTop: '2px solid #e5e7eb',
                                background: 'white',
                                padding: '16px 20px',
                                maxHeight: '280px',
                                overflowY: 'auto'
                            }}>
                                {result.isRunOnly ? (
                                    <div>
                                        <h4 style={{ 
                                            color: result.error ? '#ef4444' : '#10b981',
                                            marginBottom: '12px',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            {result.error ? '❌ Run Error' : '✅ Sample Test Results'}
                                        </h4>
                                        {result.error ? (
                                            <pre style={{ 
                                                color: '#ef4444', 
                                                background: '#fef2f2', 
                                                padding: '12px', 
                                                borderRadius: '8px',
                                                border: '1px solid #fee2e2'
                                            }}>
                                                Error: {result.error}
                                            </pre>
                                        ) : (
                                            <div>
                                                <p style={{ color: '#10b981', marginBottom: '12px', fontWeight: '500' }}>
                                                    Passed {result.passedCount}/{result.totalTestCases} sample tests
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {result.results?.map((r, idx) => (
                                                        <div key={idx} style={{
                                                            background: '#f9fafb',
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            borderLeft: `4px solid ${r.passed ? '#10b981' : '#ef4444'}`
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                                                                    Test {idx + 1}
                                                                </span>
                                                                <span style={{ color: r.passed ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                                                    {r.passed ? '✓ Passed' : '✗ Failed'}
                                                                </span>
                                                            </div>
                                                            {!r.is_hidden && (
                                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                    <div>Input: {r.input || 'N/A'}</div>
                                                                    <div>Expected: {r.expected_output || 'N/A'}</div>
                                                                    <div>Got: {r.actual_output || 'N/A'}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <h4 style={{ 
                                            color: result.status === 'Accepted' ? '#10b981' : '#ef4444',
                                            marginBottom: '12px',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            {result.status === 'Accepted' ? '✅ All Tests Passed!' : '❌ Submission Results'}
                                        </h4>
                                        <p style={{ color: '#4f46e5', fontWeight: 'bold', marginBottom: '12px' }}>
                                            Score: {result.totalScore || 0}/{result.totalTestCases * 5 || 0}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {result.results?.map((test, idx) => (
                                                <div key={idx} style={{
                                                    background: '#f9fafb',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    borderLeft: `4px solid ${test.passed ? '#10b981' : '#ef4444'}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontWeight: '500', color: '#1f2937' }}>
                                                            Test #{idx + 1}
                                                        </span>
                                                        <span style={{ color: test.passed ? '#10b981' : '#ef4444' }}>
                                                            {test.passed ? '✓ Passed' : '✗ Failed'}
                                                        </span>
                                                    </div>
                                                    {test.is_hidden && (
                                                        <div style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>
                                                            🔒 Hidden test case
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    ::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    
                    ::-webkit-scrollbar-track {
                        background: #f1f1f1;
                    }
                    
                    ::-webkit-scrollbar-thumb {
                        background: #c1c1c1;
                        border-radius: 4px;
                    }
                    
                    ::-webkit-scrollbar-thumb:hover {
                        background: #a1a1a1;
                    }
                    
                    button:hover {
                        opacity: 0.9;
                        transform: translateY(-1px);
                    }
                    
                    button:active {
                        transform: translateY(0);
                    }
                `}</style>
            </div>
        </ErrorBoundary>
    );
};

export default Round2CodingPlatform;