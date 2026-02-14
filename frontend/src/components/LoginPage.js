import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage() {
    const [teamCode, setTeamCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Check if admin login
            if (teamCode === 'ADMIN001') {
                const response = await axios.post('http://localhost:3001/api/admin/login', {
                    teamCode,
                    password
                });
                
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
                navigate('/admin');
                return;
            }

            // Regular team login
            const response = await axios.post('http://localhost:3001/api/auth/login', {
                teamCode,
                password
            });

            if (response.data.success) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));

                if (response.data.needsRegistration) {
                    navigate('/register');
                } else {
                    navigate('/dashboard');
                }
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Make sure backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '100%',
                maxWidth: '450px',
                animation: 'slideIn 0.5s ease'
            }}>
                {/* Header with Icon */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
                    }}>
                        <span style={{ fontSize: '40px' }}>🔐</span>
                    </div>
                    <h1 style={{
                        color: '#1f2937',
                        fontSize: '28px',
                        fontWeight: '700',
                        marginBottom: '10px'
                    }}>
                        Code Hunt
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        fontSize: '14px'
                    }}>
                        Enter your credentials to access the event
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: '#fee2e2',
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        padding: '15px',
                        marginBottom: '25px',
                        textAlign: 'center',
                        animation: 'shake 0.3s ease'
                    }}>
                        <span style={{ color: '#dc2626', fontWeight: '500' }}>⚠️ {error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    {/* Team Code Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#374151',
                            fontSize: '14px'
                        }}>
                            Team Code
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af',
                                fontSize: '18px'
                            }}>
                                👥
                            </span>
                            <input
                                type="text"
                                value={teamCode}
                                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                                placeholder="Enter your team code"
                                required
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '14px 14px 14px 45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    transition: 'all 0.3s ease',
                                    outline: 'none',
                                    backgroundColor: isLoading ? '#f3f4f6' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>
                        <small style={{
                            display: 'block',
                            marginTop: '5px',
                            color: '#9ca3af',
                            fontSize: '12px'
                        }}>
                            Admin use: ADMIN001
                        </small>
                    </div>

                    {/* Password Input */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#374151',
                            fontSize: '14px'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af',
                                fontSize: '18px'
                            }}>
                                🔑
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '14px 14px 14px 45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    transition: 'all 0.3s ease',
                                    outline: 'none',
                                    backgroundColor: isLoading ? '#f3f4f6' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 15px 30px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.3)';
                            }
                        }}
                    >
                        {isLoading ? (
                            <>
                                <span style={{
                                    display: 'inline-block',
                                    width: '20px',
                                    height: '20px',
                                    border: '3px solid white',
                                    borderTop: '3px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></span>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                Login to Code Hunt
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: '30px',
                    textAlign: 'center',
                    borderTop: '2px solid #f3f4f6',
                    paddingTop: '20px'
                }}>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '10px' }}>
                        New to Code Hunt?
                    </p>
                    <div style={{
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#4b5563'
                    }}>
                        <strong>📢 Event Details:</strong><br />
                        • Round 1: 20 MCQs (30 minutes)<br />
                        • Round 2: 3 Coding Challenges<br />
                        • Contact organizers for credentials
                    </div>
                </div>
            </div>

            {/* Add animation styles */}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default LoginPage;