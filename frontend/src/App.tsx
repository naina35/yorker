import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Leagues from './pages/Leagues';
import LeagueDetail from './pages/LeagueDetail';
import Match from './pages/Match';
import MyTeam from './pages/MyTeam';
import TeamDetail from './pages/TeamDetail';
import Profile from './pages/Profile';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[var(--blue-900)]">
            <Navbar />
            <div className="md:pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/leagues" element={<Leagues />} />
                <Route path="/leagues/:id" element={<LeagueDetail />} />
                <Route path="/matches/:id" element={<Match />} />
                <Route path="/my-team" element={<MyTeam />} />
                <Route path="/teams/:id" element={<TeamDetail />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
            <BottomNav />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}