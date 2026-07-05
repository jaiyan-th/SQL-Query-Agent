import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signup(fullName, email, password, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Register schema privileges and token identifiers"
      filename="auth_signup.sh"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left font-mono-code text-[11px]">
        {error && (
          <div className="bg-[#EC5F5B]/10 border border-[#EC5F5B]/30 text-[#EC5F5B] px-3 py-2.5 rounded font-bold">
            ⚠️ {error}
          </div>
        )}
        
        <div>
          <label htmlFor="fullName" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; FULL_NAME
          </label>
          <div className="mt-1">
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jaiyanth B"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; EMAIL_ADDRESS
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jaiyanth@example.com"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; DATABASE_ROLE
          </label>
          <div className="mt-1">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            >
              <option value="Student">Student</option>
              <option value="Developer">Developer</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Admin">Admin</option>
              <option value="Business User">Business User</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; PASSWORD
          </label>
          <div className="mt-1">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 6 characters)"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            &gt; CONFIRM_PASSWORD
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#0E1116] border border-[#2A303C] rounded focus:outline-none focus:ring-1 focus:ring-[#4FD1C5] text-[11px] text-[#F3F1EA] shadow-inner"
              disabled={loading}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 bg-[#8B7CF6] hover:bg-[#8B7CF6]/90 text-[#0E1116] font-bold rounded shadow-[0_0_15px_rgba(139,124,246,0.35)] transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Compiling credentials...' : 'Execute Sign Up'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-[10px] border-t border-[#2A303C] pt-4 font-mono-code">
        <span className="text-slate-500">Already registered?</span>{' '}
        <Link to="/login" className="font-bold text-[#4FD1C5] hover:text-[#4FD1C5]/85 transition-colors">
          Sign in instead
        </Link>
      </div>
    </AuthLayout>
  );
};
