import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import LoginPage from './components/LoginPage';
import TeamRegistration from './components/TeamRegistration';
import Dashboard from './components/Dashboard';
import Round1Quiz from './components/Round1Quiz';
import Round2CodingPlatform from './components/Round2CodingPlatform';
import ResultPage from './components/ResultPage';
import AdminPanel from './components/AdminPanel';
import Round2AddQuestion from './components/Round2AddQuestion';
import CodeEditor from './components/CodeEditor';
import Leaderboard from './components/Leaderboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Team Routes */}
          <Route path="/register" element={<TeamRegistration />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Round 1 Routes */}
          <Route path="/round1" element={<Round1Quiz />} />
          
          {/* Round 2 Routes */}
          <Route path="/round2" element={<Round2CodingPlatform />} />
          <Route path="/round2/question/:questionId" element={<Round2CodingPlatform />} />
          
          {/* Results Route - supports both rounds */}
          <Route path="/results" element={<ResultPage />} />
          
          {/* Leaderboard Route */}
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/round2/add" element={<Round2AddQuestion />} />
          
          {/* Code Editor Route (for testing) */}
          <Route path="/editor" element={<CodeEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;