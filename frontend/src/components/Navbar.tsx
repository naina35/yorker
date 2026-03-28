import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 py-4 bg-[#042C53]/95 backdrop-blur border-b border-white/10">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-2xl">🏏</span>
        <span className="font-display text-2xl text-white tracking-tight">Yorker</span>
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/leagues" className="text-blue-100 hover:text-white text-sm font-medium transition-colors">
          Leagues
        </Link>
        {user && (
          <>
            <Link to="/my-team" className="text-blue-100 hover:text-white text-sm font-medium transition-colors">
              My Team
            </Link>
            <Link
              to={`/profile/${user.id}`}
              className="text-blue-100 hover:text-white text-sm font-medium transition-colors"
            >
              {user.name}
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs px-4 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all"
            >
              Sign out
            </button>
          </>
        )}
        {!user && (
          <Link
            to="/login"
            className="text-xs px-4 py-2 rounded-full bg-[--blue-400] text-white hover:bg-[--blue-600] transition-all"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}