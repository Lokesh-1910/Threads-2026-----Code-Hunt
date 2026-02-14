import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminPanel() {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Round 1 States
    const [round1Questions, setRound1Questions] = useState([]);
    const [round1Password, setRound1Password] = useState('');
    const [currentRound1Password, setCurrentRound1Password] = useState('');

    // Round 2 States
    const [round2Questions, setRound2Questions] = useState([]);
    const [round2Password, setRound2Password] = useState('');
    const [currentRound2Password, setCurrentRound2Password] = useState('');

    // Common States
    const [results, setResults] = useState([]);
    const [teams, setTeams] = useState([]);
    const [codingResults, setCodingResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ============ ROUND 1: ADD MCQ FORM STATES ============
    const [r1QuestionText, setR1QuestionText] = useState('');
    const [r1Options, setR1Options] = useState(['', '', '', '']);
    const [r1CorrectAnswer, setR1CorrectAnswer] = useState('');
    const [r1Difficulty, setR1Difficulty] = useState('easy');

    // ============ ROUND 2: ADD CODING FORM STATES ============
    const [r2Title, setR2Title] = useState('');
    const [r2Difficulty, setR2Difficulty] = useState('easy');
    const [r2ProblemStatement, setR2ProblemStatement] = useState('');
    const [r2SampleInput, setR2SampleInput] = useState('');
    const [r2SampleOutput, setR2SampleOutput] = useState('');
    const [r2Points, setR2Points] = useState(5);
    const [r2TimeLimit, setR2TimeLimit] = useState(30);
    const [r2TestCases, setR2TestCases] = useState([
        { input: '', output: '', isHidden: false }
    ]);

    const navigate = useNavigate();

    // ============ CHECK AUTHENTICATION ============
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token) {
            alert('Please login first');
            navigate('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr || '{}');
            if (user.teamCode !== 'ADMIN001' && !user.isAdmin) {
                alert('Access denied. Admin only.');
                navigate('/dashboard');
                return;
            }

            // Set default auth header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Fetch initial data
            fetchRound1Questions();
            fetchRound2Questions();
            fetchResults();
            fetchCodingResults();
            fetchTeams();
            fetchSettings();

        } catch (error) {
            console.error('Auth error:', error);
            navigate('/login');
        }
    }, [navigate]);

    // ============ API CALLS ============

    const fetchRound1Questions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/round1/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRound1Questions(response.data);
        } catch (error) {
            console.error('Error fetching round1 questions:', error);
            showError('Failed to load Round 1 questions');
        }
    };

    const fetchRound2Questions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/round2/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRound2Questions(response.data);
        } catch (error) {
            console.error('Error fetching round2 questions:', error);
            showError('Failed to load Round 2 questions');
        }
    };

    const fetchResults = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/results', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setResults(response.data);
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    const fetchCodingResults = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/coding-results', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCodingResults(response.data);
        } catch (error) {
            console.error('Error fetching coding results:', error);
        }
    };

    const fetchTeams = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/teams', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3001/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setCurrentRound1Password(response.data.round1Password || 'Round1@2024');
            setCurrentRound2Password(response.data.round2Password || 'Round2@2024');
        } catch (error) {
            console.error('Error fetching settings:', error);
            setCurrentRound1Password('Round1@2024');
            setCurrentRound2Password('Round2@2024');
        }
    };

    // ============ HELPER FUNCTIONS ============
    const showError = (message) => {
        setError(message);
        setTimeout(() => setError(''), 5000);
    };

    const showSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 5000);
    };

    // ============ ROUND 1: ADD MCQ QUESTION ============
    const handleAddRound1Question = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate 20 questions limit
        if (round1Questions.length >= 20) {
            showError('Maximum 20 questions allowed for Round 1!');
            return;
        }

        // Filter out empty options
        const validOptions = r1Options.filter(opt => opt.trim() !== '');

        if (validOptions.length < 2) {
            showError('At least 2 options are required');
            return;
        }

        if (!r1CorrectAnswer) {
            showError('Please select the correct answer');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            const questionData = {
                question_text: r1QuestionText,
                question_type: 'mcq',
                options: validOptions,
                correct_answer: r1CorrectAnswer,
                difficulty: r1Difficulty,
                points: 1
            };

            console.log('Submitting Round 1 question:', questionData);

            const response = await axios.post('http://localhost:3001/api/admin/round1/questions',
                questionData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                showSuccess('✅ Round 1 MCQ added successfully!');
                // Reset form
                setR1QuestionText('');
                setR1Options(['', '', '', '']);
                setR1CorrectAnswer('');
                // Refresh questions
                await fetchRound1Questions();
                // Switch to view tab
                setActiveTab('round1-view');
            }
        } catch (error) {
            console.error('Error adding round1 question:', error);
            showError('Failed to add question: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // ============ ROUND 1: DELETE MCQ QUESTION ============
    const handleDeleteRound1Question = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');

            const response = await axios.delete(`http://localhost:3001/api/admin/round1/questions/${questionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                showSuccess('Question deleted successfully!');
                fetchRound1Questions();
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('Failed to delete question');
        }
    };

    // ============ ROUND 1: DELETE ALL QUESTIONS ============
    const handleDeleteAllRound1Questions = async () => {
        if (round1Questions.length === 0) {
            showError('No Round 1 questions to delete');
            return;
        }

        const confirm = window.confirm(
            '⚠️ DELETE ALL ROUND 1 QUESTIONS ⚠️\n\n' +
            `This will delete ${round1Questions.length} MCQ questions.\n` +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure?'
        );

        if (!confirm) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Delete each question one by one
            let deleted = 0;
            for (const question of round1Questions) {
                await axios.delete(`http://localhost:3001/api/admin/round1/questions/${question.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                deleted++;
            }

            showSuccess(`✅ Successfully deleted ${deleted} Round 1 questions`);
            fetchRound1Questions();

        } catch (error) {
            console.error('Error deleting round1 questions:', error);
            showError('Failed to delete all questions');
        } finally {
            setLoading(false);
        }
    };

    // ============ ROUND 2: ADD CODING QUESTION ============
    const handleAddRound2Question = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validate test cases
        if (r2TestCases.length === 0) {
            showError('At least one test case is required');
            setLoading(false);
            return;
        }

        // Validate each test case
        for (let i = 0; i < r2TestCases.length; i++) {
            if (!r2TestCases[i].input.trim() || !r2TestCases[i].output.trim()) {
                showError(`Test case ${i + 1} is incomplete`);
                setLoading(false);
                return;
            }
        }

        try {
            const token = localStorage.getItem('token');

            const questionData = {
                title: r2Title,
                difficulty: r2Difficulty.toLowerCase(),
                problem_statement: r2ProblemStatement,
                description: r2ProblemStatement, // Send both to be safe
                sample_input: r2SampleInput,
                sample_output: r2SampleOutput,
                points: r2Points,
                time_limit: r2TimeLimit,
                test_cases: r2TestCases.map(tc => ({
                    input: tc.input,
                    output: tc.output,
                    isHidden: tc.isHidden,
                    score: 5 // Default score per test case
                }))
            };

            console.log('Submitting Round 2 question:', questionData);

            const response = await axios.post('http://localhost:3001/api/admin/round2/questions',
                questionData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                showSuccess('✅ Coding question added successfully!');
                // Reset form
                setR2Title('');
                setR2ProblemStatement('');
                setR2SampleInput('');
                setR2SampleOutput('');
                setR2Points(5);
                setR2TimeLimit(30);
                setR2TestCases([{ input: '', output: '', isHidden: false }]);
                // Refresh questions
                await fetchRound2Questions();
                // Switch to view tab
                setActiveTab('round2-view');
            }
        } catch (error) {
            console.error('Error adding round2 question:', error);
            showError('Failed to add question: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // ============ DELETE ALL QUESTIONS (BOTH ROUNDS) ============
    const handleDeleteAllQuestions = async () => {
        const confirm = window.confirm(
            '⚠️⚠️⚠️ ULTIMATE DANGER ZONE ⚠️⚠️⚠️\n\n' +
            'This will delete EVERYTHING:\n' +
            `• ${round1Questions.length} Round 1 MCQ questions\n` +
            `• ${round2Questions.length} Round 2 coding problems\n` +
            '• All test cases\n' +
            '• All submissions\n' +
            '• All answers\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure?'
        );

        if (!confirm) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete('http://localhost:3001/api/admin/delete-all-questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                showSuccess(`✅ Deleted everything successfully!\n\n` +
                    `📊 Statistics:\n` +
                    `• Round 1 Questions: ${response.data.stats.round1_questions}\n` +
                    `• Round 2 Questions: ${response.data.stats.round2_questions}\n` +
                    `• Test Cases: ${response.data.stats.test_cases}\n` +
                    `• Submissions: ${response.data.stats.submissions}`);

                // Refresh data
                fetchRound1Questions();
                fetchRound2Questions();
                fetchResults();
                fetchCodingResults();
            }
        } catch (error) {
            console.error('Error deleting all questions:', error);
            showError('Failed to delete: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    // ============ ROUND 2: TEST CASE MANAGEMENT ============
    const addTestCase = () => {
        setR2TestCases([...r2TestCases, { input: '', output: '', isHidden: true }]);
    };

    const removeTestCase = (index) => {
        if (r2TestCases.length > 1) {
            const newTestCases = r2TestCases.filter((_, i) => i !== index);
            setR2TestCases(newTestCases);
        }
    };

    const updateTestCase = (index, field, value) => {
        const newTestCases = [...r2TestCases];
        newTestCases[index][field] = value;
        setR2TestCases(newTestCases);
    };

    const toggleHiddenTestCase = (index) => {
        const newTestCases = [...r2TestCases];
        newTestCases[index].isHidden = !newTestCases[index].isHidden;
        setR2TestCases(newTestCases);
    };

    // ============ ROUND 2: DELETE CODING QUESTION ============
    const handleDeleteRound2Question = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this coding question?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');

            const response = await axios.delete(`http://localhost:3001/api/admin/round2/questions/${questionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                showSuccess('Question deleted successfully!');
                fetchRound2Questions();
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('Failed to delete question');
        }
    };

    // ============ ROUND 2: DELETE ALL QUESTIONS ============
    const handleDeleteAllRound2Questions = async () => {
        if (round2Questions.length === 0) {
            showError('No Round 2 questions to delete');
            return;
        }

        const confirm = window.confirm(
            '⚠️ DELETE ALL ROUND 2 QUESTIONS ⚠️\n\n' +
            `This will delete ${round2Questions.length} coding problems.\n` +
            'All associated test cases and submissions will also be deleted.\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure?'
        );

        if (!confirm) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Delete each question one by one
            let deleted = 0;
            for (const question of round2Questions) {
                await axios.delete(`http://localhost:3001/api/admin/round2/questions/${question.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                deleted++;
            }

            showSuccess(`✅ Successfully deleted ${deleted} Round 2 questions`);
            fetchRound2Questions();

        } catch (error) {
            console.error('Error deleting round2 questions:', error);
            showError('Failed to delete all questions');
        } finally {
            setLoading(false);
        }
    };

    // ============ CREATE TEAM ============
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const teamCode = document.getElementById('teamCode')?.value;
        const teamName = document.getElementById('teamName')?.value;
        const teamPassword = document.getElementById('teamPassword')?.value;

        if (!teamCode || !teamName || !teamPassword) {
            showError('Please fill all fields');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3001/api/admin/create-team', {
                teamCode: teamCode.toUpperCase(),
                teamName,
                password: teamPassword
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                showSuccess(`✅ Team created successfully!\nTeam Code: ${teamCode}\nPassword: ${teamPassword}`);
                // Clear form
                document.getElementById('teamCode').value = '';
                document.getElementById('teamName').value = '';
                document.getElementById('teamPassword').value = '';
                fetchTeams();
            }
        } catch (error) {
            console.error('Error creating team:', error);
            showError('Failed to create team: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // ============ UPDATE PASSWORDS ============
    const handleUpdateRound1Password = async () => {
        if (!round1Password) {
            showError('Please enter a new password');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3001/api/admin/set-round1-password',
                { newPassword: round1Password },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                showSuccess('Round 1 password updated successfully!');
                setCurrentRound1Password(round1Password);
                setRound1Password('');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            showError('Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRound2Password = async () => {
        if (!round2Password) {
            showError('Please enter a new password');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3001/api/admin/set-round2-password',
                { newPassword: round2Password },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                showSuccess('Round 2 password updated successfully!');
                setCurrentRound2Password(round2Password);
                setRound2Password('');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            showError('Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    // ============ ROUND 1: OPTION HANDLERS ============
    const handleOptionChange = (index, value) => {
        const newOptions = [...r1Options];
        newOptions[index] = value;
        setR1Options(newOptions);
    };

    const addOption = () => {
        if (r1Options.length < 6) {
            setR1Options([...r1Options, '']);
        }
    };

    const removeOption = (index) => {
        if (r1Options.length > 2) {
            const newOptions = r1Options.filter((_, i) => i !== index);
            setR1Options(newOptions);

            // Update correct answer if it was removed
            if (r1CorrectAnswer === r1Options[index]) {
                setR1CorrectAnswer('');
            }
        }
    };

    // ============ RENDER UI ============

    return (
        <div className="admin-container">
            <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#4f46e5' }}>
                👨‍💼 Code Hunt Admin Panel
            </h1>

            {/* Error/Success Messages */}
            {error && (
                <div style={{
                    background: '#fee2e2',
                    border: '2px solid #ef4444',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#dc2626',
                    fontWeight: '500'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: '#d1fae5',
                    border: '2px solid #10b981',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#059669',
                    fontWeight: '500',
                    whiteSpace: 'pre-line'
                }}>
                    ✅ {success}
                </div>
            )}

            {/* Admin Navigation Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button
                    className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>

                {/* Round 1 Dropdown */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        className={`btn ${activeTab.startsWith('round1') ? 'btn-primary' : ''}`}
                        style={{ backgroundColor: activeTab.startsWith('round1') ? '#4f46e5' : '#e5e7eb' }}
                    >
                        Round 1 ▼
                    </button>
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '5px',
                        display: 'none',
                        zIndex: 1000
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.display = 'block'}
                        onMouseLeave={(e) => e.currentTarget.style.display = 'none'}
                    >
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                            onClick={() => setActiveTab('round1-add')}
                        >
                            ➕ Add MCQ
                        </button>
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                            onClick={() => setActiveTab('round1-view')}
                        >
                            📋 View MCQs ({round1Questions.length}/20)
                        </button>
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0, color: '#dc2626' }}
                            onClick={() => setActiveTab('round1-delete')}
                        >
                            🗑️ Delete Round 1 Questions
                        </button>
                    </div>
                </div>

                {/* Round 2 Dropdown */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        className={`btn ${activeTab.startsWith('round2') ? 'btn-primary' : ''}`}
                        style={{ backgroundColor: activeTab.startsWith('round2') ? '#4f46e5' : '#e5e7eb' }}
                    >
                        Round 2 ▼
                    </button>
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '5px',
                        display: 'none',
                        zIndex: 1000
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.display = 'block'}
                        onMouseLeave={(e) => e.currentTarget.style.display = 'none'}
                    >
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                            onClick={() => setActiveTab('round2-add')}
                        >
                            ➕ Add Coding Problem
                        </button>
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                            onClick={() => setActiveTab('round2-view')}
                        >
                            📋 View Problems ({round2Questions.length})
                        </button>
                        <button
                            className="btn"
                            style={{ width: '100%', textAlign: 'left', borderRadius: 0, color: '#dc2626' }}
                            onClick={() => setActiveTab('round2-delete')}
                        >
                            🗑️ Delete Round 2 Questions
                        </button>
                    </div>
                </div>

                <button
                    className={`btn ${activeTab === 'teams' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('teams')}
                >
                    👥 Teams
                </button>
                <button
                    className={`btn ${activeTab === 'results' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('results')}
                >
                    🏆 Results
                </button>
                <button
                    className={`btn ${activeTab === 'settings' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    ⚙️ Settings
                </button>
                <button
                    className="btn btn-danger"
                    onClick={() => {
                        localStorage.clear();
                        navigate('/login');
                    }}
                    style={{ marginLeft: 'auto' }}
                >
                    🚪 Logout
                </button>
            </div>

            {/* ============ DASHBOARD TAB ============ */}
            {activeTab === 'dashboard' && (
                <div className="admin-section">
                    <h2>📊 Admin Dashboard</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
                        <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                            <h3 style={{ color: '#4f46e5', marginBottom: '10px' }}>📋 Round 1</h3>
                            <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{round1Questions.length}/20</p>
                            <p>MCQ Questions</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('round1-view')} style={{ marginTop: '15px' }}>
                                Manage Round 1
                            </button>
                        </div>

                        <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                            <h3 style={{ color: '#4f46e5', marginBottom: '10px' }}>💻 Round 2</h3>
                            <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{round2Questions.length}</p>
                            <p>Coding Problems</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('round2-view')} style={{ marginTop: '15px' }}>
                                Manage Round 2
                            </button>
                        </div>

                        <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                            <h3 style={{ color: '#4f46e5', marginBottom: '10px' }}>👥 Teams</h3>
                            <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{teams.length}</p>
                            <p>Registered Teams</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('teams')} style={{ marginTop: '15px' }}>
                                View Teams
                            </button>
                        </div>

                        <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                            <h3 style={{ color: '#4f46e5', marginBottom: '10px' }}>🏆 Completed</h3>
                            <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{results.length}</p>
                            <p>Round 1 Completed</p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{codingResults.length}</p>
                            <p>Round 2 Completed</p>
                            <button className="btn btn-primary" onClick={() => setActiveTab('results')} style={{ marginTop: '15px' }}>
                                View Results
                            </button>
                        </div>
                    </div>

                    {/* Quick Status */}
                    <div style={{ marginTop: '30px', padding: '20px', background: '#f9fafb', borderRadius: '10px' }}>
                        <h3>📊 Event Status</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '15px' }}>
                            <div>
                                <h4>Round 1 Password:</h4>
                                <code style={{ background: '#e5e7eb', padding: '5px 10px', borderRadius: '5px' }}>
                                    {currentRound1Password}
                                </code>
                            </div>
                            <div>
                                <h4>Round 2 Password:</h4>
                                <code style={{ background: '#e5e7eb', padding: '5px 10px', borderRadius: '5px' }}>
                                    {currentRound2Password}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ ROUND 1: ADD MCQ TAB ============ */}
            {activeTab === 'round1-add' && (
                <div className="admin-section">
                    <h2>➕ Round 1: Add MCQ Question ({round1Questions.length}/20)</h2>

                    {round1Questions.length >= 20 ? (
                        <div className="alert alert-warning">
                            ⚠️ Maximum 20 questions reached. Cannot add more.
                        </div>
                    ) : (
                        <form onSubmit={handleAddRound1Question}>
                            <div className="input-group">
                                <label>Difficulty Level</label>
                                <select value={r1Difficulty} onChange={(e) => setR1Difficulty(e.target.value)}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Question Text</label>
                                <textarea
                                    value={r1QuestionText}
                                    onChange={(e) => setR1QuestionText(e.target.value)}
                                    placeholder="Enter your MCQ question here..."
                                    rows="4"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Options</label>
                                {r1Options.map((option, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <textarea
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                            style={{ flex: 1 }}
                                            required={index < 2}
                                            rows="2"
                                        />
                                        
                                        {r1Options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                style={{
                                                    background: '#fee2e2',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    padding: '0 15px',
                                                    color: '#dc2626',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {r1Options.length < 6 && (
                                    <button
                                        type="button"
                                        onClick={addOption}
                                        style={{
                                            background: '#e5e7eb',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '8px 16px',
                                            marginTop: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Add Option
                                    </button>
                                )}
                            </div>

                            <div className="input-group">
                                <label>Correct Answer</label>
                                <select
                                    value={r1CorrectAnswer}
                                    onChange={(e) => setR1CorrectAnswer(e.target.value)}
                                    required
                                >
                                    <option value="">Select correct answer</option>
                                    {r1Options.filter(opt => opt.trim() !== '').map((opt, idx) => (
                                        <option key={idx} value={opt}>
                                            {String.fromCharCode(65 + idx)}. {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : `Add MCQ Question (${round1Questions.length + 1}/20)`}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ============ ROUND 1: VIEW MCQS TAB ============ */}
            {activeTab === 'round1-view' && (
                <div className="admin-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>📋 Round 1: MCQ Questions ({round1Questions.length}/20)</h2>
                        {round1Questions.length < 20 && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setActiveTab('round1-add')}
                            >
                                + Add MCQ
                            </button>
                        )}
                    </div>

                    {round1Questions.length === 0 ? (
                        <div className="alert alert-info">
                            No MCQ questions added yet. Click "Add MCQ" to create questions.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {round1Questions.map((q, index) => (
                                <div key={q.id} style={{
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    padding: '20px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <span style={{
                                                background: q.difficulty === 'easy' ? '#10b981' :
                                                    q.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                                                color: 'white',
                                                padding: '3px 10px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                marginRight: '10px'
                                            }}>
                                                {q.difficulty?.toUpperCase() || 'MEDIUM'}
                                            </span>
                                            <span style={{
                                                background: '#4f46e5',
                                                color: 'white',
                                                padding: '3px 10px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold'
                                            }}>
                                                Q{index + 1}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteRound1Question(q.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#dc2626',
                                                cursor: 'pointer',
                                                fontSize: '18px'
                                            }}
                                            title="Delete Question"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <p style={{ fontSize: '16px', margin: '15px 0', fontWeight: '500' }}>
                                        {q.question_text}
                                    </p>

                                    {q.options && (
                                        <div style={{ marginTop: '10px' }}>
                                            <ul style={{ marginTop: '5px', listStyle: 'none', padding: 0 }}>
                                                {Array.isArray(q.options) && q.options.map((opt, idx) => (
                                                    <li key={idx} style={{
                                                        padding: '8px 12px',
                                                        background: opt === q.correct_answer ? '#d1fae5' : '#f3f4f6',
                                                        borderRadius: '5px',
                                                        marginBottom: '5px'
                                                    }}>
                                                        {String.fromCharCode(65 + idx)}. {opt}
                                                        {opt === q.correct_answer && ' ✓'}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ ROUND 1: DELETE ALL TAB ============ */}
            {activeTab === 'round1-delete' && (
                <div className="admin-section">
                    <h2 style={{ color: '#dc2626' }}>🗑️ Delete Round 1 Questions</h2>

                    <div style={{
                        background: '#fef2f2',
                        border: '2px solid #dc2626',
                        borderRadius: '10px',
                        padding: '30px',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>⚠️</span>

                        <h3 style={{ color: '#991b1b', marginBottom: '20px' }}>
                            Delete All Round 1 MCQ Questions
                        </h3>

                        <p style={{ color: '#4b5563', marginBottom: '20px' }}>
                            You have <strong>{round1Questions.length}</strong> MCQ questions in Round 1.
                        </p>

                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '25px',
                            textAlign: 'left',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            <strong>Questions to be deleted:</strong>
                            <ul style={{ marginTop: '10px', listStyle: 'none', padding: 0 }}>
                                {round1Questions.map((q, i) => (
                                    <li key={i} style={{ padding: '5px 0', borderBottom: '1px solid #e5e7eb' }}>
                                        Q{i + 1}: {q.question_text.substring(0, 50)}...
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteAllRound1Questions}
                            disabled={loading || round1Questions.length === 0}
                            style={{
                                padding: '15px 30px',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? 'Deleting...' : `🗑️ DELETE ALL ${round1Questions.length} QUESTIONS`}
                        </button>

                        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
                            This action cannot be undone. All questions will be permanently removed.
                        </p>
                    </div>
                </div>
            )}

            {/* ============ ROUND 2: ADD CODING PROBLEM TAB ============ */}
            {activeTab === 'round2-add' && (
                <div className="admin-section">
                    <h2>➕ Round 2: Add Coding Problem</h2>

                    <form onSubmit={handleAddRound2Question}>
                        <div className="input-group">
                            <label>Difficulty Level</label>
                            <select value={r2Difficulty} onChange={(e) => setR2Difficulty(e.target.value)}>
                                <option value="easy">📗 Easy (5 points)</option>
                                <option value="medium">📘 Medium (10 points)</option>
                                <option value="hard">📕 Hard (15 points)</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Problem Title</label>
                            <input
                                type="text"
                                value={r2Title}
                                onChange={(e) => setR2Title(e.target.value)}
                                placeholder="e.g., Sum of Two Numbers"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Problem Statement</label>
                            <textarea
                                value={r2ProblemStatement}
                                onChange={(e) => setR2ProblemStatement(e.target.value)}
                                placeholder="Describe the problem in detail..."
                                rows="6"
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>Sample Input</label>
                                <textarea
                                    value={r2SampleInput}
                                    onChange={(e) => setR2SampleInput(e.target.value)}
                                    placeholder="e.g., 5 3"
                                    rows="3"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Sample Output</label>
                                <textarea
                                    value={r2SampleOutput}
                                    onChange={(e) => setR2SampleOutput(e.target.value)}
                                    placeholder="e.g., 8"
                                    rows="3"
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>Points</label>
                                <input
                                    type="number"
                                    value={r2Points}
                                    onChange={(e) => setR2Points(parseInt(e.target.value))}
                                    min="1"
                                    max="20"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Time Limit (minutes)</label>
                                <input
                                    type="number"
                                    value={r2TimeLimit}
                                    onChange={(e) => setR2TimeLimit(parseInt(e.target.value))}
                                    min="5"
                                    max="180"
                                    required
                                />
                            </div>
                        </div>

                        {/* Test Cases Section */}
                        <div style={{ marginTop: '30px' }}>
                            <h3 style={{ marginBottom: '20px' }}>🧪 Test Cases</h3>

                            {r2TestCases.map((testCase, index) => (
                                <div key={index} style={{
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    padding: '20px',
                                    marginBottom: '20px',
                                    position: 'relative',
                                    background: testCase.isHidden ? '#fef3c7' : '#f0fdf4'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        display: 'flex',
                                        gap: '10px'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <input
                                                type="checkbox"
                                                checked={testCase.isHidden}
                                                onChange={() => toggleHiddenTestCase(index)}
                                            />
                                            Hidden Test
                                        </label>
                                        {r2TestCases.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeTestCase(index)}
                                                style={{
                                                    background: '#fee2e2',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    padding: '5px 10px',
                                                    color: '#dc2626',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕ Remove
                                            </button>
                                        )}
                                    </div>

                                    <h4>Test Case {index + 1}</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="input-group">
                                            <label>Input</label>
                                            <textarea
                                                value={testCase.input}
                                                onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                                                placeholder="Test input data"
                                                rows="3"
                                                required
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label>Expected Output</label>
                                            <textarea
                                                value={testCase.output}
                                                onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                                                placeholder="Expected output"
                                                rows="3"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '10px' }}>
                                        <small style={{ color: testCase.isHidden ? '#b45309' : '#047857' }}>
                                            {testCase.isHidden
                                                ? '🔒 Hidden test case (not visible to participants)'
                                                : '👁️ Sample test case (visible to participants)'}
                                        </small>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn"
                                onClick={addTestCase}
                                style={{ background: '#e5e7eb', marginTop: '10px' }}
                                disabled={loading}
                            >
                                + Add Another Test Case
                            </button>
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : 'Add Coding Problem'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ============ ROUND 2: VIEW CODING PROBLEMS TAB ============ */}
            {activeTab === 'round2-view' && (
                <div className="admin-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>📋 Round 2: Coding Problems</h2>
                        <button
                            className="btn btn-primary"
                            onClick={() => setActiveTab('round2-add')}
                        >
                            + Add Problem
                        </button>
                    </div>

                    {round2Questions.length === 0 ? (
                        <div className="alert alert-info">
                            No coding problems added yet. Click "Add Problem" to create problems.
                        </div>
                    ) : (
                        <div>
                            {/* Easy Problems */}
                            {round2Questions.filter(q => q.difficulty === 'easy').length > 0 && (
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ color: '#10b981', marginBottom: '15px' }}>📗 Easy Problems</h3>
                                    {round2Questions.filter(q => q.difficulty === 'easy').map((q, idx) => (
                                        <ProblemCard
                                            key={q.id}
                                            question={q}
                                            index={idx}
                                            onDelete={handleDeleteRound2Question}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Medium Problems */}
                            {round2Questions.filter(q => q.difficulty === 'medium').length > 0 && (
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ color: '#f59e0b', marginBottom: '15px' }}>📘 Medium Problems</h3>
                                    {round2Questions.filter(q => q.difficulty === 'medium').map((q, idx) => (
                                        <ProblemCard
                                            key={q.id}
                                            question={q}
                                            index={idx}
                                            onDelete={handleDeleteRound2Question}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Hard Problems */}
                            {round2Questions.filter(q => q.difficulty === 'hard').length > 0 && (
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ color: '#ef4444', marginBottom: '15px' }}>📕 Hard Problems</h3>
                                    {round2Questions.filter(q => q.difficulty === 'hard').map((q, idx) => (
                                        <ProblemCard
                                            key={q.id}
                                            question={q}
                                            index={idx}
                                            onDelete={handleDeleteRound2Question}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ============ ROUND 2: DELETE ALL TAB ============ */}
            {activeTab === 'round2-delete' && (
                <div className="admin-section">
                    <h2 style={{ color: '#dc2626' }}>🗑️ Delete Round 2 Questions</h2>

                    <div style={{
                        background: '#fef2f2',
                        border: '2px solid #dc2626',
                        borderRadius: '10px',
                        padding: '30px',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>⚠️</span>

                        <h3 style={{ color: '#991b1b', marginBottom: '20px' }}>
                            Delete All Round 2 Coding Problems
                        </h3>

                        <p style={{ color: '#4b5563', marginBottom: '20px' }}>
                            You have <strong>{round2Questions.length}</strong> coding problems in Round 2.
                            All associated test cases will also be deleted.
                        </p>

                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '25px',
                            textAlign: 'left',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            <strong>Problems to be deleted:</strong>
                            <ul style={{ marginTop: '10px', listStyle: 'none', padding: 0 }}>
                                {round2Questions.map((q, i) => (
                                    <li key={i} style={{ padding: '5px 0', borderBottom: '1px solid #e5e7eb' }}>
                                        {q.difficulty} - {q.title}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteAllRound2Questions}
                            disabled={loading || round2Questions.length === 0}
                            style={{
                                padding: '15px 30px',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? 'Deleting...' : `🗑️ DELETE ALL ${round2Questions.length} PROBLEMS`}
                        </button>

                        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
                            This action cannot be undone. All problems and test cases will be permanently removed.
                        </p>
                    </div>
                </div>
            )}

            {/* ============ TEAMS TAB ============ */}
            {activeTab === 'teams' && (
                <div className="admin-section">
                    <h2>👥 Team Management</h2>

                    <div style={{ marginBottom: '30px' }}>
                        <h3>Create New Team</h3>
                        <form onSubmit={handleCreateTeam} style={{ maxWidth: '400px' }}>
                            <div className="input-group">
                                <label>Team Code</label>
                                <input
                                    id="teamCode"
                                    type="text"
                                    placeholder="e.g., TEAM001"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Team Name</label>
                                <input
                                    id="teamName"
                                    type="text"
                                    placeholder="Enter team name"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    id="teamPassword"
                                    type="text"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Team'}
                            </button>
                        </form>
                    </div>

                    <div>
                        <h3>Registered Teams ({teams.length})</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f3f4f6' }}>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Team Code</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Team Name</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Leader</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>College</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Round 1</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Round 2</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams
                                        .filter(team => team.team_code !== 'ADMIN001')
                                        .map((team) => (
                                            <tr key={team.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                <td style={{ padding: '12px' }}>{team.team_code}</td>
                                                <td style={{ padding: '12px' }}>{team.team_name}</td>
                                                <td style={{ padding: '12px' }}>{team.leader_name || '-'}</td>
                                                <td style={{ padding: '12px' }}>{team.college_name || '-'}</td>
                                                <td style={{ padding: '12px' }}>
                                                    {team.round1_completed ?
                                                        <span style={{ color: '#10b981' }}>✅ {team.round1_score}/20</span> :
                                                        <span style={{ color: '#6b7280' }}>⏳ Pending</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    {team.round2_completed ?
                                                        <span style={{ color: '#10b981' }}>✅ {team.round2_score}/30</span> :
                                                        <span style={{ color: '#6b7280' }}>⏳ Pending</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ RESULTS TAB ============ */}
            {activeTab === 'results' && (
                <div className="admin-section">
                    <h2>🏆 Overall Results</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        {/* Round 1 Results */}
                        <div>
                            <h3>Round 1 - MCQ Results</h3>
                            {results.length === 0 ? (
                                <div className="alert alert-info">No results yet</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f3f4f6' }}>
                                            <th>Rank</th>
                                            <th>Team</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result, index) => (
                                            <tr key={index}>
                                                <td style={{ padding: '8px' }}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                                </td>
                                                <td>{result.team_name}</td>
                                                <td><strong>{result.total_score}/20</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Round 2 Results */}
                        <div>
                            <h3>Round 2 - Coding Results</h3>
                            {codingResults.length === 0 ? (
                                <div className="alert alert-info">No results yet</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f3f4f6' }}>
                                            <th>Rank</th>
                                            <th>Team</th>
                                            <th>Easy</th>
                                            <th>Med</th>
                                            <th>Hard</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codingResults.map((result, index) => (
                                            <tr key={index}>
                                                <td>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
                                                <td>{result.team_name}</td>
                                                <td>{result.easy_score || 0}/5</td>
                                                <td>{result.medium_score || 0}/10</td>
                                                <td>{result.hard_score || 0}/15</td>
                                                <td><strong>{result.total_score || 0}/30</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Combined Leaderboard */}
                    <div style={{ marginTop: '40px' }}>
                        <h3>🏆 Combined Leaderboard (Round 1 + Round 2)</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f3f4f6' }}>
                                    <th>Rank</th>
                                    <th>Team</th>
                                    <th>Round 1</th>
                                    <th>Round 2</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams
                                    .filter(team => team.team_code !== 'ADMIN001' && (team.round1_completed || team.round2_completed))
                                    .sort((a, b) => ((b.round1_score || 0) + (b.round2_score || 0)) - ((a.round1_score || 0) + (a.round2_score || 0)))
                                    .map((team, index) => (
                                        <tr key={team.id} style={{ background: index < 3 ? '#fef3c7' : 'transparent' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </td>
                                            <td>{team.team_name}</td>
                                            <td>{team.round1_score || 0}/20</td>
                                            <td>{team.round2_score || 0}/30</td>
                                            <td><strong>{(team.round1_score || 0) + (team.round2_score || 0)}/50</strong></td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ SETTINGS TAB ============ */}
            {/* ============ SETTINGS TAB ============ */}
            {activeTab === 'settings' && (
                <div className="admin-section">
                    <h2>⚙️ Round Settings</h2>

                    {/* Round 1 Password */}
                    <div style={{ maxWidth: '500px', marginBottom: '40px' }}>
                        <h3 style={{ color: '#4f46e5', marginBottom: '15px' }}>🔐 Round 1 Password</h3>
                        <div className="input-group">
                            <label>Current Password</label>
                            <input
                                type="text"
                                value={currentRound1Password}
                                disabled
                                style={{ background: '#f3f4f6' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>New Password</label>
                            <input
                                type="text"
                                value={round1Password}
                                onChange={(e) => setRound1Password(e.target.value)}
                                placeholder="Enter new round 1 password"
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleUpdateRound1Password}
                            disabled={!round1Password || loading}
                            style={{ marginRight: '10px' }}
                        >
                            {loading ? 'Updating...' : 'Update Round 1 Password'}
                        </button>
                    </div>

                    {/* Round 2 Password */}
                    <div style={{ maxWidth: '500px', marginBottom: '40px', borderTop: '2px solid #e5e7eb', paddingTop: '30px' }}>
                        <h3 style={{ color: '#4f46e5', marginBottom: '15px' }}>🔐 Round 2 Password</h3>
                        <div className="input-group">
                            <label>Current Password</label>
                            <input
                                type="text"
                                value={currentRound2Password}
                                disabled
                                style={{ background: '#f3f4f6' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>New Password</label>
                            <input
                                type="text"
                                value={round2Password}
                                onChange={(e) => setRound2Password(e.target.value)}
                                placeholder="Enter new round 2 password"
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleUpdateRound2Password}
                            disabled={!round2Password || loading}
                        >
                            {loading ? 'Updating...' : 'Update Round 2 Password'}
                        </button>
                    </div>

                    {/* ===== NEW: DELETE OPTIONS SECTION ===== */}
                    <div style={{
                        marginTop: '40px',
                        borderTop: '3px solid #dc2626',
                        paddingTop: '30px'
                    }}>
                        <h3 style={{ color: '#dc2626', marginBottom: '20px' }}>🗑️ Delete Options</h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {/* Delete Round 1 Questions */}
                            <div style={{
                                background: '#fef2f2',
                                border: '2px solid #dc2626',
                                borderRadius: '10px',
                                padding: '20px'
                            }}>
                                <h4 style={{ color: '#991b1b', marginBottom: '15px' }}>
                                    🗑️ Round 1 Questions
                                </h4>
                                <p style={{ color: '#4b5563', marginBottom: '15px' }}>
                                    You have <strong>{round1Questions.length}</strong> MCQ questions in Round 1.
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => setActiveTab('round1-delete')}
                                    disabled={round1Questions.length === 0}
                                    style={{ width: '100%' }}
                                >
                                    Manage Round 1 Delete
                                </button>
                            </div>

                            {/* Delete Round 2 Questions */}
                            <div style={{
                                background: '#fef2f2',
                                border: '2px solid #dc2626',
                                borderRadius: '10px',
                                padding: '20px'
                            }}>
                                <h4 style={{ color: '#991b1b', marginBottom: '15px' }}>
                                    🗑️ Round 2 Questions
                                </h4>
                                <p style={{ color: '#4b5563', marginBottom: '15px' }}>
                                    You have <strong>{round2Questions.length}</strong> coding problems in Round 2.
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => setActiveTab('round2-delete')}
                                    disabled={round2Questions.length === 0}
                                    style={{ width: '100%' }}
                                >
                                    Manage Round 2 Delete
                                </button>
                            </div>

                            {/* Delete All Data */}
                            <div style={{
                                background: '#000000',
                                border: '2px solid #ffffff',
                                borderRadius: '10px',
                                padding: '20px',
                                color: 'white'
                            }}>
                                <h4 style={{ color: '#ffffff', marginBottom: '15px' }}>
                                    ⚠️ DANGER ZONE
                                </h4>
                                <p style={{ color: '#9ca3af', marginBottom: '15px' }}>
                                    Delete ALL questions from both rounds. This cannot be undone!
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteAllQuestions}
                                    style={{ width: '100%' }}
                                >
                                    DELETE EVERYTHING
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Problem Card Component for Round 2
function ProblemCard({ question, index, onDelete }) {
    const [showFull, setShowFull] = useState(false);

    return (
        <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px',
            background: '#f9fafb'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '10px' }}>
                        <span style={{
                            background: question.difficulty === 'easy' ? '#10b981' :
                                question.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginRight: '10px'
                        }}>
                            {question.difficulty?.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{question.title}</span>
                    </div>

                    <p style={{ margin: '10px 0', color: '#4b5563' }}>
                        {showFull
                            ? question.problem_statement
                            : (question.problem_statement?.substring(0, 200) + '...')}
                    </p>

                    {question.problem_statement?.length > 200 && (
                        <button
                            onClick={() => setShowFull(!showFull)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4f46e5',
                                cursor: 'pointer',
                                fontSize: '14px',
                                textDecoration: 'underline',
                                marginBottom: '10px'
                            }}
                        >
                            {showFull ? 'Show less' : 'Read more'}
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
                        <span>⚡ Points: {question.points}</span>
                        <span>⏱️ Time: {question.time_limit} min</span>
                        <span>🧪 Tests: {question.test_cases?.length || 0}</span>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(question.id)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '5px'
                    }}
                    title="Delete Question"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

export default AdminPanel;