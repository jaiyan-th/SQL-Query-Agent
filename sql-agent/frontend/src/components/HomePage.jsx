import React from 'react'
import {
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Database,
  BarChart3,
  Sparkles,
  Users,
} from 'lucide-react'
import { Mark } from './Sidebar'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80'

export default function HomePage({ onOpenAuth }) {
  return (
    <div className="home-screen-wrap">
      {/* Full-width Navigation */}
      <header className="home-full-nav">
        <div className="home-brand">
          <Mark />
          <span className="home-brand-text">SQL Query Agent</span>
        </div>

        <nav className="home-nav-center">
          <span className="nav-tag">
            <Database size={13} /> Neon PostgreSQL
          </span>
          <span className="nav-tag security">
            <LockKeyhole size={12} /> 100% Read-Only
          </span>
        </nav>

        <div className="home-nav-actions" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="home-nav-link"
            onClick={() => onOpenAuth('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="home-nav-btn"
            onClick={() => onOpenAuth('signup')}
          >
            <span>Sign up</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Full-Screen Immersive Hero */}
      <section className="home-full-hero">
        <div className="hero-grid-full">
          {/* Left Column: Clear Value Proposition */}
          <div className="hero-text-pane">
            <div className="hero-pill-tag">
              <Sparkles size={14} />
              <span>Enterprise Business Intelligence</span>
            </div>

            <h1 className="hero-main-title">
              Instant business insights from your database in <em>plain English</em>.
            </h1>

            <p className="hero-main-desc">
              Empower your product, analytics, and leadership teams to query live PostgreSQL and SQLite data
              without writing manual queries. Every answer includes verifiable source SQL, interactive charts, and guaranteed read-only safety.
            </p>

            <div className="hero-btn-row">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => onOpenAuth('signup')}
              >
                <span>Launch Workspace Free</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn-hero-outline"
                onClick={() => onOpenAuth('login')}
              >
                <span>Sign in to Account</span>
              </button>
            </div>

            <div className="hero-stats-strip">
              <div className="stat-unit">
                <strong>100%</strong>
                <span>Read-Only Protected</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-unit">
                <strong>PostgreSQL</strong>
                <span>Managed on Neon</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-unit">
                <strong>Plain English</strong>
                <span>Natural Language to SQL</span>
              </div>
            </div>
          </div>

          {/* Right Column: Business Meetup & Team Collaboration Visual */}
          <div className="hero-visual-pane">
            <div className="business-visual-card">
              <img
                src={HERO_IMAGE}
                alt="Business analytics team collaborating over laptops"
                className="business-photo"
                loading="eager"
              />
              <div className="visual-overlay-gradient"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-width Features Section */}
      <section className="home-wide-section">
        <div className="section-head-full">
          <span className="section-kicker">Core Capabilities</span>
          <h2>Everything your business needs to explore data safely</h2>
        </div>

        <div className="features-quad-grid">
          <div className="quad-card">
            <div className="quad-icon"><Users size={20} /></div>
            <h3>Self-Serve Team Analytics</h3>
            <p>Anyone on your team can ask questions in conversational English and receive accurate tabular and plotted results.</p>
          </div>

          <div className="quad-card">
            <div className="quad-icon"><ShieldCheck size={20} /></div>
            <h3>Guaranteed Read-Only Safety</h3>
            <p>AST analysis via sqlglot blocks all write, alter, or drop statements. Transactions are restricted to session-level read-only mode.</p>
          </div>

          <div className="quad-card">
            <div className="quad-icon"><BarChart3 size={20} /></div>
            <h3>Automated Visualizations</h3>
            <p>Chronological date trends automatically format as line series, while categorical distributions render as bar charts.</p>
          </div>

          <div className="quad-card">
            <div className="quad-icon"><Database size={20} /></div>
            <h3>Serverless Neon PostgreSQL</h3>
            <p>Production database connection pooling, user credential storage, and seamless disconnect/connect options built in.</p>
          </div>
        </div>
      </section>

      {/* Full-width Footer */}
      <footer className="home-wide-footer">
        <div className="footer-content-full">
          <div className="footer-left">
            <Mark />
            <strong>SQL Query Agent</strong>
            <span>· Natural Language Business Analytics</span>
          </div>
          <div className="footer-right">
            <span>AI-Powered Natural Language Analytics · Neon PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
