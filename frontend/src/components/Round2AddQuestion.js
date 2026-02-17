// Round2AddQuestion.js
import React, { useState } from 'react';
import axios from 'axios';

const Round2AddQuestion = ({ onQuestionAdded }) => {
    const [formData, setFormData] = useState({
        title: '',
        difficulty: 'easy',
        problem_statement: '',
        sample_input: '',
        sample_output: '',
        points: 5,
        time_limit: 30,
        test_cases: [
            { input: '', output: '', isHidden: false }
        ]
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Auto-set points based on difficulty
        if (name === 'difficulty') {
            const pointsMap = {
                'easy': 5,
                'medium': 10,
                'hard': 15
            };
            setFormData(prev => ({
                ...prev,
                difficulty: value,
                points: pointsMap[value] || 5
            }));
        }
    };

    // Handle test case changes
    const handleTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.test_cases];
        newTestCases[index][field] = value;
        setFormData({ ...formData, test_cases: newTestCases });
    };

    // Add new test case
    const addTestCase = () => {
        setFormData({
            ...formData,
            test_cases: [
                ...formData.test_cases,
                { input: '', output: '', isHidden: true }
            ]
        });
    };

    // Remove test case
    const removeTestCase = (index) => {
        if (formData.test_cases.length > 1) {
            const newTestCases = formData.test_cases.filter((_, i) => i !== index);
            setFormData({ ...formData, test_cases: newTestCases });
        }
    };

    // Toggle hidden status
    const toggleHidden = (index) => {
        const newTestCases = [...formData.test_cases];
        newTestCases[index].isHidden = !newTestCases[index].isHidden;
        setFormData({ ...formData, test_cases: newTestCases });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validation
        if (!formData.title.trim()) {
            setError('Question title is required');
            setLoading(false);
            return;
        }

        if (!formData.problem_statement.trim()) {
            setError('Problem statement is required');
            setLoading(false);
            return;
        }

        // Validate test cases
        for (let i = 0; i < formData.test_cases.length; i++) {
            const tc = formData.test_cases[i];
            if (!tc.input.trim() || !tc.output.trim()) {
                setError(`Test case ${i + 1} is incomplete. Both input and output are required.`);
                setLoading(false);
                return;
            }
        }

        try {
            const token = localStorage.getItem('token');

            // Prepare data for API
            const questionData = {
                title: formData.title,
                difficulty: formData.difficulty === 'easy' ? 'Easy' :
                            formData.difficulty === 'medium' ? 'Medium' : 'Hard',
                problem_statement: formData.problem_statement,
                description: formData.problem_statement,
                sample_input: formData.sample_input,
                sample_output: formData.sample_output,
                points: formData.points,
                time_limit: formData.time_limit,
                test_cases: formData.test_cases.map(tc => ({
                    input: tc.input,
                    output: tc.output,
                    isHidden: tc.isHidden
                }))
            };

            console.log('📤 Submitting question:', questionData);

            const response = await axios.post(
                'https://codehunt-backend-xo52.onrender.com/api/admin/round2/questions',
                questionData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                const sampleCount = formData.test_cases.filter(tc => !tc.isHidden).length;
                const hiddenCount = formData.test_cases.filter(tc => tc.isHidden).length;

                setSuccess(`✅ Question added successfully!\n\n📊 Statistics:\n• Question ID: ${response.data.questionId}\n• Difficulty: ${formData.difficulty.toUpperCase()}\n• Points: ${formData.points}\n• Sample Tests: ${sampleCount}\n• Hidden Tests: ${hiddenCount}`);

                // Reset form
                setFormData({
                    title: '',
                    difficulty: 'easy',
                    problem_statement: '',
                    sample_input: '',
                    sample_output: '',
                    points: 5,
                    time_limit: 30,
                    test_cases: [
                        { input: '', output: '', isHidden: false }
                    ]
                });

                // Notify parent component
                if (onQuestionAdded) {
                    onQuestionAdded();
                }
            }
        } catch (error) {
            console.error('❌ Error adding question:', error);

            let errorMessage = 'Failed to add question';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
                if (error.response.data.detail) {
                    errorMessage += ` - ${error.response.data.detail}`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(`❌ ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Quick fill sample data for testing
    const fillSampleData = () => {
        setFormData({
            title: 'Two Sum Problem',
            difficulty: 'easy',
            problem_statement: `# Two Sum

## Problem Statement
Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

## Input Format
- First line: n (size of array)
- Second line: n space-separated integers
- Third line: target value

## Output Format
Return two indices as space-separated integers

## Constraints
- 2 ≤ n ≤ 10^4
- -10^9 ≤ nums[i] ≤ 10^9
- -10^9 ≤ target ≤ 10^9

## Example
Input:
4
2 7 11 15
9

Output:
0 1

## Explanation
Because nums[0] + nums[1] == 9, we return [0, 1].`,
            sample_input: '4\n2 7 11 15\n9',
            sample_output: '0 1',
            points: 5,
            time_limit: 30,
            test_cases: [
                {
                    input: '4\n2 7 11 15\n9',
                    output: '0 1',
                    isHidden: false
                },
                {
                    input: '3\n3 2 4\n6',
                    output: '1 2',
                    isHidden: true
                },
                {
                    input: '2\n3 3\n6',
                    output: '0 1',
                    isHidden: true
                }
            ]
        });
    };

    return (
        <div className="admin-section" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0
                }}>
                    ➕ Add Round 2 Coding Question
                </h2>

                <button
                    type="button"
                    onClick={fillSampleData}
                    style={{
                        padding: '10px 20px',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
                    onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
                >
                    <span>📋</span>
                    Fill Sample Data
                </button>
            </div>

            {/* Error/Success Messages */}
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
                    <span style={{ color: '#dc2626', fontWeight: '500', whiteSpace: 'pre-line' }}>{error}</span>
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
                    animation: 'slideIn 0.3s ease',
                    whiteSpace: 'pre-line'
                }}>
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span style={{ color: '#059669', fontWeight: '500' }}>{success}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '15px',
                    padding: '25px',
                    marginBottom: '25px'
                }}>
                    <h3 style={{ color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📋</span>
                        Basic Information
                    </h3>

                    <div className="input-group">
                        <label style={{ fontWeight: '600', color: '#374151' }}>Question Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="e.g., Two Sum Problem"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ fontWeight: '600', color: '#374151' }}>Difficulty *</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    background: 'white'
                                }}
                            >
                                <option value="easy">📗 Easy (5 points)</option>
                                <option value="medium">📘 Medium (10 points)</option>
                                <option value="hard">📕 Hard (15 points)</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label style={{ fontWeight: '600', color: '#374151' }}>Points *</label>
                            <input
                                type="number"
                                name="points"
                                value={formData.points}
                                onChange={handleInputChange}
                                min="1"
                                max="20"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontWeight: '600', color: '#374151' }}>Time Limit (minutes) *</label>
                            <input
                                type="number"
                                name="time_limit"
                                value={formData.time_limit}
                                onChange={handleInputChange}
                                min="5"
                                max="180"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Problem Statement */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '15px',
                    padding: '25px',
                    marginBottom: '25px'
                }}>
                    <h3 style={{ color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📝</span>
                        Problem Statement
                    </h3>

                    <div className="input-group">
                        <label style={{ fontWeight: '600', color: '#374151' }}>Problem Description *</label>
                        <textarea
                            name="problem_statement"
                            value={formData.problem_statement}
                            onChange={handleInputChange}
                            placeholder="Describe the problem in detail. Include:
- Problem description
- Input format
- Output format
- Constraints
- Example with explanation"
                            rows="12"
                            required
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>
                </div>

                {/* Sample Input/Output */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '15px',
                    padding: '25px',
                    marginBottom: '25px'
                }}>
                    <h3 style={{ color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📊</span>
                        Sample Test Case (Visible to Participants)
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ fontWeight: '600', color: '#374151' }}>Sample Input *</label>
                            <textarea
                                name="sample_input"
                                value={formData.sample_input}
                                onChange={handleInputChange}
                                placeholder="e.g., 4&#10;2 7 11 15&#10;9"
                                rows="4"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontWeight: '600', color: '#374151' }}>Sample Output *</label>
                            <textarea
                                name="sample_output"
                                value={formData.sample_output}
                                onChange={handleInputChange}
                                placeholder="e.g., 0 1"
                                rows="4"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Test Cases */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '15px',
                    padding: '25px',
                    marginBottom: '25px'
                }}>
                    <h3 style={{ color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🧪</span>
                        Test Cases ({formData.test_cases.length})
                    </h3>

                    {formData.test_cases.map((testCase, index) => (
                        <div key={index} style={{
                            border: `2px solid ${testCase.isHidden ? '#f59e0b' : '#10b981'}`,
                            borderRadius: '10px',
                            padding: '20px',
                            marginBottom: '20px',
                            background: testCase.isHidden ? '#fffbeb' : '#f0fdf4',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                display: 'flex',
                                gap: '10px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => toggleHidden(index)}
                                    style={{
                                        padding: '5px 12px',
                                        background: testCase.isHidden ? '#f59e0b' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '15px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {testCase.isHidden ? '🔒 Hidden' : '👁️ Sample'}
                                </button>

                                {formData.test_cases.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTestCase(index)}
                                        style={{
                                            padding: '5px 12px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '15px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕ Remove
                                    </button>
                                )}
                            </div>

                            <h4 style={{ marginBottom: '15px', color: '#1f2937' }}>
                                Test Case #{index + 1}
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-group">
                                    <label style={{ fontWeight: '600', color: '#374151' }}>Input *</label>
                                    <textarea
                                        value={testCase.input}
                                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                                        placeholder="Test case input data..."
                                        rows="4"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>

                                <div className="input-group">
                                    <label style={{ fontWeight: '600', color: '#374151' }}>Expected Output *</label>
                                    <textarea
                                        value={testCase.output}
                                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                                        placeholder="Expected output..."
                                        rows="4"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '13px', color: testCase.isHidden ? '#b45309' : '#047857' }}>
                                {testCase.isHidden
                                    ? '🔒 This test case will NOT be visible to participants'
                                    : '👁️ This test case will be visible to participants as an example'}
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addTestCase}
                        style={{
                            padding: '12px 24px',
                            background: '#e5e7eb',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '10px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
                        onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
                    >
                        ➕ Add Another Test Case
                    </button>
                </div>

                {/* Submit Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    marginTop: '30px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: '15px 30px',
                            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
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
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 10px 20px rgba(220, 38, 38, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
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
                                Adding Question...
                            </>
                        ) : (
                            <>
                                <span>➕</span>
                                Add Coding Question
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to clear all fields?')) {
                                setFormData({
                                    title: '',
                                    difficulty: 'easy',
                                    problem_statement: '',
                                    sample_input: '',
                                    sample_output: '',
                                    points: 5,
                                    time_limit: 30,
                                    test_cases: [
                                        { input: '', output: '', isHidden: false }
                                    ]
                                });
                                setError('');
                                setSuccess('');
                            }
                        }}
                        style={{
                            flex: 1,
                            padding: '15px 30px',
                            background: '#e5e7eb',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
                        onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
                    >
                        Clear Form
                    </button>
                </div>

                {/* Summary */}
                <div style={{
                    marginTop: '30px',
                    padding: '20px',
                    background: '#f3f4f6',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#4b5563'
                }}>
                    <strong>📊 Summary:</strong>
                    <ul style={{ marginTop: '10px', listStyle: 'none', padding: 0 }}>
                        <li>• Difficulty: <strong>{formData.difficulty.toUpperCase()}</strong> ({formData.points} points)</li>
                        <li>• Time Limit: <strong>{formData.time_limit} minutes</strong></li>
                        <li>• Total Test Cases: <strong>{formData.test_cases.length}</strong></li>
                        <li>• Sample Tests: <strong>{formData.test_cases.filter(tc => !tc.isHidden).length}</strong> (visible)</li>
                        <li>• Hidden Tests: <strong>{formData.test_cases.filter(tc => tc.isHidden).length}</strong> (invisible)</li>
                    </ul>
                </div>
            </form>

            {/* Global Styles */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
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
                
                textarea, input, select {
                    transition: all 0.3s ease;
                }
                
                textarea:focus, input:focus, select:focus {
                    outline: none;
                }
            `}</style>
        </div>
    );
};

export default Round2AddQuestion;