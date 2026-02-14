// Round2Results.js
import React from 'react';

function Round2Results({ results, totalScore, maxScore }) {
    const getDifficultyColor = (difficulty) => {
        switch(difficulty) {
            case 'Easy': return '#10b981';
            case 'Medium': return '#f59e0b';
            case 'Hard': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div className="round2-results">
            <div className="score-overview" style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '30px',
                color: 'white',
                textAlign: 'center'
            }}>
                <h3 style={{ marginBottom: '15px', opacity: 0.9 }}>Round 2 Completed!</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>
                    {totalScore}/{maxScore}
                </div>
                <div style={{ fontSize: '18px' }}>
                    {((totalScore / maxScore) * 100).toFixed(1)}% Overall
                </div>
            </div>

            <div className="problems-breakdown">
                <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Problem-wise Performance</h3>
                
                {results.map((problem, index) => (
                    <div key={index} style={{
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '15px 20px',
                            background: '#f9fafb',
                            borderBottom: '2px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: getDifficultyColor(problem.difficulty),
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {problem.difficulty}
                                </span>
                                <span style={{ fontWeight: '600' }}>{problem.title}</span>
                            </div>
                            <span style={{
                                fontWeight: 'bold',
                                color: problem.score === problem.maxScore ? '#10b981' : '#f59e0b'
                            }}>
                                {problem.score}/{problem.maxScore}
                            </span>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '15px'
                            }}>
                                {problem.testResults.map((test, idx) => (
                                    <div key={idx} style={{
                                        padding: '12px',
                                        border: '2px solid',
                                        borderColor: test.passed ? '#10b981' : '#ef4444',
                                        borderRadius: '8px',
                                        background: test.passed ? '#f0fdf4' : '#fef2f2'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                            fontSize: '13px'
                                        }}>
                                            <span style={{ fontWeight: 'bold' }}>
                                                Test #{idx + 1}
                                                {test.is_hidden && ' 🔒'}
                                            </span>
                                            <span style={{
                                                color: test.passed ? '#059669' : '#dc2626',
                                                fontWeight: 'bold'
                                            }}>
                                                {test.passed ? '✓' : '✗'}
                                            </span>
                                        </div>
                                        {!test.is_hidden && (
                                            <>
                                                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                                    <span style={{ color: '#6b7280' }}>Expected:</span> {test.expected_output}
                                                </div>
                                                <div style={{ fontSize: '12px' }}>
                                                    <span style={{ color: '#6b7280' }}>Got:</span> {test.actual_output}
                                                </div>
                                            </>
                                        )}
                                        <div style={{
                                            marginTop: '8px',
                                            fontSize: '11px',
                                            color: '#9ca3af',
                                            borderTop: '1px solid #e5e7eb',
                                            paddingTop: '5px'
                                        }}>
                                            Time: {test.execution_time}ms | Score: {test.passed ? test.score : 0}/{test.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Round2Results;