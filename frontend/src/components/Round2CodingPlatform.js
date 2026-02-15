import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from './CodeEditor';

const Round2CodingPlatform = () => {
    const { questionId } = useParams();
    const navigate = useNavigate();
    
    // State management
    const [question, setQuestion] = useState(null);
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('problem');
    const [fontSize, setFontSize] = useState(14);
    const [theme, setTheme] = useState('vs-dark');
    
    // Timer state - YOU CAN SET THIS LATER
    const [timeLeft, setTimeLeft] = useState(90 * 60); // Default 90 minutes - CHANGE THIS LINE
    // To change timer, modify the value above (in seconds)
    // Examples:
    // 60 * 60 = 60 minutes
    // 120 * 60 = 120 minutes
    // 45 * 60 = 45 minutes
    
    // Anti-cheat states
    const [cheatWarnings, setCheatWarnings] = useState([]);
    const [cheatScore, setCheatScore] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [blurCount, setBlurCount] = useState(0);
    const [networkStatus, setNetworkStatus] = useState(true);
    
    // Refs
    const timerRef = useRef(null);
    const fullscreenCheckRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Language templates
    const languageTemplates = {
        python: `# Write your Python code here
def solve():
    # Read input
    data = input().strip().split()
    # Your solution here
    result = "Hello World"
    # Print output
    print(result)

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
        console.log("Hello World");
    });
}

solve();`,
        
        java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // Write your Java code here
        System.out.println("Hello World");
        
        sc.close();
    }
}`,
        
        cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    cout << "Hello World" << endl;
    return 0;
}`,
        
        c: `#include <stdio.h>

int main() {
    // Write your C code here
    printf("Hello World\\n");
    return 0;
}`
    };

    // ============ ADVANCED ANTI-CHEAT MEASURES ============

    // Log cheat activity
    const logCheatActivity = useCallback(async (activityType, details = {}) => {
        try {
            const sessionId = localStorage.getItem('round2SessionId');
            const token = localStorage.getItem('token');

            await axios.post('https://codehunt-backend-xo52.onrender.com/api/round2/log-activity', {
                sessionId,
                activityType,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setCheatScore(prev => prev + 1);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }, []);

    // Show warning message
    const showWarning = useCallback((message, isSevere = false) => {
        const warning = { 
            id: Date.now(), 
            message,
            severe: isSevere 
        };
        setCheatWarnings(prev => [...prev, warning]);
        
        setTimeout(() => {
            setCheatWarnings(prev => prev.filter(w => w.id !== warning.id));
        }, 4000);
    }, []);

    // Add time penalty
    const addTimePenalty = useCallback((seconds, reason) => {
        setTimeLeft(prev => {
            const newTime = Math.max(0, prev - seconds);
            showWarning(`⚠️ Penalty: +${seconds}s for ${reason}`, true);
            logCheatActivity('time_penalty', { seconds, reason, newTime });
            return newTime;
        });
    }, [logCheatActivity, showWarning]);

    // Fullscreen management
    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }, []);

    // Tab switching detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const timeAway = Date.now() - lastActivityRef.current;
                lastActivityRef.current = Date.now();
                
                if (timeAway > 5000) {
                    addTimePenalty(20, 'tab switching');
                } else {
                    addTimePenalty(10, 'quick tab switch');
                }
                
                logCheatActivity('tab_switch', { timeAway });
            } else {
                lastActivityRef.current = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [addTimePenalty, logCheatActivity]);

    // Window blur detection (Alt+Tab, Windows Key)
    useEffect(() => {
        const handleBlur = () => {
            setBlurCount(prev => prev + 1);
            lastActivityRef.current = Date.now();
            
            if (blurCount > 3) {
                addTimePenalty(30, 'multiple window switches');
            } else {
                addTimePenalty(15, 'window switch');
            }
            
            logCheatActivity('window_blur', { count: blurCount + 1 });
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [blurCount, addTimePenalty, logCheatActivity]);

    // Keyboard shortcuts prevention
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent function keys
            if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) {
                e.preventDefault();
                addTimePenalty(10, 'function key pressed');
                logCheatActivity('function_key', { key: e.key });
                return false;
            }

            // Prevent Print Screen
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault();
                addTimePenalty(25, 'print screen attempt');
                logCheatActivity('print_screen');
                return false;
            }

            // Prevent Alt combinations
            if (e.altKey) {
                e.preventDefault();
                if (e.key === 'Tab') {
                    addTimePenalty(20, 'alt+tab detected');
                } else {
                    addTimePenalty(10, 'alt key combination');
                }
                logCheatActivity('alt_key', { key: e.key });
                return false;
            }

            // Prevent Ctrl combinations (except for coding shortcuts)
            if (e.ctrlKey && !e.ctrlKeyOnly && 
                !['c', 'v', 'x', 'z', 'y', 'a', 's'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                addTimePenalty(10, 'ctrl combination');
                logCheatActivity('ctrl_key', { key: e.key });
                return false;
            }

            // Prevent Windows/Super key
            if (e.key === 'Meta' || e.key === 'OS') {
                e.preventDefault();
                addTimePenalty(15, 'windows key');
                logCheatActivity('meta_key');
                return false;
            }

            // Prevent Escape
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                addTimePenalty(20, 'escape key');
                logCheatActivity('escape_key');
                return false;
            }

            // Prevent Alt+F4
            if (e.altKey && e.key === 'F4') {
                e.preventDefault();
                addTimePenalty(30, 'alt+f4 attempt');
                logCheatActivity('alt_f4');
                return false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [addTimePenalty, logCheatActivity]);

    // Fullscreen monitoring
    useEffect(() => {
        enterFullscreen();

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );

            setIsFullscreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen) {
                addTimePenalty(40, 'exiting fullscreen');
                logCheatActivity('fullscreen_exit');
                setTimeout(enterFullscreen, 100);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        fullscreenCheckRef.current = setInterval(() => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                addTimePenalty(20, 'fullscreen check failed');
                enterFullscreen();
            }
        }, 5000);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
            if (fullscreenCheckRef.current) {
                clearInterval(fullscreenCheckRef.current);
            }
        };
    }, [enterFullscreen, addTimePenalty, logCheatActivity]);

    // Copy-paste prevention
    useEffect(() => {
        const preventCopyPaste = (e) => {
            e.preventDefault();
            addTimePenalty(5, 'copy/paste attempt');
            logCheatActivity('copy_paste', { type: e.type });
            showWarning('❌ Copy/Paste is disabled');
            return false;
        };

        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        return () => {
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
        };
    }, [addTimePenalty, logCheatActivity, showWarning]);

    // Network monitoring
    useEffect(() => {
        const handleOnline = () => {
            setNetworkStatus(true);
            showWarning('✅ Network reconnected', false);
        };

        const handleOffline = () => {
            setNetworkStatus(false);
            addTimePenalty(30, 'network disconnect');
            logCheatActivity('network_offline');
            showWarning('⚠️ Network disconnected! Auto-save enabled.', true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addTimePenalty, logCheatActivity, showWarning]);

    // Timer management
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
        showWarning('⏰ Time\'s up! Auto-submitting your code...', true);
        await handleSubmit();
    };

    // Fetch question data
    useEffect(() => {
        fetchQuestion();
        fetchSubmissions();
        
        // Start round session
        const startRoundSession = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post('https://codehunt-backend-xo52.onrender.com/api/round2/start', {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                localStorage.setItem('round2SessionId', response.data.sessionId);
            } catch (error) {
                console.error('Error starting round2 session:', error);
            }
        };
        
        startRoundSession();
    }, [questionId]);

    // Set template when language changes
    useEffect(() => {
        if (languageTemplates[language]) {
            setCode(languageTemplates[language]);
        }
    }, [language]);

    // Fetch question
    const fetchQuestion = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `https://codehunt-backend-xo52.onrender.com/api/round2/questions/${questionId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setQuestion(response.data);
        } catch (error) {
            console.error('Error fetching question:', error);
        }
    };

    // Fetch submissions
    const fetchSubmissions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `https://codehunt-backend-xo52.onrender.com/api/round2/submissions/${questionId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setSubmissions(response.data);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        }
    };

    // Handle code submission
    const handleSubmit = async () => {
        if (!code.trim()) {
            showWarning('Please write some code before submitting!', true);
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
            
            if (response.data.status === 'Accepted') {
                // Play success sound
                try {
                    new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3').play();
                } catch (e) {}
                showWarning('✅ All test cases passed!', false);
            }
            
            // Refresh submissions
            fetchSubmissions();
            
            // Switch to results tab
            setActiveTab('results');

        } catch (error) {
            console.error('Submission error:', error);
            showWarning('❌ Submission failed: ' + (error.response?.data?.error || error.message), true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle code run (sample tests only)
    const handleRun = async () => {
        if (!code.trim()) {
            showWarning('Please write some code before running!', true);
            return;
        }

        setIsSubmitting(true);
        setResult(null);

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
            console.error('Run error:', error);
            showWarning('❌ Run failed: ' + (error.response?.data?.error || error.message), true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset code to template
    const handleReset = () => {
        if (window.confirm('Reset code to template? This will erase your current code.')) {
            setCode(languageTemplates[language]);
            logCheatActivity('code_reset');
        }
    };

    // Format time
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Loading state
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
                    background: 'white',
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
                    <p style={{ fontSize: '18px', color: '#4b5563' }}>Loading coding platform...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f172a',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Anti-Cheat Warning Messages */}
            {cheatWarnings.map(warning => (
                <div key={warning.id} style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: warning.severe ? '#dc2626' : '#f59e0b',
                    color: 'white',
                    padding: '15px 25px',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    animation: 'slideInRight 0.3s ease',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '20px' }}>{warning.severe ? '⚠️' : 'ℹ️'}</span>
                    {warning.message}
                </div>
            ))}

            {/* Header with Timer */}
            <div style={{
                background: '#1e293b',
                padding: '12px 24px',
                borderBottom: '2px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2 style={{ 
                        background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        fontSize: '20px'
                    }}>
                        Code Hunt - Round 2
                    </h2>
                    <span style={{
                        background: '#334155',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        color: '#94a3b8'
                    }}>
                        {question.difficulty}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    {/* Timer - YOU CAN MODIFY THE INITIAL VALUE ABOVE */}
                    <div style={{
                        background: timeLeft < 300 ? '#991b1b' : '#0f172a',
                        padding: '8px 20px',
                        borderRadius: '30px',
                        border: `2px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            ⏰ {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', color: '#94a3b8' }}>
                        <span>⚠️ Warnings: {cheatScore}</span>
                        <span>📶 {networkStatus ? '🟢 Online' : '🔴 Offline'}</span>
                        <span>🔒 {isFullscreen ? 'Fullscreen' : '⚠️ Exit'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                display: 'flex',
                height: 'calc(100vh - 70px)',
                marginTop: '70px',
                overflow: 'hidden'
            }}>
                {/* Left Panel - Problem Description */}
                <div style={{
                    width: '40%',
                    background: '#1e293b',
                    borderRight: '2px solid #334155',
                    overflowY: 'auto',
                    padding: '25px',
                    color: '#e2e8f0'
                }}>
                    {/* Problem Title */}
                    <div style={{ marginBottom: '25px' }}>
                        <h1 style={{ 
                            color: 'white', 
                            marginBottom: '15px',
                            fontSize: '28px'
                        }}>
                            {question.title}
                        </h1>
                        <div style={{ 
                            display: 'flex', 
                            gap: '20px', 
                            flexWrap: 'wrap',
                            fontSize: '14px'
                        }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: question.difficulty === 'Easy' ? '#065f46' : 
                                          question.difficulty === 'Medium' ? '#92400e' : '#991b1b',
                                color: 'white',
                                fontWeight: 'bold'
                            }}>
                                {question.difficulty}
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                                ⏱️ Time Limit: {question.time_limit}s
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                                💾 Memory: {question.memory_limit}MB
                            </span>
                            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                                🏆 Max Score: {question.total_score || 30}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '5px', 
                        marginBottom: '25px', 
                        borderBottom: '2px solid #334155'
                    }}>
                        {['problem', 'sample', 'submissions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: activeTab === tab ? '#4f46e5' : 'transparent',
                                    color: activeTab === tab ? 'white' : '#94a3b8',
                                    borderRadius: '8px 8px 0 0',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: activeTab === tab ? '600' : '400',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {tab === 'problem' && '📝 Problem'}
                                {tab === 'sample' && '📋 Sample Tests'}
                                {tab === 'submissions' && '📊 Submissions'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ lineHeight: '1.8', fontSize: '15px' }}>
                        {activeTab === 'problem' && (
                            <div dangerouslySetInnerHTML={{ 
                                __html: question.description.replace(/\n/g, '<br/>') 
                            }} />
                        )}

                        {activeTab === 'sample' && (
                            <div>
                                <h3 style={{ color: 'white', marginBottom: '20px' }}>
                                    Sample Test Cases
                                </h3>
                                {question.sample_testcases?.map((tc, index) => (
                                    <div key={index} style={{
                                        background: '#0f172a',
                                        border: '2px solid #334155',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            marginBottom: '15px',
                                            color: '#94a3b8'
                                        }}>
                                            <strong style={{ color: 'white' }}>
                                                Test Case #{index + 1}
                                            </strong>
                                            <span style={{ color: '#fbbf24' }}>
                                                Score: {tc.score}
                                            </span>
                                        </div>
                                        
                                        <div style={{ marginBottom: '15px' }}>
                                            <div style={{ color: '#94a3b8', marginBottom: '8px' }}>Input:</div>
                                            <pre style={{
                                                background: '#000000',
                                                color: '#4ade80',
                                                padding: '15px',
                                                borderRadius: '8px',
                                                margin: 0,
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                                overflowX: 'auto'
                                            }}>
                                                {tc.input}
                                            </pre>
                                        </div>
                                        
                                        <div>
                                            <div style={{ color: '#94a3b8', marginBottom: '8px' }}>Expected Output:</div>
                                            <pre style={{
                                                background: '#000000',
                                                color: '#fbbf24',
                                                padding: '15px',
                                                borderRadius: '8px',
                                                margin: 0,
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                                overflowX: 'auto'
                                            }}>
                                                {tc.expected_output}
                                            </pre>
                                        </div>
                                    </div>
                                ))}

                                <div style={{
                                    background: '#312e81',
                                    border: '2px solid #4f46e5',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    marginTop: '20px'
                                }}>
                                    <strong style={{ color: '#c7d2fe' }}>🔒 Hidden Test Cases</strong>
                                    <p style={{ color: '#a5b4fc', marginTop: '10px', fontSize: '14px' }}>
                                        There are {question.hidden_testcases_count} hidden test cases.
                                        They will be evaluated during submission.
                                        Total hidden score: {question.hidden_testcases_total_score} marks
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'submissions' && (
                            <div>
                                <h3 style={{ color: 'white', marginBottom: '20px' }}>
                                    Your Submissions
                                </h3>
                                {submissions.length === 0 ? (
                                    <div style={{
                                        background: '#0f172a',
                                        border: '2px solid #334155',
                                        borderRadius: '12px',
                                        padding: '30px',
                                        textAlign: 'center',
                                        color: '#94a3b8'
                                    }}>
                                        No submissions yet. Write your code and submit!
                                    </div>
                                ) : (
                                    submissions.map((sub, index) => (
                                        <div key={sub.id} style={{
                                            background: sub.status === 'Accepted' ? '#064e3b' : '#7f1d1d',
                                            border: `2px solid ${sub.status === 'Accepted' ? '#10b981' : '#ef4444'}`,
                                            borderRadius: '12px',
                                            padding: '15px',
                                            marginBottom: '15px'
                                        }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                color: 'white',
                                                marginBottom: '10px'
                                            }}>
                                                <div>
                                                    <strong>#{submissions.length - index}</strong>
                                                    <span style={{ 
                                                        marginLeft: '15px',
                                                        color: sub.status === 'Accepted' ? '#4ade80' : '#f87171',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {sub.status}
                                                    </span>
                                                </div>
                                                <span style={{ color: '#94a3b8' }}>
                                                    {new Date(sub.submitted_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div style={{ color: '#d1d5db', fontSize: '14px' }}>
                                                Score: {sub.total_score} | 
                                                Passed: {sub.passed_testcases}/{sub.total_testcases} tests
                                            </div>
                                            {sub.execution_time && (
                                                <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>
                                                    Execution Time: {sub.execution_time}ms
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Code Editor */}
                <div style={{
                    width: '60%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0f172a'
                }}>
                    {/* Editor Toolbar */}
                    <div style={{
                        padding: '15px 20px',
                        background: '#1e293b',
                        borderBottom: '2px solid #334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '2px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="python">🐍 Python</option>
                                <option value="javascript">📜 JavaScript</option>
                                <option value="java">☕ Java</option>
                                <option value="cpp">⚡ C++</option>
                                <option value="c">🔵 C</option>
                            </select>

                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="12">12px</option>
                                <option value="14">14px</option>
                                <option value="16">16px</option>
                                <option value="18">18px</option>
                                <option value="20">20px</option>
                            </select>

                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="vs-dark">🌙 Dark</option>
                                <option value="light">☀️ Light</option>
                                <option value="hc-black">⚫ High Contrast</option>
                            </select>

                            <button
                                onClick={handleReset}
                                style={{
                                    padding: '8px 16px',
                                    background: '#334155',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                🔄 Reset
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleRun}
                                disabled={isSubmitting}
                                style={{
                                    padding: '10px 24px',
                                    background: isSubmitting ? '#4b5563' : '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSubmitting ? '⏳ Running...' : '▶ Run Code'}
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '10px 30px',
                                    background: isSubmitting ? '#4b5563' : '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSubmitting ? '⏳ Submitting...' : '🚀 Submit'}
                            </button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div style={{ flex: 1, padding: '20px', background: '#0f172a' }}>
                        <CodeEditor
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme={theme}
                            fontSize={fontSize}
                            options={{
                                minimap: { enabled: false },
                                fontSize: fontSize,
                                lineNumbers: 'on',
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                wrappingIndent: 'indent',
                                padding: { top: 15, bottom: 15 }
                            }}
                        />
                    </div>

                    {/* Results Panel */}
                    {result && (
                        <div style={{
                            borderTop: '2px solid #334155',
                            background: '#1e293b',
                            padding: '20px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: result.status === 'Accepted' ? '#4ade80' : '#f87171'
                                }}>
                                    {result.status === 'Accepted' ? '✅ All Test Cases Passed!' : '📊 Test Results'}
                                </h3>
                                <span style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 'bold', 
                                    color: '#fbbf24' 
                                }}>
                                    Score: {result.totalScore}/{result.totalTestCases * 5}
                                </span>
                            </div>
                            
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                                gap: '15px' 
                            }}>
                                {result.results.map((test, index) => (
                                    <div key={index} style={{
                                        border: '2px solid',
                                        borderColor: test.passed ? '#10b981' : '#ef4444',
                                        borderRadius: '10px',
                                        padding: '15px',
                                        background: test.passed ? '#064e3b' : '#7f1d1d'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            marginBottom: '10px',
                                            color: 'white'
                                        }}>
                                            <strong>Test #{index + 1}</strong>
                                            <span style={{ 
                                                color: test.passed ? '#4ade80' : '#f87171',
                                                fontWeight: 'bold'
                                            }}>
                                                {test.passed ? '✓ Passed' : '✗ Failed'}
                                            </span>
                                        </div>
                                        
                                        {!test.is_hidden && (
                                            <>
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    marginBottom: '8px',
                                                    color: '#94a3b8'
                                                }}>
                                                    <div><strong>Expected:</strong> {test.expected_output?.substring(0, 50)}</div>
                                                    <div><strong>Got:</strong> {test.actual_output?.substring(0, 50)}</div>
                                                </div>
                                            </>
                                        )}
                                        
                                        {test.is_hidden && (
                                            <div style={{ 
                                                color: '#94a3b8', 
                                                fontSize: '12px', 
                                                fontStyle: 'italic',
                                                marginBottom: '8px'
                                            }}>
                                                🔒 Hidden test case
                                            </div>
                                        )}
                                        
                                        <div style={{ 
                                            marginTop: '10px', 
                                            fontSize: '11px', 
                                            color: '#9ca3af',
                                            borderTop: '1px solid #334155',
                                            paddingTop: '8px'
                                        }}>
                                            Score: {test.passed ? test.score : 0}/{test.score} | 
                                            Time: {test.execution_time}ms
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Styles */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                * {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                
                ::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                
                ::-webkit-scrollbar-track {
                    background: #1e293b;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #475569;
                    border-radius: 5px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
                
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
            `}</style>
        </div>
    );
};

export default Round2CodingPlatform;