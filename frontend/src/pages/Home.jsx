
import FlowingBackground from "../components/FlowingBackground";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <FlowingBackground />

      {/* Navigation */}
      <nav className="home-nav">
        <div className="home-logo">
          <span className="logo-icon">P</span>
          <span>
            pathwise<span className="logo-ai"> AI</span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#journey">How it works</a>
        </div>

        <button
          className="nav-button"
          onClick={() => navigate("/login")}
        >
          Get Started <span>↗</span>
        </button>
      </nav>

      {/* Hero */}
      <main>
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-label">
              <span className="status-dot"></span>
              YOUR PERSONAL AI LEARNING COMPANION
            </div>

            <h1>
              Learn smarter.
              <br />
              <span>Grow faster.</span>
              <br />
              Go further.
            </h1>

            <p className="hero-description">
              Your learning journey shouldn't look like everyone else's.
              Pathwise AI understands your strengths, identifies your gaps,
              and builds a learning path designed around you.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => navigate("/login")}
              >
                Start your journey <span>→</span>
              </button>

              <a href="#journey" className="secondary-button">
                Discover how it works
              </a>
            </div>

            <div className="hero-note">
              <span>✦</span> A learning experience built around YOU.
            </div>
          </div>

          {/* Journey Preview */}
          <div className="hero-visual">
            <div className="visual-glow"></div>

            <div className="journey-card">
              <div className="card-top">
                <div>
                  <span className="card-eyebrow">
                    YOUR LEARNING JOURNEY
                  </span>
                  <h3>Progress with purpose.</h3>
                </div>
                <span className="card-menu">•••</span>
              </div>

              <div className="journey-progress">
                <div className="progress-ring">
                  <div className="ring-inner">
                    <strong>01</strong>
                    <span>START</span>
                  </div>
                </div>

                <div className="progress-info">
                  <strong>Discover your potential</strong>
                  <span>Understand where you stand.</span>
                  <span className="progress-tag">
                    PERSONALISED FOR YOU
                  </span>
                </div>
              </div>

              <div className="journey-steps">
                <div className="journey-step active">
                  <span className="step-number">01</span>
                  <div>
                    <strong>Assess</strong>
                    <small>Discover your skills</small>
                  </div>
                  <span className="step-arrow">↗</span>
                </div>

                <div className="journey-step">
                  <span className="step-number">02</span>
                  <div>
                    <strong>Personalise</strong>
                    <small>Build your learning path</small>
                  </div>
                  <span className="step-arrow">↗</span>
                </div>

                <div className="journey-step">
                  <span className="step-number">03</span>
                  <div>
                    <strong>Learn & Practise</strong>
                    <small>Build real understanding</small>
                  </div>
                  <span className="step-arrow">↗</span>
                </div>

                <div className="journey-step">
                  <span className="step-number">04</span>
                  <div>
                    <strong>Adapt & Grow</strong>
                    <small>Track your progress</small>
                  </div>
                  <span className="step-arrow">↗</span>
                </div>
              </div>

              <div className="card-footer">
                <span>✦</span> YOUR PATH. YOUR PACE. YOUR POTENTIAL.
              </div>
            </div>

            <div className="floating-note">
              <span className="floating-icon">✦</span>
              <div>
                <strong>Built around you</strong>
                <small>Not a one-size-fits-all plan.</small>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="section-label">WHY PATHWISE AI</span>
            <h2>
              More than learning.
              <span> A direction.</span>
            </h2>
            <p>
              Turn scattered studying into a structured journey of growth.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon">◎</span>
              <h3>Know your strengths</h3>
              <p>
                Understand your current skill levels and discover
                where you need to improve.
              </p>
              <span className="feature-number">01 / ASSESS</span>
            </div>

            <div className="feature-card">
              <span className="feature-icon">⌘</span>
              <h3>Your own roadmap</h3>
              <p>
                Get a personalised learning plan based on your
                goals, skills and available time.
              </p>
              <span className="feature-number">
                02 / PERSONALISE
              </span>
            </div>

            <div className="feature-card">
              <span className="feature-icon">↗</span>
              <h3>Progress that adapts</h3>
              <p>
                Practise, measure mastery and adapt your learning
                journey as you improve.
              </p>
              <span className="feature-number">03 / GROW</span>
            </div>
          </div>
        </section>

        {/* Learning Journey */}
        <section className="journey-section" id="journey">
          <span className="section-label">THE PATHWISE METHOD</span>
          <h2>Six stages. One direction.</h2>

          <div className="journey-line">
            {[
              "Assess",
              "Personalise",
              "Learn",
              "Practise",
              "Adapt",
              "Demonstrate",
            ].map((stage, index) => (
              <div className="journey-line-item" key={stage}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-logo">
          <span className="logo-icon">P</span>
          <span>
            pathwise<span className="logo-ai"> AI</span>
          </span>
        </div>

        <p>Learn with direction. Grow with purpose.</p>
        <span>© 2026 Pathwise AI</span>
      </footer>
    </div>
  );
}

export default Home;
