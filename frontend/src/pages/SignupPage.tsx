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
      <form onSubmit={handleSubmit} className="space-y-4 text-left font-mono-code text-xs">
        {error && (
          <div className="bg-[var(--red)]/5 border border-[var(--red)]/35 text-[var(--red)] px-3 py-2.5 rounded font-bold">
            ⚠️ {error}
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; FULL_NAME
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your Name"
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-[var(--cyan)] rounded text-xs text-[var(--text-primary)] outline-none"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; EMAIL_ADDRESS
          </label>
          <input
            id="email"
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
          <label htmlFor="role" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; DATABASE_ROLE
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-[var(--cyan)] rounded text-xs text-[var(--text-primary)] outline-none cursor-pointer"
            disabled={loading}
          >
            <option value="Student">Student</option>
            <option value="Developer">Developer</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="Admin">Admin</option>
            <option value="Business User">Business User</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; PASSWORD
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••• (min 6 chars)"
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] focus:border-[var(--cyan)] rounded text-xs text-[var(--text-primary)] outline-none"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="block font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            &gt; CONFIRM_PASSWORD
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Compiling credentials...' : 'Execute Sign Up'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-[11px] border-t border-[var(--border-subtle)] pt-4 font-mono-code">
        <span className="text-[var(--text-muted)]">Already registered?</span>{' '}
        <Link to="/login" className="font-bold text-[var(--cyan)] hover:text-[var(--cyan-bright)] transition-colors">
          Sign in instead
        </Link>
      </div>
    </AuthLayout>
  );
};
export default SignupPage;
