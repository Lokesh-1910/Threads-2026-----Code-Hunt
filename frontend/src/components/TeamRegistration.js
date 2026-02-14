import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function TeamRegistration() {
    const [teamName, setTeamName] = useState('');
    const [members, setMembers] = useState([
        {
            name: '',
            college: '',
            phone: '',
            email: '',
            isLeader: true,
            isComplete: false
        },
        {
            name: '',
            college: '',
            phone: '',
            email: '',
            isLeader: false,
            isComplete: false
        }
    ]);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            navigate('/login');
            return;
        }

        // Check if already registered
        const userData = JSON.parse(user);
        if (userData.needsRegistration === false) {
            navigate('/dashboard');
        }
    }, [navigate]);

    // Add third member
    const addMember = () => {
        if (members.length < 3) {
            setMembers([
                ...members,
                {
                    name: '',
                    college: '',
                    phone: '',
                    email: '',
                    isLeader: false,
                    isComplete: false
                }
            ]);
        }
    };

    // Remove third member
    const removeMember = (index) => {
        if (members.length > 2 && index >= 2) {
            const newMembers = members.filter((_, i) => i !== index);
            setMembers(newMembers);
        }
    };

    // Update member field
    const updateMember = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = value;

        // Check if this member is complete
        const member = newMembers[index];
        newMembers[index].isComplete =
            member.name.trim() !== '' &&
            member.college.trim() !== '' &&
            member.phone.trim() !== '' &&
            member.email.trim() !== '';

        setMembers(newMembers);
    };

    // Validate form
    const validateForm = () => {
        // Check team name
        if (!teamName.trim()) {
            setError('Team name is required');
            return false;
        }

        // Check minimum 2 members
        if (members.length < 2) {
            setError('Minimum 2 members required');
            return false;
        }

        // Check all required fields for first two members
        for (let i = 0; i < Math.min(2, members.length); i++) {
            const member = members[i];
            if (!member.name.trim()) {
                setError(`Member ${i + 1} name is required`);
                return false;
            }
            if (!member.college.trim()) {
                setError(`Member ${i + 1} college is required`);
                return false;
            }
            if (!member.phone.trim()) {
                setError(`Member ${i + 1} phone number is required`);
                return false;
            }
            if (!member.email.trim()) {
                setError(`Member ${i + 1} email is required`);
                return false;
            }
            if (!member.email.includes('@') || !member.email.includes('.')) {
                setError(`Member ${i + 1} email is invalid`);
                return false;
            }
            if (member.phone.length < 10) {
                setError(`Member ${i + 1} phone number must be at least 10 digits`);
                return false;
            }
        }

        // Check third member if exists
        if (members.length === 3) {
            const member3 = members[2];
            if (member3.name.trim() || member3.college.trim() || member3.phone.trim() || member3.email.trim()) {
                // If any field is filled, all must be filled
                if (!member3.name.trim() || !member3.college.trim() || !member3.phone.trim() || !member3.email.trim()) {
                    setError('Please complete all fields for member 3 or remove them');
                    return false;
                }
                if (!member3.email.includes('@') || !member3.email.includes('.')) {
                    setError('Member 3 email is invalid');
                    return false;
                }
                if (member3.phone.length < 10) {
                    setError('Member 3 phone number must be at least 10 digits');
                    return false;
                }
            }
        }

        return true;
    };

    // Handle form submission
    // In TeamRegistration.js - REPLACE the handleSubmit function
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = JSON.parse(userStr || '{}');

            // Filter out empty third member
            const validMembers = members.filter((member, index) => {
                if (index >= 2) {
                    return member.name.trim() !== '' ||
                        member.college.trim() !== '' ||
                        member.phone.trim() !== '' ||
                        member.email.trim() !== '';
                }
                return true;
            });

            // Mark first member as leader
            validMembers[0].isLeader = true;
            for (let i = 1; i < validMembers.length; i++) {
                validMembers[i].isLeader = false;
            }

            console.log('📤 Submitting registration:', {
                teamName,
                members: validMembers
            });

            const response = await axios.post('http://localhost:3001/api/teams/register', {
                teamName,
                members: validMembers
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📥 Registration response:', response.data);

            if (response.data.success) {
                setSuccess('✅ Team registration completed successfully!');
                setRegistrationComplete(true);

                // IMPORTANT: Update user in localStorage
                user.teamName = teamName;
                user.needsRegistration = false;
                user.registrationComplete = true;  // Add this flag
                localStorage.setItem('user', JSON.stringify(user));

                // Also store a flag in sessionStorage for immediate update
                sessionStorage.setItem('registrationJustCompleted', 'true');

                // Redirect after 2 seconds
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }

        } catch (err) {
            console.error('❌ Registration error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                    }}>
                        <span style={{ fontSize: '40px' }}>👥</span>
                    </div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        Team Registration
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '16px' }}>
                        Complete your team details to start the Code Hunt
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{
                        background: '#fee2e2',
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        padding: '15px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'shake 0.3s ease'
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
                        padding: '15px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'pulse 2s infinite'
                    }}>
                        <span style={{ fontSize: '20px' }}>✅</span>
                        <span style={{ color: '#059669', fontWeight: '500' }}>{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Team Name */}
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '15px',
                        padding: '25px',
                        marginBottom: '25px'
                    }}>
                        <h3 style={{
                            color: '#1f2937',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>🏆</span>
                            Team Information
                        </h3>

                        <div className="input-group">
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Team Name <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="Enter your team name (e.g., Code Warriors)"
                                required
                                disabled={loading || registrationComplete}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    transition: 'all 0.3s ease',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>
                    </div>

                    {/* Team Members */}
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '15px',
                        padding: '25px',
                        marginBottom: '25px'
                    }}>
                        <h3 style={{
                            color: '#1f2937',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>👤</span>
                            Team Members
                        </h3>

                        {/* Member 1 - Leader */}
                        <div style={{
                            border: '2px solid #4f46e5',
                            borderRadius: '15px',
                            padding: '25px',
                            marginBottom: '25px',
                            background: '#e0e7ff',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-12px',
                                left: '20px',
                                background: '#4f46e5',
                                color: 'white',
                                padding: '4px 15px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 5px rgba(79, 70, 229, 0.3)'
                            }}>
                                👑 TEAM LEADER (MEMBER 1)
                            </div>

                            <div style={{ marginTop: '15px' }}>
                                <div className="input-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: '600', color: '#374151' }}>
                                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={members[0].name}
                                        onChange={(e) => updateMember(0, 'name', e.target.value)}
                                        placeholder="Enter leader's full name"
                                        required
                                        disabled={loading || registrationComplete}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                <div className="input-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: '600', color: '#374151' }}>
                                        College/Institution <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={members[0].college}
                                        onChange={(e) => updateMember(0, 'college', e.target.value)}
                                        placeholder="Enter college name"
                                        required
                                        disabled={loading || registrationComplete}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="input-group">
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            Contact Number <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={members[0].phone}
                                            onChange={(e) => updateMember(0, 'phone', e.target.value)}
                                            placeholder="10-digit mobile number"
                                            required
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            Email ID <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={members[0].email}
                                            onChange={(e) => updateMember(0, 'email', e.target.value)}
                                            placeholder="leader@example.com"
                                            required
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Member 2 */}
                        <div style={{
                            border: '2px solid #10b981',
                            borderRadius: '15px',
                            padding: '25px',
                            marginBottom: '25px',
                            background: '#d1fae5',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-12px',
                                left: '20px',
                                background: '#10b981',
                                color: 'white',
                                padding: '4px 15px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 5px rgba(16, 185, 129, 0.3)'
                            }}>
                                👤 MEMBER 2
                            </div>

                            <div style={{ marginTop: '15px' }}>
                                <div className="input-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: '600', color: '#374151' }}>
                                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={members[1]?.name || ''}
                                        onChange={(e) => updateMember(1, 'name', e.target.value)}
                                        placeholder="Enter member's full name"
                                        required
                                        disabled={loading || registrationComplete}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                <div className="input-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: '600', color: '#374151' }}>
                                        College/Institution <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={members[1]?.college || ''}
                                        onChange={(e) => updateMember(1, 'college', e.target.value)}
                                        placeholder="Enter college name"
                                        required
                                        disabled={loading || registrationComplete}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="input-group">
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            Contact Number <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={members[1]?.phone || ''}
                                            onChange={(e) => updateMember(1, 'phone', e.target.value)}
                                            placeholder="10-digit mobile number"
                                            required
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            Email ID <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={members[1]?.email || ''}
                                            onChange={(e) => updateMember(1, 'email', e.target.value)}
                                            placeholder="member2@example.com"
                                            required
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Member 3 (Optional) */}
                        {members.length === 3 && (
                            <div style={{
                                border: '2px solid #f59e0b',
                                borderRadius: '15px',
                                padding: '25px',
                                marginBottom: '25px',
                                background: '#fef3c7',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '20px',
                                    background: '#f59e0b',
                                    color: 'white',
                                    padding: '4px 15px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 5px rgba(245, 158, 11, 0.3)'
                                }}>
                                    👤 MEMBER 3 (Optional)
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeMember(2)}
                                    style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '20px',
                                        padding: '5px 15px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    ✕ Remove Member
                                </button>

                                <div style={{ marginTop: '15px' }}>
                                    <div className="input-group" style={{ marginBottom: '15px' }}>
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={members[2].name}
                                            onChange={(e) => updateMember(2, 'name', e.target.value)}
                                            placeholder="Enter member's full name"
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>

                                    <div className="input-group" style={{ marginBottom: '15px' }}>
                                        <label style={{ fontWeight: '600', color: '#374151' }}>
                                            College/Institution
                                        </label>
                                        <input
                                            type="text"
                                            value={members[2].college}
                                            onChange={(e) => updateMember(2, 'college', e.target.value)}
                                            placeholder="Enter college name"
                                            disabled={loading || registrationComplete}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '15px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="input-group">
                                            <label style={{ fontWeight: '600', color: '#374151' }}>
                                                Contact Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={members[2].phone}
                                                onChange={(e) => updateMember(2, 'phone', e.target.value)}
                                                placeholder="10-digit mobile number"
                                                disabled={loading || registrationComplete}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    fontSize: '15px'
                                                }}
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label style={{ fontWeight: '600', color: '#374151' }}>
                                                Email ID
                                            </label>
                                            <input
                                                type="email"
                                                value={members[2].email}
                                                onChange={(e) => updateMember(2, 'email', e.target.value)}
                                                placeholder="member3@example.com"
                                                disabled={loading || registrationComplete}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    fontSize: '15px'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Member Button */}
                        {members.length < 3 && (
                            <button
                                type="button"
                                onClick={addMember}
                                disabled={loading || registrationComplete}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    background: '#e5e7eb',
                                    border: '2px dashed #9ca3af',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#4b5563',
                                    cursor: loading || registrationComplete ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading && !registrationComplete) {
                                        e.target.style.background = '#d1d5db';
                                        e.target.style.borderColor = '#6b7280';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading && !registrationComplete) {
                                        e.target.style.background = '#e5e7eb';
                                        e.target.style.borderColor = '#9ca3af';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>➕</span>
                                Add 3rd Member (Optional)
                            </button>
                        )}
                    </div>

                    {/* Summary */}
                    <div style={{
                        background: '#f3f4f6',
                        borderRadius: '10px',
                        padding: '15px',
                        marginBottom: '25px',
                        fontSize: '14px',
                        color: '#4b5563'
                    }}>
                        <strong>📊 Team Summary:</strong>
                        <ul style={{ marginTop: '10px', listStyle: 'none', padding: 0 }}>
                            <li>• Team Name: <strong>{teamName || 'Not set'}</strong></li>
                            <li>• Total Members: <strong>{members.length}</strong></li>
                            <li>• Leader: <strong>{members[0]?.name || 'Not set'}</strong></li>
                            <li>• Member 2: <strong>{members[1]?.name || 'Not set'}</strong></li>
                            {members.length === 3 && (
                                <li>• Member 3: <strong>{members[2]?.name || 'Not set'}</strong></li>
                            )}
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || registrationComplete}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: loading || registrationComplete ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '18px',
                            fontWeight: '600',
                            cursor: loading || registrationComplete ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && !registrationComplete) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading && !registrationComplete) {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    border: '3px solid white',
                                    borderTop: '3px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                Registering Team...
                            </>
                        ) : registrationComplete ? (
                            '✅ Registration Complete! Redirecting...'
                        ) : (
                            '✅ Complete Registration'
                        )}
                    </button>

                    {/* Footer */}
                    <div style={{
                        marginTop: '20px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontSize: '13px'
                    }}>
                        <p>Minimum 2 members required. Maximum 3 members allowed.</p>
                        <p>First member will be designated as Team Leader.</p>
                    </div>
                </form>
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
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                
                input:focus {
                    outline: none;
                }
            `}</style>
        </div>
    );
}

export default TeamRegistration;