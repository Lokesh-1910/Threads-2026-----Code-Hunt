import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [teamDetails, setTeamDetails] = useState(null);
    const [round1Password, setRound1Password] = useState('');
    const [round2Password, setRound2Password] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [round1Status, setRound1Status] = useState('locked');
    const [round2Status, setRound2Status] = useState('locked');
    const [round1Score, setRound1Score] = useState(null);
    const [round2Score, setRound2Score] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const userData = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            const justRegistered = sessionStorage.getItem('registrationJustCompleted');

            console.log('🔍 Dashboard loaded - User:', userData);
            console.log('🔍 Just registered:', justRegistered);

            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                // Fetch team details including round status
                if (token) {
                    try {
                        // Add cache-busting parameter
                        const response = await axios.get('http://localhost:3001/api/team/details?_=' + Date.now(), {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        console.log('📥 Team details response:', response.data);

                        if (response.data.success) {
                            const teamData = response.data.team;
                            setTeamDetails(teamData);

                            // CRITICAL: Check if team has members registered
                            const membersResponse = await axios.get('http://localhost:3001/api/team/members', {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            console.log('📥 Members response:', membersResponse.data);

                            const hasMembers = membersResponse.data.hasMembers || false;

                            // Set round status based on team data
                            if (teamData.round1_completed) {
                                setRound1Status('completed');
                                setRound1Score(teamData.round1_score);
                                console.log('✅ Round 1 completed with score:', teamData.round1_score);
                            }
                            else if (hasMembers || justRegistered === 'true') {
                                // If registered, Round 1 is available
                                setRound1Status('available');
                                console.log('✅ Round 1 is AVAILABLE - Team has members or just registered');

                                // Clear the flag
                                if (justRegistered === 'true') {
                                    sessionStorage.removeItem('registrationJustCompleted');
                                }
                            }
                            else {
                                setRound1Status('locked');
                                console.log('🔒 Round 1 is LOCKED - No team members');
                            }

                            // Set Round 2 status
                            if (teamData.round2_completed) {
                                setRound2Status('completed');
                                setRound2Score(teamData.round2_score);
                            } else if (teamData.round1_completed) {
                                setRound2Status('available');
                            } else {
                                setRound2Status('locked');
                            }
                        }
                    } catch (err) {
                        console.error('❌ Error fetching team details:', err);
                        console.error('Error response:', err.response?.data);
                    }
                }
            } else {
                navigate('/login');
            }
        };

        fetchUserData();
    }, [navigate]);

    // Add this new function to check team members
    const checkTeamMembers = async (token) => {
        try {
            const response = await axios.get('http://localhost:3001/api/team/members', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data.hasMembers || false;
        } catch (error) {
            console.error('Error checking team members:', error);
            return false;
        }
    };

    const handleStartRound1 = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            const response = await axios.post('http://localhost:3001/api/round1/start', {
                roundPassword: round1Password
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                localStorage.setItem('sessionId', response.data.sessionId);
                setSuccess('✅ Round 1 started! Redirecting...');
                setTimeout(() => {
                    navigate('/round1');
                }, 1500);
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Invalid round password');
        } finally {
            setLoading(false);
        }
    };

    const handleStartRound2 = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            const response = await axios.post('http://localhost:3001/api/round2/start', {
                roundPassword: round2Password
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setSuccess('✅ Round 2 started! Redirecting to coding platform...');
                setTimeout(() => {
                    navigate('/round2');
                }, 1500);
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Invalid round password');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    if (!user) return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '20px',
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
                <p style={{ color: '#4b5563' }}>Loading your dashboard...</p>
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '30px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '10px'
                        }}>
                            Welcome, {user.teamName || 'Team'}! 👋
                        </h1>
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '8px 15px',
                                borderRadius: '20px',
                                fontSize: '14px'
                            }}>
                                <strong>Team Code:</strong> {user.teamCode}
                            </div>
                            {teamDetails?.college_name && (
                                <div style={{
                                    background: '#f3f4f6',
                                    padding: '8px 15px',
                                    borderRadius: '20px',
                                    fontSize: '14px'
                                }}>
                                    <strong>College:</strong> {teamDetails.college_name}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '12px 24px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#dc2626';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = '#ef4444';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <span>🚪</span>
                        Logout
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{
                        background: '#fee2e2',
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        padding: '15px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <span style={{ color: '#dc2626', fontWeight: '500' }}>{error}</span>
                    </div>
                )}

                {success && (
                    <div style={{
                        background: '#d1fae5',
                        border: '2px solid #10b981',
                        borderRadius: '10px',
                        padding: '15px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        <span style={{ fontSize: '20px' }}>✅</span>
                        <span style={{ color: '#059669', fontWeight: '500' }}>{success}</span>
                    </div>
                )}

                {/* Rounds Container */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '30px'
                }}>

                    {/* ROUND 1 CARD */}
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease',
                        border: round1Status === 'completed' ? '3px solid #10b981' : 'none',
                        opacity: round1Status === 'locked' ? 0.7 : 1,
                        position: 'relative'
                    }}
                        onMouseEnter={(e) => {
                            if (round1Status !== 'locked') {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>

                        {/* Status Badge */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: round1Status === 'completed' ? '#10b981' :
                                round1Status === 'available' ? '#f59e0b' : '#6b7280',
                            color: 'white'
                        }}>
                            {round1Status === 'completed' ? 'COMPLETED' :
                                round1Status === 'available' ? 'AVAILABLE' : 'LOCKED'}
                        </div>

                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <div style={{
                                width: '70px',
                                height: '70px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 15px'
                            }}>
                                <span style={{ fontSize: '30px' }}>📝</span>
                            </div>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#1f2937',
                                marginBottom: '10px'
                            }}>
                                Round 1: MCQ Quiz
                            </h2>
                        </div>

                        {/* Details */}
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '10px',
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280' }}>Duration:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>30 minutes</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280' }}>Questions:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>20 MCQs</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280' }}>Topics:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>Programming, Debugging</span>
                            </div>
                        </div>

                        {/* Score Display (if completed) */}
                        {round1Status === 'completed' && round1Score !== null && (
                            <div style={{
                                background: '#d1fae5',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '5px' }}>
                                    Your Score
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>
                                    {round1Score}/20
                                </div>
                            </div>
                        )}

                        {/* Start Form */}
                        {round1Status !== 'completed' ? (
                            <form onSubmit={handleStartRound1}>
                                {round1Status === 'available' && (
                                    <div style={{ marginBottom: '15px' }}>
                                        <input
                                            type="password"
                                            value={round1Password}
                                            onChange={(e) => setRound1Password(e.target.value)}
                                            placeholder="Enter Round 1 Password"
                                            required
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '10px',
                                                fontSize: '16px',
                                                outline: 'none',
                                                transition: 'border-color 0.3s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || round1Status === 'locked'}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: round1Status === 'locked' ? '#9ca3af' :
                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: round1Status === 'locked' ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {loading ? 'Verifying...' :
                                        round1Status === 'locked' ? '🔒 Complete Registration First' :
                                            '🚀 Start Round 1'}
                                </button>
                            </form>
                        ) : (
                            <div style={{
                                background: '#f3f4f6',
                                borderRadius: '10px',
                                padding: '15px',
                                textAlign: 'center',
                                color: '#4b5563'
                            }}>
                                ✅ You have completed Round 1
                            </div>
                        )}
                    </div>

                    {/* ROUND 2 CARD */}
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease',
                        border: round2Status === 'completed' ? '3px solid #10b981' : 'none',
                        opacity: round2Status === 'locked' ? 0.7 : 1,
                        position: 'relative'
                    }}
                        onMouseEnter={(e) => {
                            if (round2Status !== 'locked') {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>

                        {/* Status Badge */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: round2Status === 'completed' ? '#10b981' :
                                round2Status === 'available' ? '#f59e0b' : '#6b7280',
                            color: 'white'
                        }}>
                            {round2Status === 'completed' ? 'COMPLETED' :
                                round2Status === 'available' ? 'AVAILABLE' : 'LOCKED'}
                        </div>

                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <div style={{
                                width: '70px',
                                height: '70px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 15px'
                            }}>
                                <span style={{ fontSize: '30px' }}>💻</span>
                            </div>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#1f2937',
                                marginBottom: '10px'
                            }}>
                                Round 2: Coding Challenge
                            </h2>
                        </div>

                        {/* Details */}
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '10px',
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280' }}>Duration:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>90 minutes</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280' }}>Problems:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>3 (Easy, Medium, Hard)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280' }}>Points:</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>5 + 10 + 15 = 30</span>
                            </div>
                        </div>

                        {/* Score Display (if completed) */}
                        {round2Status === 'completed' && round2Score !== null && (
                            <div style={{
                                background: '#d1fae5',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '5px' }}>
                                    Your Total Score
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>
                                    {round2Score}/30
                                </div>
                            </div>
                        )}

                        {/* Start Form */}
                        {round2Status !== 'completed' ? (
                            <form onSubmit={handleStartRound2}>
                                {round2Status === 'available' ? (
                                    <>
                                        <div style={{ marginBottom: '15px' }}>
                                            <input
                                                type="password"
                                                value={round2Password}
                                                onChange={(e) => setRound2Password(e.target.value)}
                                                placeholder="Enter Round 2 Password"
                                                required
                                                disabled={loading}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: '10px',
                                                    fontSize: '16px',
                                                    outline: 'none',
                                                    transition: 'border-color 0.3s'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {loading ? 'Verifying...' : '🚀 Start Round 2'}
                                        </button>
                                    </>
                                ) : (
                                    <div style={{
                                        background: '#f3f4f6',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>🔒</span>
                                        <p style={{ color: '#4b5563', marginBottom: '10px' }}>
                                            Complete Round 1 to unlock Round 2
                                        </p>
                                        {round1Status === 'completed' ? (
                                            <p style={{ fontSize: '14px', color: '#f59e0b' }}>
                                                Round 2 should be available. Please refresh the page.
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                                You need to complete Round 1 first
                                            </p>
                                        )}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div style={{
                                background: '#f3f4f6',
                                borderRadius: '10px',
                                padding: '15px',
                                textAlign: 'center',
                                color: '#4b5563'
                            }}>
                                ✅ Congratulations! You have completed Round 2
                            </div>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '25px',
                    marginTop: '30px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <h3 style={{
                        color: '#1f2937',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '24px' }}>📋</span>
                        Important Instructions
                    </h3>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '15px'
                    }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Do not switch tabs during the quiz (penalty applied)
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Copy-paste is disabled in quiz mode
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Full screen mode is enforced for Round 1
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Round 2 includes hidden test cases
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Save your code frequently in Round 2
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#4f46e5' }}>•</span>
                            Results are auto-evaluated
                        </li>
                    </ul>
                </div>
            </div>

            {/* Global Styles */}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                input:focus {
                    outline: none;
                }
                
                button {
                    cursor: pointer;
                }
                
                button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

export default Dashboard;