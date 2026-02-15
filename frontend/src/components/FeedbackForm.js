// FeedbackForm.js
import React, { useState } from 'react';
import axios from 'axios';

function FeedbackForm({ round, sessionId, onSubmit }) {
    const [feedback, setFeedback] = useState('');
    const [rating, setRating] = useState(5);
    const [difficulty, setDifficulty] = useState('medium');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://codehunt-backend-xo52.onrender.com/api/feedback/submit', {
                round,
                sessionId,
                feedback,
                rating,
                difficulty,
                timestamp: new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSubmitted(true);
            if (onSubmit) onSubmit({ rating, difficulty, feedback });

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="alert alert-success" style={{ textAlign: 'center', padding: '30px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>🙏</span>
                <h3 style={{ color: '#065f46', marginBottom: '10px' }}>Thank You!</h3>
                <p>Your feedback helps us improve Code Hunt.</p>
            </div>
        );
    }

    return (
        <div className="feedback-form">
            <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
                {round === 1 ? '📝 Round 1 Feedback' : '💻 Round 2 Feedback'}
            </h3>

            <form onSubmit={handleSubmit}>
                {/* Rating Stars */}
                <div className="input-group">
                    <label>How would you rate this round?</label>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '15px 0' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '30px',
                                    cursor: 'pointer',
                                    color: star <= rating ? '#fbbf24' : '#d1d5db',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty */}
                <div className="input-group">
                    <label>How difficult was this round?</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px'
                        }}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="very_hard">Very Hard</option>
                    </select>
                </div>

                {/* Feedback Text */}
                <div className="input-group">
                    <label>Your feedback (optional)</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us about your experience... What went well? What could be improved?"
                        rows="4"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: loading ? '#9ca3af' : '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>
        </div>
    );
}

export default FeedbackForm;