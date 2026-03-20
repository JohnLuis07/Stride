import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Notes } from './pages/Notes';
import { Pomodoro } from './pages/Pomodoro';
import { Tasks } from './pages/Tasks';
import { Strategies } from './pages/Strategies';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/strategies" element={<Strategies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
