import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/leagues', icon: '🏆', label: 'Leagues' },
  { to: '/my-team', icon: '👥', label: 'Team' },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const items = user
    ? [...navItems, { to: `/profile/${user.id}`, icon: '👤', label: 'Profile' }]
    : [...navItems, { to: '/login', icon: '👤', label: 'Sign In' }];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#042C53]/95 backdrop-blur border-t border-white/10 flex">
      {items.map(({ to, icon, label }) => {
        const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all ${
              active ? 'text-white' : 'text-blue-300/60 hover:text-blue-200'
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span className={`text-[10px] font-medium ${active ? 'text-[var(--blue-400)]' : ''}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}