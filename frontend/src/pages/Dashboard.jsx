
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");
const formatPercentage = (value) =>
  `${Number(value || 0).toFixed(1)}%`;

const formatDate = (value) => {
  if (!value) return "Previous attempt";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Previous attempt";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatShortDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

function Dashboard() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [curriculumError, setCurriculumError] = useState("");
  const [quizHistory, setQuizHistory] = useState([]);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [assessmentError, setAssessmentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(null);
  const [activeNav, setActiveNav] = useState("overview");

  const savedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("pathwise_user") || "{}");
    } catch {
      return {};
    }
  })();

  const firstName =
    student?.name?.trim().split(" ")[0] || "Learner";

  const handleSignOut = () => {
    localStorage.removeItem("pathwise_token");
    localStorage.removeItem("pathwise_user");
    navigate("/login");
  };

  const scrollToSection = (id, navName) => {
    setActiveNav(navName);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("pathwise_token");

      if (!token) {
        navigate("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const response = await fetch(`${API_URL}/onboarding/me`, {
          headers,
        });

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("pathwise_token");
          localStorage.removeItem("pathwise_user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load your learning profile."
          );
        }

        setStudent(data);

        const requests = await Promise.allSettled([
          data.branch
            ? fetch(`${API_URL}/curriculum/me`, { headers })
            : Promise.resolve(null),

          fetch(`${API_URL}/students/${data.id}/quiz/history`, {
            headers,
          }),

          fetch(`${API_URL}/students/${data.id}/assessment/history`, {
            headers,
          }),

          fetch(`${API_URL}/students/${data.id}/dashboard`, {
            headers,
          }),
        ]);

        // CURRICULUM
        if (
          requests[0].status === "fulfilled" &&
          requests[0].value
        ) {
          const result = requests[0].value;

          if (result.ok) {
            setCurriculum(await result.json());
          } else {
            setCurriculumError("Unable to load your curriculum.");
          }
        }

        // QUIZ HISTORY
        if (requests[1].status === "fulfilled") {
          const result = requests[1].value;

          if (result.ok) {
            const quizData = await result.json();

            setQuizHistory(
              Array.isArray(quizData.attempts)
                ? quizData.attempts
                : []
            );
          }
        }

        // ASSESSMENT HISTORY
        if (requests[2].status === "fulfilled") {
          const result = requests[2].value;

          if (result.ok) {
            const assessmentData = await result.json();

            setAssessmentHistory(
              Array.isArray(assessmentData.assessments)
                ? assessmentData.assessments
                : []
            );
          } else {
            setAssessmentError(
              "Assessment history is currently unavailable."
            );
          }
        } else {
          setAssessmentError("Unable to load assessment history.");
        }

        // AI DASHBOARD DATA
        if (requests[3].status === "fulfilled") {
          const result = requests[3].value;

          if (result.ok) {
            setDashboardData(await result.json());
          } else {
            const errorData = await result.json().catch(() => ({}));

            setDashboardError(
              errorData.detail ||
                "Personalized advice is temporarily unavailable."
            );
          }
        } else {
          setDashboardError(
            "Unable to connect to personalized learning advice."
          );
        }
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  // ASSEMBLE-STYLE SCROLL REVEALS
  useEffect(() => {
    if (loading) return;

    const targets = document.querySelectorAll(
      ".dashboard-reveal:not(.is-visible), .dashboard-inview:not(.is-visible)"
    );

    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) =>
        element.classList.add("is-visible")
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -35px 0px",
      }
    );

    targets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [
    loading,
    student,
    quizHistory,
    assessmentHistory,
    curriculum,
    dashboardData,
  ]);

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-loader" />
          <p>Preparing your learning space...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-error">
          <span className="dashboard-eyebrow">PATHWISE AI</span>
          <h1>We couldn't load your dashboard.</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!student) return null;

  // QUIZ ANALYTICS
  const scoredAttempts = quizHistory
    .map((attempt) => {
      const correct = Number(attempt.score);
      const total = Number(attempt.total_questions);

      if (
        !Number.isFinite(correct) ||
        !Number.isFinite(total) ||
        total <= 0
      ) {
        return null;
      }

      return {
        ...attempt,
        percentage: Math.max(
          0,
          Math.min(100, (correct / total) * 100)
        ),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(a.created_at || 0) -
        new Date(b.created_at || 0)
    );

  const totalAttempts = scoredAttempts.length;

  const averageScore = totalAttempts
    ? scoredAttempts.reduce(
        (total, attempt) => total + attempt.percentage,
        0
      ) / totalAttempts
    : 0;

  const bestScore = totalAttempts
    ? Math.max(...scoredAttempts.map((item) => item.percentage))
    : 0;

  const recentAttempts = scoredAttempts.slice(-6);
  const latestAttempts = [...recentAttempts].reverse();

  const chartPoints = recentAttempts.map((attempt, index) => ({
    ...attempt,
    x:
      recentAttempts.length === 1
        ? 300
        : 44 + (index * 512) / (recentAttempts.length - 1),
    y: 180 - attempt.percentage * 1.6,
    chartIndex: index,
  }));

  const linePath = chartPoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = chartPoints.length
    ? `${linePath} L ${
        chartPoints[chartPoints.length - 1].x
      } 180 L ${chartPoints[0].x} 180 Z`
    : "";

  const selectedChartPoint =
    chartPoints.length > 0
      ? chartPoints[
          selectedChartIndex === null
            ? chartPoints.length - 1
            : Math.min(selectedChartIndex, chartPoints.length - 1)
        ]
      : null;

  // LATEST ASSESSMENT
  const latestAssessment = assessmentHistory[0] || null;

  const skillEntries = Object.entries(
    latestAssessment?.skill_levels || {}
  );

  const confidenceEntries = Object.entries(
    latestAssessment?.confidence_levels || {}
  );

  // COMBINE SKILLS AND CONFIDENCE FOR GRAPH 2
  const skillComparison = Array.from(
    new Set([
      ...skillEntries.map(([skill]) => skill),
      ...confidenceEntries.map(([skill]) => skill),
    ])
  ).map((skill) => {
    const skillValue = Number(
      latestAssessment?.skill_levels?.[skill] ?? 0
    );

    const confidenceValue = Number(
      latestAssessment?.confidence_levels?.[skill] ?? 0
    );

    return {
      skill,
      skillLevel: Math.max(0, Math.min(5, skillValue)),
      confidence: Math.max(0, Math.min(5, confidenceValue)),
    };
  });

  // CURRICULUM
  const totalCourses = Number(curriculum?.total_courses || 0);
  const completedCourses = Number(
    curriculum?.completed_courses || 0
  );

  const completionPercentage = Math.max(
    0,
    Math.min(100, Number(curriculum?.completion_percent || 0))
  );

  const semesters = Array.isArray(curriculum?.semesters)
    ? curriculum.semesters
    : [];

  // AI ADVICE
  const aiAdvice = dashboardData?.ai_advice || {};

  const aiAdviceText =
    aiAdvice.text ||
    aiAdvice.message ||
    "Complete your assessment to receive personalized advice based on your performance and interests.";

  const aiFocusAreas = Array.isArray(aiAdvice.focus_areas)
    ? aiAdvice.focus_areas
    : [];

  const aiInterests = Array.isArray(aiAdvice.interests)
    ? aiAdvice.interests
    : [];

  const aiCourses = Array.isArray(aiAdvice.courses)
    ? aiAdvice.courses
    : [];

  const availableHours = Number(
    aiAdvice.available_hours ?? student.hours_per_week ?? 0
  );

  const allocatedHours = Number(
    aiAdvice.allocated_hours ??
      aiCourses.reduce(
        (total, course) =>
          total + Number(course.estimated_hours || 0),
        0
      )
  );

  // OVERVIEW CARDS
  const overviewItems = [
    {
      label: "Total courses",
      value: curriculum ? totalCourses : "—",
      icon: "📚",
      detail: "In your curriculum",
    },
    {
      label: "Completed courses",
      value: curriculum ? completedCourses : "—",
      icon: "✓",
      detail: "Learning progress",
    },
    {
      label: "Quiz attempts",
      value: totalAttempts,
      icon: "✦",
      detail: "Total attempts",
    },
    {
      label: "Average score",
      value: totalAttempts
        ? formatPercentage(averageScore)
        : "—",
      icon: "↗",
      detail: "Quiz performance",
    },
  ];

  return (
    <main className="dashboard-page dashboard-layout">
      <div className="dashboard-noise" />
      <div className="dashboard-glow dashboard-glow-one" />
      <div className="dashboard-glow dashboard-glow-two" />
      <div className="dashboard-glow dashboard-glow-three" />

      {/* SIDEBAR */}

      <aside className="dashboard-sidebar">
        <button
          className="dashboard-brand"
          onClick={() => navigate("/dashboard")}
          aria-label="Pathwise AI home"
        >
          <span className="dashboard-logo-icon">P</span>
          <span className="dashboard-brand-text">
            pathwise<span> AI</span>
          </span>
        </button>

        <div className="dashboard-sidebar-label">
          WORKSPACE
        </div>

        <nav className="dashboard-sidebar-nav">
          <button
            className={`dashboard-nav-item ${
              activeNav === "overview" ? "active" : ""
            }`}
            onClick={() => scrollToSection("overview", "overview")}
          >
            <span>⌂</span>
            Overview
          </button>

          <button
            className={`dashboard-nav-item ${
              activeNav === "quiz" ? "active" : ""
            }`}
            onClick={() => scrollToSection("quiz-analytics", "quiz")}
          >
            <span>▥</span>
            Quiz analytics
          </button>

          <button
            className={`dashboard-nav-item ${
              activeNav === "skills" ? "active" : ""
            }`}
            onClick={() => scrollToSection("skill-analytics", "skills")}
          >
            <span>◈</span>
            Skill analytics
          </button>

          <button
            className={`dashboard-nav-item ${
              activeNav === "ai" ? "active" : ""
            }`}
            onClick={() => scrollToSection("ai-advice", "ai")}
          >
            <span>✦</span>
            AI advice
          </button>

          <button
            className="dashboard-nav-item"
            onClick={() => navigate("/quizzes")}
          >
            <span>✎</span>
            Quizzes
          </button>

          <button
            className="dashboard-nav-item"
            onClick={() => navigate("/assessment")}
          >
            <span>◎</span>
            Assessment
          </button>

          <button
            className="dashboard-nav-item"
            onClick={() => navigate("/roadmap")}
          >
            <span>⌁</span>
            Roadmap
          </button>

          <button
            className="dashboard-nav-item"
            onClick={() => scrollToSection("curriculum", "curriculum")}
          >
            <span>▤</span>
            Curriculum
          </button>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-sidebar-user">
            {savedUser.picture ? (
              <img src={savedUser.picture} alt="Profile" />
            ) : (
              <span className="dashboard-sidebar-avatar">
                {firstName.charAt(0).toUpperCase()}
              </span>
            )}

            <div>
              <strong>{student.name}</strong>
              <small>Student account</small>
            </div>
          </div>

          <button
            className="dashboard-sidebar-signout"
            onClick={handleSignOut}
          >
            ↪ Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="dashboard-main">
        {/* TOP BAR */}

        <header className="dashboard-topbar dashboard-reveal">
          <div>
            <span className="dashboard-eyebrow">
              YOUR PERSONAL LEARNING SPACE
            </span>
            <h1>
              Welcome back, <span>{firstName}.</span>
            </h1>
            <p>
              Let's make today a step forward in your journey.
            </p>
          </div>

          <div className="dashboard-header-right">
            <button
              type="button"
              className="dashboard-profile-trigger"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
            >
              {savedUser.picture ? (
                <img
                  className="dashboard-avatar"
                  src={savedUser.picture}
                  alt="Profile"
                />
              ) : (
                <div className="dashboard-avatar dashboard-avatar-fallback">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="dashboard-user-name">
                {student.name}
              </span>
              <span className="profile-chevron">
                ▾
              </span>
            </button>

            {profileMenuOpen && (
              <div className="dashboard-profile-dropdown">
                <div className="profile-dropdown-info">
                  <strong>{student.name}</strong>
                  <small>
                    {savedUser.email || "Pathwise AI Student"}
                  </small>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-dropdown-signout"
                  onClick={handleSignOut}
                >
                  ↪ Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* OVERVIEW STATISTICS */}

        <section
          className="dashboard-section dashboard-reveal"
          id="overview"
        >
          <div className="dashboard-section-heading compact-heading">
            <div>
              <span className="dashboard-eyebrow">
                YOUR OVERVIEW
              </span>
              <h2>Learning at a glance</h2>
            </div>
          </div>

          <div className="dashboard-overview-grid">
            {overviewItems.map((item, index) => (
              <article
                className="dashboard-overview-card dashboard-reveal"
                key={item.label}
                style={{ "--card-index": index }}
              >
                <div className="overview-card-top">
                  <span className="overview-card-icon">
                    {item.icon}
                  </span>
                  <span className="overview-card-arrow">↗</span>
                </div>

                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <span className="overview-card-hint">
                  {item.detail}
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* TWO GRAPH DASHBOARD */}

        <div className="dashboard-graph-grid">
          {/* GRAPH 1: QUIZ PERFORMANCE */}

          <section
            className="dashboard-section dashboard-analytics-card dashboard-reveal"
            id="quiz-analytics"
          >
            <div className="dashboard-chart-heading">
              <div>
                <span className="dashboard-eyebrow">
                  PERFORMANCE
                </span>
                <h2>Quiz analysis</h2>
                <p className="dashboard-analytics-description">
                  Your quiz performance over time.
                </p>
              </div>

              <button
                className="dashboard-action-secondary"
                onClick={() => navigate("/quizzes")}
              >
                Quizzes →
              </button>
            </div>

            <div className="dashboard-analytics-stats">
              <div className="dashboard-analytics-stat">
                <span>Attempts</span>
                <strong>{totalAttempts}</strong>
              </div>

              <div className="dashboard-analytics-stat">
                <span>Average</span>
                <strong>
                  {totalAttempts
                    ? formatPercentage(averageScore)
                    : "—"}
                </strong>
              </div>

              <div className="dashboard-analytics-stat">
                <span>Best</span>
                <strong>
                  {totalAttempts
                    ? formatPercentage(bestScore)
                    : "—"}
                </strong>
              </div>
            </div>

            {chartPoints.length > 0 ? (
              <>
                <div className="dashboard-line-chart dashboard-inview">
                  <svg
                    viewBox="0 0 600 230"
                    role="group"
                    aria-label="Quiz performance graph"
                  >
                    <defs>
                      <linearGradient
                        id="quizChartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#c5ff45"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="#c5ff45"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {[0, 25, 50, 75, 100].map((value) => {
                      const y = 180 - value * 1.6;

                      return (
                        <g key={value}>
                          <line
                            className="dashboard-line-grid"
                            x1="38"
                            y1={y}
                            x2="565"
                            y2={y}
                          />
                          <text
                            className="dashboard-line-axis-label"
                            x="28"
                            y={y + 4}
                            textAnchor="end"
                          >
                            {value}%
                          </text>
                        </g>
                      );
                    })}

                    <path
                      className="dashboard-line-area"
                      d={areaPath}
                    />

                    <path
                      className="dashboard-line-path"
                      d={linePath}
                    />

                    {chartPoints.map((point, index) => (
                      <g key={point.attempt_id || index}>
                        <circle
                          className="dashboard-chart-point-hitbox"
                          cx={point.x}
                          cy={point.y}
                          r="15"
                        />

                        <circle
                          className={`dashboard-line-point ${
                            selectedChartPoint?.chartIndex === index
                              ? "is-selected"
                              : ""
                          }`}
                          cx={point.x}
                          cy={point.y}
                          r="4.5"
                          role="button"
                          tabIndex="0"
                          aria-label={`Attempt ${index + 1}: ${formatPercentage(
                            point.percentage
                          )}`}
                          onClick={() =>
                            setSelectedChartIndex(index)
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              setSelectedChartIndex(index);
                            }
                          }}
                        />
                        <text
                          className="dashboard-line-axis-label"
                          x={point.x}
                          y="205"
                          textAnchor="middle"
                        >
                          {formatShortDate(point.created_at) ||
                            `#${index + 1}`}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                {selectedChartPoint && (
                  <div className="dashboard-chart-detail">
                    <div className="dashboard-chart-detail-main">
                      <span className="dashboard-chart-detail-icon">
                        ✦
                      </span>
                      <div>
                        <small>SELECTED ATTEMPT</small>
                        <strong>
                          {selectedChartPoint.course_id || "Quiz"}
                        </strong>
                        <span>
                          {formatDate(selectedChartPoint.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-chart-detail-score">
                      <strong>
                        {formatPercentage(
                          selectedChartPoint.percentage
                        )}
                      </strong>
                      <span>
                        {selectedChartPoint.score} /{" "}
                        {selectedChartPoint.total_questions} correct
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="dashboard-analytics-empty">
                <span>✦</span>
                <strong>No quiz attempts yet</strong>
                <p>
                  Take your first quiz to start tracking your
                  performance.
                </p>
                <button
                  className="dashboard-action-primary"
                  onClick={() => navigate("/quizzes")}
                >
                  Start a Quiz →
                </button>
              </div>
            )}

            <div className="dashboard-chart-instruction">
              <span />
              Select a point to inspect a quiz attempt
            </div>
          </section>

          {/* GRAPH 2: SKILL AND CONFIDENCE */}

          <section
            className="dashboard-section dashboard-analytics-card dashboard-reveal"
            id="skill-analytics"
          >
            <div className="dashboard-chart-heading">
              <div>
                <span className="dashboard-eyebrow">
                  YOUR STRENGTHS
                </span>
                <h2>Skill analysis</h2>
                <p className="dashboard-analytics-description">
                  Compare your skill and confidence ratings.
                </p>
              </div>

              <button
                className="dashboard-action-secondary"
                onClick={() => navigate("/assessment")}
              >
                Assessment →
              </button>
            </div>

            <div className="skill-chart-legend">
              <span>
                <i className="skill-legend-skill" />
                Skill level
              </span>
              <span>
                <i className="skill-legend-confidence" />
                Confidence
              </span>
            </div>

            {skillComparison.length > 0 ? (
              <div className="skill-comparison-list dashboard-inview">
                {skillComparison.map((item, index) => (
                  <div
                    className="skill-comparison-item"
                    key={item.skill}
                    style={{ "--skill-index": index }}
                  >
                    <div className="skill-comparison-heading">
                      <strong>{item.skill}</strong>
                      <span>
                        {item.skillLevel}/5 · {item.confidence}/5
                      </span>
                    </div>

                    <div className="skill-comparison-track">
                      <div
                        className="skill-comparison-bar skill-level-bar"
                        style={{
                          "--bar-width": `${
                            item.skillLevel * 20
                          }%`,
                        }}
                      />
                    </div>

                    <div className="skill-comparison-track confidence-track">
                      <div
                        className="skill-comparison-bar confidence-level-bar"
                        style={{
                          "--bar-width": `${
                            item.confidence * 20
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-analytics-empty">
                <span>◈</span>
                <strong>No skill data yet</strong>
                <p>
                  Complete a self-assessment to compare your skill
                  levels and confidence.
                </p>
                <button
                  className="dashboard-action-primary"
                  onClick={() => navigate("/assessment")}
                >
                  Start Assessment →
                </button>
              </div>
            )}

            {assessmentError && (
              <p className="curriculum-note">
                {assessmentError}
              </p>
            )}

            <div className="skill-chart-footer">
              Based on your latest self-assessment
            </div>
          </section>
        </div>

        {/* RECENT QUIZ ATTEMPTS */}

        <section className="dashboard-section dashboard-reveal">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">
                YOUR ACTIVITY
              </span>
              <h2>Recent quiz attempts</h2>
            </div>
          </div>

          <div className="dashboard-analytics-card">
            {latestAttempts.length > 0 ? (
              <div className="dashboard-history-list">
                {latestAttempts.map((attempt, index) => (
                  <div
                    className="dashboard-history-item"
                    key={attempt.attempt_id || index}
                  >
                    <div>
                      <strong>
                        {attempt.course_id || "Quiz attempt"}
                      </strong>
                      <small>
                        {formatDate(attempt.created_at)}
                      </small>
                    </div>
                    <strong>
                      {formatPercentage(attempt.percentage)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-analytics-empty">
                No saved quiz attempts to display.
              </div>
            )}
          </div>
        </section>

        {/* AI ADVICE */}

        <section
          className="dashboard-section dashboard-reveal"
          id="ai-advice"
        >
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">
                YOUR PERSONAL AI GUIDE
              </span>
              <h2>AI learning advice</h2>
              <p className="dashboard-analytics-description">
                Recommendations based on your performance and interests.
              </p>
            </div>

            <span className="dashboard-status">
              <span />
              Personalized
            </span>
          </div>

          {dashboardError ? (
            <div className="dashboard-analytics-card">
              <div className="dashboard-analytics-empty">
                <strong>Your AI guide is getting ready</strong>
                <p>{dashboardError}</p>
              </div>
            </div>
          ) : (
            <>
              <article className="dashboard-analytics-card ai-advice-main-card">
                <div className="ai-advice-main-content">
                  <div className="ai-advice-icon">✦</div>
                  <div className="ai-advice-content">
                    <span className="dashboard-card-label">
                      YOUR PERSONALIZED INSIGHT
                    </span>
                    <p>{aiAdviceText}</p>
                    {aiAdvice.source && (
                      <small className="ai-advice-source">
                        Pathwise AI · {aiAdvice.source}
                      </small>
                    )}
                  </div>
                </div>
              </article>

              <div className="ai-advice-grid">
                <article className="dashboard-analytics-card">
                  <h3>Recommended focus areas</h3>
                  <div className="ai-advice-tags">
                    {aiFocusAreas.length > 0 ? (
                      aiFocusAreas.map((area, index) => {
                        const label =
                          typeof area === "string"
                            ? area
                            : area?.skill || area?.name || "Focus area";

                        return (
                          <span
                            className="ai-advice-tag"
                            key={`${label}-${index}`}
                          >
                            ✦ {label}
                          </span>
                        );
                      })
                    ) : (
                      <p className="ai-advice-muted">
                        Complete an assessment to identify your
                        improvement areas.
                      </p>
                    )}
                  </div>
                </article>

                <article className="dashboard-analytics-card">
                  <h3>Your interests</h3>
                  <div className="ai-advice-tags">
                    {aiInterests.length > 0 ? (
                      aiInterests.map((interest, index) => {
                        const label =
                          typeof interest === "string"
                            ? interest
                            : interest?.name || "Interest";

                        return (
                          <span
                            className="ai-advice-tag interest"
                            key={`${label}-${index}`}
                          >
                            {label}
                          </span>
                        );
                      })
                    ) : (
                      <p className="ai-advice-muted">
                        Your interests will appear here after
                        assessment.
                      </p>
                    )}
                  </div>
                </article>
              </div>

              <article className="dashboard-analytics-card ai-study-plan">
                <div className="ai-study-plan-heading">
                  <div>
                    <span className="dashboard-card-label">
                      YOUR NEXT STEPS
                    </span>
                    <h3>Suggested weekly study plan</h3>
                  </div>

                  <div className="ai-study-hours">
                    <strong>{availableHours}</strong>
                    <span>hours / week</span>
                  </div>
                </div>

                {aiCourses.length > 0 ? (
                  <>
                    <div className="ai-study-list">
                      {aiCourses.map((course, index) => (
                        <div
                          className="ai-study-item"
                          key={`${course.course_name || course.skill || "study"}-${index}`}
                          style={{ "--advice-index": index }}
                        >
                          <div className="ai-study-item-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="ai-study-item-content">
                            <strong>
                              {course.course_name ||
                                course.skill ||
                                "Learning activity"}
                            </strong>
                            {course.reason && <p>{course.reason}</p>}
                          </div>

                          <div className="ai-study-item-hours">
                            <strong>
                              {Number(
                                course.estimated_hours || 0
                              ).toFixed(1)}
                            </strong>
                            <span>hours</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="ai-study-plan-footer">
                      <span>Planned learning time</span>
                      <strong>
                        {allocatedHours.toFixed(1)} /{" "}
                        {availableHours} hours
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="dashboard-analytics-empty">
                    <p>
                      Complete an assessment to generate your
                      personalized study plan.
                    </p>
                    <button
                      className="dashboard-action-primary"
                      onClick={() => navigate("/assessment")}
                    >
                      Complete Assessment →
                    </button>
                  </div>
                )}
              </article>
            </>
          )}
        </section>

        {/* LEARNING PROFILE */}

        <section className="dashboard-section dashboard-reveal">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">
                YOUR FOUNDATION
              </span>
              <h2>Your learning profile</h2>
            </div>
          </div>

          <div className="dashboard-profile-grid">
            <article className="dashboard-card">
              <span className="dashboard-card-icon">🎓</span>
              <span className="dashboard-card-label">PROGRAMME</span>
              <strong>{student.programme || "Not specified"}</strong>
            </article>

            <article className="dashboard-card">
              <span className="dashboard-card-icon">📚</span>
              <span className="dashboard-card-label">STUDY YEAR</span>
              <strong>Year {student.year}</strong>
            </article>

            <article className="dashboard-card">
              <span className="dashboard-card-icon">⏱️</span>
              <span className="dashboard-card-label">
                WEEKLY LEARNING TIME
              </span>
              <strong>{student.hours_per_week} hours</strong>
            </article>
          </div>
        </section>

        {/* CURRICULUM */}

        {student.branch && (
          <section
            className="dashboard-section dashboard-reveal curriculum-section"
            id="curriculum"
          >
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-eyebrow">
                  YOUR DEGREE PLAN
                </span>
                <h2>My curriculum</h2>
                <p className="curriculum-subtitle">
                  {student.institute?.replaceAll("_", " ")} ·{" "}
                  {student.branch} · Admission{" "}
                  {student.admission_year} · Semester{" "}
                  {student.current_semester}
                </p>
              </div>

              {curriculum && (
                <span className="dashboard-status">
                  <span />
                  {curriculum.completion_percent}% complete
                </span>
              )}
            </div>

            {curriculumError && (
              <p className="curriculum-note">{curriculumError}</p>
            )}

            {curriculum && (
              <>
                <div className="curriculum-progress-track dashboard-inview">
                  <div
                    style={{
                      width: `${completionPercentage}%`,
                    }}
                  />
                </div>

                <div className="curriculum-stats">
                  <span>
                    <strong>{completedCourses}</strong> /{" "}
                    {totalCourses} verified courses completed
                  </span>
                  <span>
                    <strong>{curriculum.completed_credits}</strong> /{" "}
                    {curriculum.total_credits} credits
                  </span>
                </div>

                {curriculum.source_status?.includes(
                  "pending_import"
                ) && (
                  <p className="curriculum-note">
                    Semester 1 is currently loaded. Remaining semester
                    records are being added from the supplied curriculum
                    documents.
                  </p>
                )}

                <div className="curriculum-semesters">
                  {semesters
                    .filter(
                      (semester) =>
                        Number(semester.semester) ===
                          Number(student.current_semester) &&
                        Array.isArray(semester.courses) &&
                        semester.courses.length > 0
                    )
                    .map((semester) => (
                      <details
                        className="curriculum-semester"
                        key={semester.semester}
                        open
                      >
                        <summary>
                          <span>
                            Semester {semester.semester}
                          </span>
                          <small>
                            {semester.completed_courses}/
                            {semester.total_courses} completed
                          </small>
                        </summary>

                        <div className="curriculum-course-list">
                          {semester.courses.map((course) => (
                            <div
                              className="curriculum-course"
                              key={course.course_key}
                            >
                              <div>
                                <strong>{course.name}</strong>
                                <small>
                                  {course.code || "Code pending"} ·{" "}
                                  {course.credits ??
                                    course.credit_type ??
                                    "Credits pending"}{" "}
                                  {course.credits != null
                                    ? "credits"
                                    : ""}
                                </small>
                                {course.note && (
                                  <small className="curriculum-note">
                                    {course.note}
                                  </small>
                                )}
                              </div>

                              {course.status === "verified" ? (
                                <button
                                  className={
                                    course.completed
                                      ? "course-complete is-complete"
                                      : "course-complete"
                                  }
                                  onClick={async () => {
                                    const token =
                                      localStorage.getItem(
                                        "pathwise_token"
                                      );

                                    try {
                                      const result = await fetch(
                                        `${API_URL}/curriculum/progress/${encodeURIComponent(
                                          course.course_key
                                        )}`,
                                        {
                                          method: "PUT",
                                          headers: {
                                            "Content-Type":
                                              "application/json",
                                            Authorization: `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({
                                            completed: !course.completed,
                                          }),
                                        }
                                      );

                                      if (result.ok) {
                                        const updated = await fetch(
                                          `${API_URL}/curriculum/me`,
                                          {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          }
                                        );

                                        if (updated.ok) {
                                          setCurriculum(
                                            await updated.json()
                                          );
                                        }
                                      } else {
                                        setCurriculumError(
                                          "Unable to update course progress."
                                        );
                                      }
                                    } catch {
                                      setCurriculumError(
                                        "Unable to update course progress."
                                      );
                                    }
                                  }}
                                >
                                  {course.completed
                                    ? "Completed ✓"
                                    : "Mark complete"}
                                </button>
                              ) : (
                                <span className="course-pending">
                                  Verify credits
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}

                  {!semesters.some(
                    (semester) =>
                      Number(semester.semester) ===
                        Number(student.current_semester) &&
                      Array.isArray(semester.courses) &&
                      semester.courses.length > 0
                  ) && (
                    <p className="curriculum-note">
                      No curriculum courses are currently available
                      for Semester {student.current_semester}.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* GOALS */}

        <section className="dashboard-section dashboard-reveal">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">
                WHAT DRIVES YOU
              </span>
              <h2>Your learning goals</h2>
            </div>
          </div>

          <div className="dashboard-goals">
            {student.goals?.length > 0 ? (
              student.goals.map((goal, index) => (
                <div
                  className="dashboard-goal"
                  key={`${goal}-${index}`}
                  style={{ "--goal-index": index }}
                >
                  <span className="dashboard-goal-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{goal}</span>
                  <span className="dashboard-goal-star">✦</span>
                </div>
              ))
            ) : (
              <p>No learning goals added yet.</p>
            )}
          </div>
        </section>

        {/* JOURNEY */}

        <section className="dashboard-journey dashboard-reveal">
          <div>
            <span className="dashboard-eyebrow">
              THE NEXT CHAPTER
            </span>
            <h2>Your learning journey starts here.</h2>
            <p>
              Keep building your knowledge through personalized
              assessments, quizzes and learning roadmaps.
            </p>

            <div className="dashboard-journey-actions">
              <button
                className="dashboard-action-primary"
                onClick={() => navigate("/assessment")}
              >
                Take Assessment →
              </button>

              <button
                className="dashboard-action-secondary"
                onClick={() => navigate("/roadmap")}
              >
                View Learning Roadmap
              </button>
            </div>
          </div>

          <div className="dashboard-journey-icon">↗</div>
        </section>

        <footer className="dashboard-footer">
          <span>PATHWISE AI</span>
          <span>YOUR PATH. YOUR PACE. YOUR POTENTIAL.</span>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
