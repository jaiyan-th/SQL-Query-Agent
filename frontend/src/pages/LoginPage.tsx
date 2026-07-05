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
      <form onSubmit={handleSubmit} className="space-y-6 text-left font-mono-code text-[11px]">
        {error && (
          <div className="bg-[#EC5F5B]/10 border border-[#EC5F5B]/30 text-[#EC5F5B] px-3 py-2.5 rounded font-bold">
            ⚠️ {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; EMAIL_ADDRESS
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; PASSWORD
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-[#0E1116] font-bold rounded shadow-[0_0_15px_rgba(139,124,246,0.35)] transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing login_session...' : 'Execute Sign In'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-[10px] border-t border-[#2A303C] pt-4 font-mono-code">
        <span className="text-slate-500">New database analyst?</span>{' '}
        <Link to="/signup" className="font-bold text-[#4FD1C5] hover:text-[#4FD1C5]/85 transition-colors">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
};
