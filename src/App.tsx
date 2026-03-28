import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import Pomodoro from './pages/Pomodoro';
import { FocusProvider } from './FocusContext';
import './App.css';

function App() {
  return (
    <FocusProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/todo" element={<Tasks />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/focus" element={<Pomodoro />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </FocusProvider>
  );
}

export default App;
