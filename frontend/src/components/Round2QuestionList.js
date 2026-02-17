// Round2QuestionList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Round2QuestionList = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('https://codehunt-backend-xo52.onrender.com/api/round2/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setQuestions(response.data);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading questions...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Round 2 - Select a Question</h1>
            <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                {questions.map(q => (
                    <div
                        key={q.id}
                        onClick={() => navigate(`/round2/question/${q.id}`)}
                        style={{
                            padding: '20px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: '#f9fafb',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                        <h3>{q.title}</h3>
                        <p>Difficulty: {q.difficulty}</p>
                        <p>Points: {q.points}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Round2QuestionList;