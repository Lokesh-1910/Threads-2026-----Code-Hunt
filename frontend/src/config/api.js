// frontend/src/config/api.js

// Determine API URL based on environment
const getApiUrl = () => {
    // For production (Vercel)
    if (process.env.NODE_ENV === 'production') {
        return 'https://codehunt-backend-xo52.onrender.com';
    }
    // For development (localhost)
    return 'http://localhost:3001';
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getApiUrl(); // Same URL for socket.io

// Helper function for API calls
export const api = {
    get: (endpoint) => {
        return fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json());
    },
    post: (endpoint, data) => {
        return fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json());
    },
    // For axios users
    axiosInstance: axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json'
        }
    })
};