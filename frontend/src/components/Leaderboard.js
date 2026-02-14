// Leaderboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [round2Leaderboard, setRound2Leaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState('overall');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // Fetch overall leaderboard (Round 1 + Round 2)
            const overallResponse = await axios.get('http://localhost:3001/api/round2/leaderboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setLeaderboard(overallResponse.data);

            // Fetch Round 2 specific leaderboard
            const round2Response = await axios.get('http://localhost:3001/api/round2/leaderboard/round2', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRound2Leaderboard(round2Response.data);

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setError('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const getMedalEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getRowStyle = (rank) => {
        if (rank === 1) return { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white' };
        if (rank === 2) return { background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)', color: 'white' };
        if (rank === 3) return { background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white' };
        return {};
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '20px', color: '#6b7280' }}>Loading leaderboard...</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h1>🏆 Code Hunt Leaderboard</h1>
                <p>Top performing teams across both rounds</p>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            <div className="leaderboard-tabs">
                <button
                    className={`leaderboard-tab ${activeTab === 'overall' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overall')}
                >
                    Overall (Round 1 + Round 2)
                </button>
                <button
                    className={`leaderboard-tab ${activeTab === 'round2' ? 'active' : ''}`}
                    onClick={() => setActiveTab('round2')}
                >
                    Round 2 Only
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/dashboard')}
                    style={{ marginLeft: 'auto' }}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {activeTab === 'overall' && (
                <div className="table-container">
                    {leaderboard.length === 0 ? (
                        <div className="alert alert-info">No results yet</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Team</th>
                                    <th>College</th>
                                    <th>Round 1</th>
                                    <th>Round 2</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((team) => (
                                    <tr key={team.rank} style={getRowStyle(team.rank)}>
                                        <td style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                            {getMedalEmoji(team.rank)}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{team.team_name}</div>
                                            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lead: {team.leader_name}</div>
                                        </td>
                                        <td>{team.college_name}</td>
                                        <td style={{ textAlign: 'center' }}>{team.round1_score}/20</td>
                                        <td style={{ textAlign: 'center' }}>{team.round2_score}/30</td>
                                        <td style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                            {team.total_score}/50
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                background: team.status === 'Completed' ? '#d1fae5' : 
                                                           team.status.includes('Progress') ? '#fef3c7' : '#fee2e2',
                                                color: team.status === 'Completed' ? '#065f46' :
                                                       team.status.includes('Progress') ? '#92400e' : '#991b1b'
                                            }}>
                                                {team.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'round2' && (
                <div className="table-container">
                    {round2Leaderboard.length === 0 ? (
                        <div className="alert alert-info">No Round 2 results yet</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Team</th>
                                    <th>College</th>
                                    <th>Score</th>
                                    <th>Problems Solved</th>
                                    <th>Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {round2Leaderboard.map((team) => (
                                    <tr key={team.rank} style={getRowStyle(team.rank)}>
                                        <td style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                            {getMedalEmoji(team.rank)}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{team.team_name}</div>
                                            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lead: {team.leader_name}</div>
                                        </td>
                                        <td>{team.college_name}</td>
                                        <td style={{ fontWeight: 'bold' }}>{team.round2_score}/30</td>
                                        <td style={{ textAlign: 'center' }}>{team.questions_attempted || 0}/3</td>
                                        <td>
                                            {team.end_time ? (
                                                new Date(team.end_time).toLocaleDateString()
                                            ) : (
                                                <span style={{ color: '#f59e0b' }}>In Progress</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <div style={{
                marginTop: '30px',
                padding: '20px',
                background: '#f3f4f6',
                borderRadius: '10px',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                <p>🏆 Total Prize Pool: Exciting Prizes for Top 3 Teams</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>
                    * Scores are updated in real-time as teams complete challenges
                </p>
            </div>
        </div>
    );
}

export default Leaderboard;