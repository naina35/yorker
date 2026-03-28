import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="px-4 pt-8 pb-24 max-w-2xl mx-auto">
      <div className="text-center py-12">
        <span className="text-7xl block mb-4">🏏</span>
        <h1 className="font-display text-4xl text-white mb-3">Yorker</h1>
        <p className="text-blue-300/60 text-lg mb-8">Take your cricket team to new heights</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/leagues" className="px-6 py-3 rounded-xl bg-[var(--blue-400)] text-white font-medium hover:bg-[var(--blue-600)] transition-all">
            Browse Leagues
          </Link>
          {!user ? (
            <Link to="/register" className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
              Get Started
            </Link>
          ) : (
            <Link to="/my-team" className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
              My Team
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {[
          { icon: '👥', title: 'Build Your Squad', desc: 'Create a team and manage your players' },
          { icon: '🏆', title: 'Join a League', desc: 'Compete in organized tournaments near you' },
          { icon: '📊', title: 'Track Stats', desc: 'Batting averages, wickets, and more' },
          { icon: '⚡', title: 'Live Scores', desc: 'Real-time updates during matches' },
        ].map(f => (
          <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <span className="text-3xl">{f.icon}</span>
            <h3 className="font-display text-white mt-2 text-base">{f.title}</h3>
            <p className="text-blue-300/50 text-sm mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}