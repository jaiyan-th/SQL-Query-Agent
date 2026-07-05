import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="User Sign-in"
      subtitle="Verify credentials to allocate JWT token session"
      filename="auth_login.sh"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-left font-mono-code text-xs">
        {error && (
          <div className="bg-[var(--red)]/5 border border-[var(--red)]/35 text-[var(--red)] px-3 py-2.5 rounded font-bold">
            ⚠️ {error}
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; EMAIL_ADDRESS
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-[var(--cyan)] rounded text-xs text-[var(--text-primary)] outline-none"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; PASSWORD
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-[var(--cyan)] rounded text-xs text-[var(--text-primary)] outline-none"
            disabled={loading}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 bg-[var(--cyan)] hover:bg-[var(--cyan-bright)] text-[#062A28] font-bold rounded shadow-[0_0_15px_rgba(83,214,204,0.25)] border-none cursor-pointer transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing login_session...' : 'Execute Sign In'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-[11px] border-t border-[var(--border-subtle)] pt-4 font-mono-code">
        <span className="text-[var(--text-muted)]">New database analyst?</span>{' '}
        <Link to="/signup" className="font-bold text-[var(--cyan)] hover:text-[var(--cyan-bright)] transition-colors">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
};
export default LoginPage;
