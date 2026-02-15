import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Round1Quiz() {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cheatWarnings, setCheatWarnings] = useState([]);
    const [cheatScore, setCheatScore] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [blurCount, setBlurCount] = useState(0);
    const [networkStatus, setNetworkStatus] = useState(true);
    
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const fullscreenCheckRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const answerTimesRef = useRef({});

    // ============ ADVANCED ANTI-CHEAT MEASURES ============

    // Log cheat activity to backend
    const logCheatActivity = useCallback(async (activityType, details = {}) => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const token = localStorage.getItem('token');

            await axios.post('https://codehunt-backend-xo52.onrender.com/api/round1/log-activity', {
                sessionId,
                activityType,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update cheat score locally
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
        
        // Auto-remove after 4 seconds
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

    // ============ FULLSCREEN MANAGEMENT ============
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

    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }, []);

    // ============ DETECT SCREEN CAPTURE/SHARE ============
    const detectScreenCapture = useCallback(() => {
        // Detect potential screen sharing via getDisplayMedia
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const hasScreenCapture = devices.some(device => 
                        device.kind === 'videoinput' && 
                        device.label.toLowerCase().includes('screen')
                    );
                    if (hasScreenCapture) {
                        addTimePenalty(30, 'screen capture detected');
                        logCheatActivity('screen_capture_detected');
                    }
                })
                .catch(() => {});
        }
    }, [addTimePenalty, logCheatActivity]);

    // ============ DETECT VIRTUAL MACHINE / REMOTE DESKTOP ============
    const detectRemoteAccess = useCallback(() => {
        // Check for common remote access indicators
        const userAgent = navigator.userAgent.toLowerCase();
        const isRemote = (
            userAgent.includes('teamviewer') ||
            userAgent.includes('anydesk') ||
            userAgent.includes('remote') ||
            userAgent.includes('vnc') ||
            userAgent.includes('rdp')
        );

        if (isRemote) {
            addTimePenalty(60, 'remote access detected');
            logCheatActivity('remote_access_detected');
        }
    }, [addTimePenalty, logCheatActivity]);

    // ============ DETECT DEVTOOLS OPEN ============
    const detectDevTools = useCallback(() => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            addTimePenalty(20, 'dev tools detected');
            logCheatActivity('dev_tools_detected');
        }
    }, [addTimePenalty, logCheatActivity]);

    // ============ DETECT TAB SWITCHING ============
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const timeAway = Date.now() - lastActivityRef.current;
                lastActivityRef.current = Date.now();
                
                // If away for more than 5 seconds, it's suspicious
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

    // ============ DETECT WINDOW BLUR (Alt+Tab, Windows Key) ============
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

    // ============ DETECT KEYBOARD SHORTCUTS ============
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent ALL function keys
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

            // Prevent Ctrl combinations (except for accessibility)
            if (e.ctrlKey && !e.ctrlKeyOnly) {
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

    // ============ FULLSCREEN MONITORING ============
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
                // Force re-enter fullscreen
                setTimeout(enterFullscreen, 100);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        // Periodic fullscreen check
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

    // ============ NETWORK MONITORING ============
    useEffect(() => {
        const handleOnline = () => {
            setNetworkStatus(true);
        };

        const handleOffline = () => {
            setNetworkStatus(false);
            addTimePenalty(30, 'network disconnect');
            logCheatActivity('network_offline');
            showWarning('⚠️ Network disconnected! Auto-submit on reconnect.', true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addTimePenalty, logCheatActivity, showWarning]);

    // ============ COPY-PASTE PREVENTION ============
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

    // ============ DETECT MULTIPLE MONITORS ============
    useEffect(() => {
        const detectMultipleMonitors = () => {
            if (window.screen && window.screen.availWidth) {
                // Basic detection - if screen width is very large
                if (window.screen.width > 2500) {
                    logCheatActivity('wide_screen', { width: window.screen.width });
                }
            }
        };
        detectMultipleMonitors();
    }, [logCheatActivity]);

    // ============ ANSWER TIME ANALYSIS ============
    const recordAnswerTime = useCallback((questionId) => {
        answerTimesRef.current[questionId] = {
            start: Date.now(),
            end: null
        };
    }, []);

    const completeAnswerTime = useCallback((questionId) => {
        if (answerTimesRef.current[questionId]) {
            answerTimesRef.current[questionId].end = Date.now();
            const timeSpent = answerTimesRef.current[questionId].end - answerTimesRef.current[questionId].start;
            
            // If answer was too fast (< 2 seconds), it's suspicious
            if (timeSpent < 2000) {
                addTimePenalty(15, 'suspiciously fast answer');
                logCheatActivity('fast_answer', { questionId, timeSpent });
            }
        }
    }, [addTimePenalty, logCheatActivity]);

    // ============ TIMER MANAGEMENT ============
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmitQuiz();
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

    // ============ FETCH QUESTIONS ============
    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('https://codehunt-backend-xo52.onrender.com/api/round1/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setQuestions(response.data);
            setLoading(false);
            
            // Record start time for first question
            if (response.data.length > 0) {
                recordAnswerTime(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    useEffect(() => {
        fetchQuestions();
        // Run initial detection
        detectRemoteAccess();
        detectScreenCapture();
        setInterval(detectDevTools, 3000);
    }, [detectRemoteAccess, detectScreenCapture, detectDevTools]);

    // ============ HANDLE ANSWER ============
    const handleAnswer = (questionId, answer) => {
        // Complete time tracking for previous question
        completeAnswerTime(questionId);
        
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
        
        // Start time tracking for next question if exists
        if (currentIndex < questions.length - 1) {
            recordAnswerTime(questions[currentIndex + 1].id);
        }
    };

    // ============ NAVIGATION ============
    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // ============ SUBMIT QUIZ ============
    const handleSubmitQuiz = async () => {
        if (submitting) return;
        
        setSubmitting(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const token = localStorage.getItem('token');
            const unansweredCount = questions.length - Object.keys(answers).length;

            // Submit all answers
            for (const question of questions) {
                const selectedAnswer = answers[question.id] || '';
                await axios.post('https://codehunt-backend-xo52.onrender.com/api/round1/submit-answer', {
                    sessionId,
                    questionId: question.id,
                    selectedAnswer
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            // Complete quiz
            const completeResponse = await axios.post('https://codehunt-backend-xo52.onrender.com/api/round1/complete', {
                sessionId,
                feedback: '',
                cheatScore: cheatScore,
                unansweredCount
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (completeResponse.data.success) {
                localStorage.setItem('quizScore', completeResponse.data.score);
                localStorage.setItem('round1Score', completeResponse.data.score);
                localStorage.setItem('cheatScore', cheatScore);
                
                // Exit fullscreen before navigating
                exitFullscreen();
                
                navigate('/results?round=1');
            }

        } catch (error) {
            console.error('Error submitting quiz:', error);
            showWarning('❌ Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ============ FORMAT TIME ============
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ============ DETERMINE OPTION LAYOUT ============
    const getOptionLayout = (options) => {
        if (!options || options.length === 0) return 'vertical';
        
        // Check if options are long (pseudocode, flowcharts, code snippets)
        const hasLongOptions = options.some(opt => 
            opt.length > 50 || 
            opt.includes('\n') || 
            opt.includes('if') || 
            opt.includes('else') ||
            opt.includes('while') ||
            opt.includes('for') ||
            opt.includes('function')
        );
        
        // Check if options are code-like
        const hasCode = options.some(opt => 
            opt.includes('{') || 
            opt.includes('}') || 
            opt.includes(';') ||
            opt.includes('=>') ||
            opt.includes('def ') ||
            opt.includes('class ')
        );
        
        if (hasLongOptions || hasCode) {
            return 'vertical-wide';
        }
        
        // For short options, check if they can fit horizontally
        const avgLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
        if (avgLength < 20 && options.length <= 4) {
            return 'horizontal';
        }
        
        return 'vertical';
    };

    // ============ RENDER OPTIONS ============
    const renderOptions = (question) => {
        const layout = getOptionLayout(question.options);
        
        if (layout === 'horizontal') {
            return (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginTop: '20px'
                }}>
                    {question.options.map((option, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleAnswer(question.id, option)}
                            style={{
                                padding: '20px',
                                border: `3px solid ${answers[question.id] === option ? '#4f46e5' : '#e5e7eb'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: answers[question.id] === option ? '#e0e7ff' : '#f9fafb',
                                textAlign: 'center',
                                fontSize: '16px',
                                fontWeight: answers[question.id] === option ? '600' : '400',
                                color: answers[question.id] === option ? '#4f46e5' : '#1f2937',
                                boxShadow: answers[question.id] === option ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                    e.currentTarget.style.background = '#f3f4f6';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.background = '#f9fafb';
                                }
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#4f46e5' }}>
                                {String.fromCharCode(65 + idx)}
                            </div>
                            {option}
                        </div>
                    ))}
                </div>
            );
        } else if (layout === 'vertical-wide') {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    marginTop: '20px'
                }}>
                    {question.options.map((option, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleAnswer(question.id, option)}
                            style={{
                                padding: '20px',
                                border: `3px solid ${answers[question.id] === option ? '#4f46e5' : '#e5e7eb'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: answers[question.id] === option ? '#e0e7ff' : '#f9fafb',
                                fontFamily: option.includes('def ') || option.includes('function') ? 'monospace' : 'inherit',
                                fontSize: option.includes('def ') || option.includes('function') ? '14px' : '16px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                boxShadow: answers[question.id] === option ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                    e.currentTarget.style.background = '#f3f4f6';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.background = '#f9fafb';
                                }
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '15px'
                            }}>
                                <div style={{
                                    width: '30px',
                                    height: '30px',
                                    background: answers[question.id] === option ? '#4f46e5' : '#e5e7eb',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: answers[question.id] === option ? 'white' : '#6b7280',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    {option.split('\n').map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            {i < option.split('\n').length - 1 && <br />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            // Default vertical layout for normal options
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '20px'
                }}>
                    {question.options.map((option, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleAnswer(question.id, option)}
                            style={{
                                padding: '15px 20px',
                                border: `2px solid ${answers[question.id] === option ? '#4f46e5' : '#e5e7eb'}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: answers[question.id] === option ? '#e0e7ff' : 'white',
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}
                            onMouseEnter={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                    e.currentTarget.style.background = '#f9fafb';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (answers[question.id] !== option) {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.background = 'white';
                                }
                            }}
                        >
                            <div style={{
                                width: '28px',
                                height: '28px',
                                background: answers[question.id] === option ? '#4f46e5' : '#f3f4f6',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: answers[question.id] === option ? 'white' : '#6b7280',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}>
                                {String.fromCharCode(65 + idx)}
                            </div>
                            {option}
                        </div>
                    ))}
                </div>
            );
        }
    };

    // ============ RENDER ============
    if (loading) {
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
                    <p style={{ fontSize: '18px', color: '#4b5563' }}>Loading your quiz...</p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            position: 'relative'
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

            {/* Main Quiz Container */}
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '30px',
                padding: '30px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.4)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div>
                        <h2 style={{ color: '#1f2937', marginBottom: '5px' }}>
                            Round 1: MCQ Quiz
                        </h2>
                        <div style={{ display: 'flex', gap: '15px', color: '#6b7280', fontSize: '14px' }}>
                            <span>📝 Question {currentIndex + 1} of {questions.length}</span>
                            <span>✅ Answered: {answeredCount}/{questions.length}</span>
                            {cheatScore > 0 && (
                                <span style={{ color: '#dc2626' }}>⚠️ Warnings: {cheatScore}</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Timer */}
                    <div style={{
                        background: timeLeft < 300 ? '#fee2e2' : '#f3f4f6',
                        padding: '15px 25px',
                        borderRadius: '15px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                            Time Remaining
                        </div>
                        <div style={{
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: timeLeft < 300 ? '#dc2626' : '#4f46e5'
                        }}>
                            ⏰ {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '30px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                {/* Question Card */}
                {currentQuestion && (
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '20px',
                        padding: '30px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            display: 'inline-block',
                            background: '#4f46e5',
                            color: 'white',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            marginBottom: '20px'
                        }}>
                            {currentQuestion.difficulty?.toUpperCase() || 'MEDIUM'}
                        </div>
                        
                        <h3 style={{
                            fontSize: '20px',
                            lineHeight: '1.6',
                            color: '#1f2937',
                            marginBottom: '20px'
                        }}>
                            {currentQuestion.question_text}
                        </h3>

                        {/* Dynamic Options Rendering */}
                        {renderOptions(currentQuestion)}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '15px'
                }}>
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        style={{
                            padding: '12px 30px',
                            background: currentIndex === 0 ? '#e5e7eb' : '#f3f4f6',
                            color: currentIndex === 0 ? '#9ca3af' : '#374151',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            if (currentIndex !== 0) {
                                e.target.style.background = '#e5e7eb';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentIndex !== 0) {
                                e.target.style.background = '#f3f4f6';
                            }
                        }}
                    >
                        ← Previous
                    </button>

                    {currentIndex === questions.length - 1 ? (
                        <button
                            onClick={handleSubmitQuiz}
                            disabled={submitting}
                            style={{
                                padding: '12px 40px',
                                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                if (!submitting) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!submitting) {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}
                        >
                            {submitting ? (
                                <>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: '3px solid white',
                                        borderTop: '3px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Submitting...
                                </>
                            ) : (
                                '📤 Submit Quiz'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            style={{
                                padding: '12px 40px',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 10px 20px rgba(79, 70, 229, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            Next →
                        </button>
                    )}
                </div>

                {/* Question Navigator */}
                <div style={{
                    marginTop: '30px',
                    paddingTop: '20px',
                    borderTop: '2px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>
                        Quick Navigation:
                    </div>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        {questions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: currentIndex === idx ? '#4f46e5' : 
                                               answers[q.id] ? '#10b981' : '#f3f4f6',
                                    color: currentIndex === idx || answers[q.id] ? 'white' : '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentIndex !== idx && !answers[q.id]) {
                                        e.target.style.background = '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentIndex !== idx && !answers[q.id]) {
                                        e.target.style.background = '#f3f4f6';
                                    }
                                }}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Stats */}
                <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#9ca3af'
                }}>
                    <span>⚠️ Cheat warnings: {cheatScore}</span>
                    <span>🔒 Fullscreen mode active</span>
                    <span>📶 Network: {networkStatus ? '✅' : '❌'}</span>
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
                
                button {
                    outline: none !important;
                }
                
                button:focus {
                    outline: none !important;
                }
            `}</style>
        </div>
    );
}

export default Round1Quiz;