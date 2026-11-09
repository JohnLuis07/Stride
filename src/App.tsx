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
import DeadlineReminders from './components/DeadlineReminders';
import { SessionGate } from './Session';
import Allowance from './pages/Allowance';
import VideoStudio from './pages/VideoStudio';

function App() {
  return (
    <FocusProvider>
      <Router>
        <DeadlineReminders />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <SessionGate>
                <Dashboard />
              </SessionGate>
            }
          />
          <Route
            path="/notes"
            element={
              <SessionGate>
                <Notes />
              </SessionGate>
            }
          />
          <Route
            path="/calendar"
            element={
              <SessionGate>
                <Calendar />
              </SessionGate>
            }
          />
          <Route
            path="/todo"
            element={
              <SessionGate>
                <Tasks />
              </SessionGate>
            }
          />
          <Route
            path="/goals"
            element={
              <SessionGate>
                <Goals />
              </SessionGate>
            }
          />
          <Route
            path="/focus"
            element={
              <SessionGate>
                <Pomodoro />
              </SessionGate>
            }
          />
          <Route
            path="/allowance"
            element={
              <SessionGate>
                <Allowance />
              </SessionGate>
            }
          />
          <Route
            path="/videos"
            element={
              <SessionGate>
                <VideoStudio />
              </SessionGate>
            }
          />
          <Route
            path="/profile"
            element={
              <SessionGate>
                <Profile />
              </SessionGate>
            }
          />
        </Routes>
      </Router>
    </FocusProvider>
  );
}

export default App;
