import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function ResultPage() {
    const [score, setScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(20);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [round, setRound] = useState(1);
    const [teamDetails, setTeamDetails] = useState(null);
    const [detailedResults, setDetailedResults] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Get round from URL params or location state
        const params = new URLSearchParams(location.search);
        const roundParam = params.get('round') || location.state?.round || 1;
        setRound(parseInt(roundParam));

        // Get score from localStorage
        const quizScore = localStorage.getItem('quizScore');
        const round1Score = localStorage.getItem('round1Score');
        const round2Score = localStorage.getItem('round2Score');
        
        if (roundParam === '2' || roundParam === 2) {
            setScore(parseInt(round2Score) || 0);
            setTotalQuestions(30);
            fetchRound2Results();
        } else {
            setScore(parseInt(quizScore) || parseInt(round1Score) || 0);
            setTotalQuestions(20);
        }

        // Get team details
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setTeamDetails(JSON.parse(userStr));
        }
    }, [location]);

    const fetchRound2Results = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/round2/results', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.success) {
                setDetailedResults(response.data.results);
                setScore(response.data.totalScore || 0);
            }
        } catch (error) {
            console.error('Error fetching round2 results:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const sessionId = localStorage.getItem('sessionId');
            
            await axios.post('http://localhost:3001/api/feedback/submit', {
                round: round,
                feedback: feedback,
                sessionId: sessionId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setSubmitted(true);
            
            // Clear session data
            if (round === 1) {
                localStorage.removeItem('sessionId');
                localStorage.removeItem('quizScore');
            } else {
                localStorage.removeItem('round2Session');
                localStorage.removeItem('round2Score');
            }
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    const handleViewLeaderboard = () => {
        navigate('/leaderboard');
    };

    const handleShareResults = () => {
        const text = `I scored ${score}/${totalQuestions} in Code Hunt Round ${round}! 🎯`;
        if (navigator.share) {
            navigator.share({
                title: 'Code Hunt Results',
                text: text,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(text);
            alert('Results copied to clipboard!');
        }
    };

    // Calculate percentage
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Determine grade based on percentage
    const getGrade = () => {
        if (percentage >= 90) return { text: 'Excellent! 🏆', color: '#10b981' };
        if (percentage >= 75) return { text: 'Great Job! 🌟', color: '#3b82f6' };
        if (percentage >= 60) return { text: 'Good Work! 👍', color: '#f59e0b' };
        if (percentage >= 40) return { text: 'Keep Practicing! 📚', color: '#f97316' };
        return { text: 'Better Luck Next Time! 💪', color: '#ef4444' };
    };

    const grade = getGrade();

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
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    textAlign: 'center'
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
                    <p style={{ color: '#4b5563' }}>Loading your results...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                maxWidth: '800px',
                width: '100%',
                background: 'white',
                borderRadius: '30px',
                padding: '40px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
                animation: 'slideUp 0.5s ease'
            }}>
                
                {/* Header with Trophy */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
                    }}>
                        <span style={{ fontSize: '50px' }}>🏆</span>
                    </div>
                    
                    <h1 style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        {round === 1 ? 'Round 1 Completed! 🎉' : 'Round 2 Completed! 🎉'}
                    </h1>
                    
                    <p style={{ fontSize: '18px', color: '#6b7280' }}>
                        {round === 1 
                            ? 'You have successfully completed the MCQ quiz' 
                            : 'You have successfully completed the coding challenge'}
                    </p>
                </div>

                {/* Team Info */}
                {teamDetails && (
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '15px',
                        padding: '15px 20px',
                        marginBottom: '30px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px'
                    }}>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>Team</span>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                {teamDetails.teamName || teamDetails.teamCode}
                            </div>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>Team Code</span>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>{teamDetails.teamCode}</div>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>Round</span>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>{round}</div>
                        </div>
                    </div>
                )}

                {/* Score Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '30px',
                    textAlign: 'center',
                    color: 'white',
                    boxShadow: '0 15px 30px rgba(79, 70, 229, 0.3)'
                }}>
                    <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '10px' }}>
                        Your Score
                    </div>
                    <div style={{
                        fontSize: '72px',
                        fontWeight: '800',
                        lineHeight: '1',
                        marginBottom: '10px'
                    }}>
                        {score}<span style={{ fontSize: '36px', opacity: 0.8 }}>/{totalQuestions}</span>
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '15px'
                    }}>
                        {percentage}%
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '30px',
                        padding: '10px 20px',
                        display: 'inline-block'
                    }}>
                        {grade.text}
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        color: '#6b7280',
                        fontSize: '14px'
                    }}>
                        <span>Performance</span>
                        <span>{percentage}%</span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: '#e5e7eb',
                        borderRadius: '10px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                            borderRadius: '10px',
                            transition: 'width 1s ease'
                        }}></div>
                    </div>
                </div>

                {/* Round 2 Detailed Results */}
                {round === 2 && detailedResults && (
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '15px',
                        padding: '25px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            color: '#1f2937',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>📊</span>
                            Detailed Problem Results
                        </h3>

                        {/* Easy */}
                        {detailedResults.easy && (
                            <div style={{
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '15px',
                                background: 'white'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <span style={{
                                            background: '#10b981',
                                            color: 'white',
                                            padding: '3px 10px',
                                            borderRadius: '15px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            marginRight: '10px'
                                        }}>
                                            EASY
                                        </span>
                                        <span style={{ fontWeight: '600' }}>{detailedResults.easy.title}</span>
                                    </div>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: detailedResults.easy.score === 5 ? '#10b981' : '#f59e0b'
                                    }}>
                                        {detailedResults.easy.score}/5
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    display: 'flex',
                                    gap: '15px'
                                }}>
                                    <span>✅ Passed: {detailedResults.easy.passedTests}/{detailedResults.easy.totalTests} tests</span>
                                    <span>⏱️ {detailedResults.easy.time} ms</span>
                                </div>
                            </div>
                        )}

                        {/* Medium */}
                        {detailedResults.medium && (
                            <div style={{
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '15px',
                                background: 'white'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <span style={{
                                            background: '#f59e0b',
                                            color: 'white',
                                            padding: '3px 10px',
                                            borderRadius: '15px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            marginRight: '10px'
                                        }}>
                                            MEDIUM
                                        </span>
                                        <span style={{ fontWeight: '600' }}>{detailedResults.medium.title}</span>
                                    </div>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: detailedResults.medium.score === 10 ? '#10b981' : '#f59e0b'
                                    }}>
                                        {detailedResults.medium.score}/10
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    display: 'flex',
                                    gap: '15px'
                                }}>
                                    <span>✅ Passed: {detailedResults.medium.passedTests}/{detailedResults.medium.totalTests} tests</span>
                                    <span>⏱️ {detailedResults.medium.time} ms</span>
                                </div>
                            </div>
                        )}

                        {/* Hard */}
                        {detailedResults.hard && (
                            <div style={{
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                padding: '15px',
                                background: 'white'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <span style={{
                                            background: '#ef4444',
                                            color: 'white',
                                            padding: '3px 10px',
                                            borderRadius: '15px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            marginRight: '10px'
                                        }}>
                                            HARD
                                        </span>
                                        <span style={{ fontWeight: '600' }}>{detailedResults.hard.title}</span>
                                    </div>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: detailedResults.hard.score === 15 ? '#10b981' : '#f59e0b'
                                    }}>
                                        {detailedResults.hard.score}/15
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    display: 'flex',
                                    gap: '15px'
                                }}>
                                    <span>✅ Passed: {detailedResults.hard.passedTests}/{detailedResults.hard.totalTests} tests</span>
                                    <span>⏱️ {detailedResults.hard.time} ms</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Feedback Form */}
                {!submitted ? (
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '15px',
                        padding: '25px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{
                            color: '#1f2937',
                            marginBottom: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>💬</span>
                            We'd Love Your Feedback!
                        </h3>
                        
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Tell us about your experience... (optional)"
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                fontSize: '16px',
                                minHeight: '100px',
                                marginBottom: '20px',
                                outline: 'none',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />

                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '14px 24px',
                                    background: loading ? '#9ca3af' : '#4f46e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                {loading ? 'Submitting...' : '📝 Submit Feedback'}
                            </button>

                            <button
                                onClick={handleShareResults}
                                style={{
                                    padding: '14px 24px',
                                    background: '#e5e7eb',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                📤 Share
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: '#d1fae5',
                        border: '2px solid #10b981',
                        borderRadius: '15px',
                        padding: '25px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        animation: 'pulse 2s infinite'
                    }}>
                        <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🙏</span>
                        <h3 style={{ color: '#065f46', marginBottom: '10px' }}>Thank You!</h3>
                        <p style={{ color: '#047857' }}>Your feedback has been submitted successfully.</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={handleBackToDashboard}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            background: '#e5e7eb',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
                        onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
                    >
                        <span>🏠</span>
                        Dashboard
                    </button>

                    <button
                        onClick={handleViewLeaderboard}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 10px 20px rgba(245, 158, 11, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        <span>🏆</span>
                        Leaderboard
                    </button>

                    {round === 1 && (
                        <button
                            onClick={() => navigate('/round2')}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <span>🚀</span>
                            Proceed to Round 2
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '30px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px'
                }}>
                    <p>Code Hunt • National Level Symposium</p>
                </div>
            </div>

            {/* Global Styles */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                
                textarea {
                    resize: vertical;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}

export default ResultPage;