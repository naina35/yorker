import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🏏</span>
          <h1 className="font-display text-3xl text-white mt-3">Join Yorker</h1>
          <p className="text-blue-300/60 mt-1">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          {[
            { label: 'Name', value: name, set: setName, type: 'text', placeholder: 'Virat Kohli' },
            { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'you@email.com' },
            { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-blue-300/70 text-xs font-medium uppercase tracking-wide block mb-1.5">{f.label}</label>
              <input
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-300/30 focus:outline-none focus:border-[var(--blue-400)]/60 transition-colors"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--blue-400)] hover:bg-[var(--blue-600)] text-white font-medium transition-all disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-blue-300/40 text-sm mt-4">
          Already have an account? <Link to="/login" className="text-[var(--blue-400)] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}