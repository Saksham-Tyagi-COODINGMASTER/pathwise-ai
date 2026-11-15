
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Roadmap.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

function Roadmap() {
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const openQuiz = (courseId) => {
    navigate(`/quiz/${encodeURIComponent(courseId)}`);
  };

  const loadRoadmap = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("pathwise_token");
      const savedUser = JSON.parse(
        localStorage.getItem("pathwise_user") || "{}"
      );

      const studentId = savedUser.student_id || savedUser.id;

      if (!token) {
        navigate("/login");
        return;
      }

      if (!studentId) {
        throw new Error(
          "Your student profile was not found. Please complete onboarding first."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [planResponse, recommendationResponse] =
        await Promise.all([
          fetch(`${API_URL}/students/${studentId}/generate-plan`, {
            method: "POST",
            headers,
          }),
          fetch(`${API_URL}/students/${studentId}/recommendations`, {
            headers,
          }),
        ]);

      const planData = await planResponse.json();
      const recommendationData =
        await recommendationResponse.json();

      if (!planResponse.ok) {
        throw new Error(
          planData.detail || "Could not generate your learning plan."
        );
      }

      if (!recommendationResponse.ok) {
        throw new Error(
          recommendationData.detail ||
            "Could not load course recommendations."
        );
      }

      setPlan(planData.plan);
      setRecommendations(recommendationData);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, []);

  if (loading) {
    return (
      <div className="roadmap-page roadmap-state">
        <div className="roadmap-loader" />
        <h2>Building your learning roadmap...</h2>
        <p>Finding the best next steps for your goals.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roadmap-page roadmap-state">
        <div className="roadmap-state-icon">!</div>
        <h2>We couldn't load your roadmap</h2>
        <p>{error}</p>

        <button className="roadmap-primary-btn" onClick={loadRoadmap}>
          Try again
        </button>

        <button
          className="roadmap-secondary-btn"
          onClick={() => navigate("/assessment")}
        >
          Go to assessment
        </button>
      </div>
    );
  }

  const courses = plan?.recommendations || [];
  const weeklyPlan = plan?.weekly_plan || [];
  const nextStep = recommendations?.next_step;

  return (
    <main className="roadmap-page">
      <header className="roadmap-header">
        <div>
          <span className="roadmap-eyebrow">
            YOUR PERSONAL LEARNING PATH
          </span>
          <h1>Your Learning Roadmap<span>.</span></h1>
          <p>
            A clear path forward, built around your current skills
            and learning goals.
          </p>
        </div>

        <button
          className="roadmap-refresh-btn"
          onClick={loadRoadmap}
        >
          ↻ Refresh roadmap
        </button>
      </header>

      {nextStep && (
        <section className="roadmap-next-step">
          <div className="next-step-label">
            <span>✦</span> YOUR NEXT STEP
          </div>

          <h2>{nextStep.course_name}</h2>

          <p className="next-step-skill">
            Focus skill: <strong>{nextStep.skill}</strong>
          </p>

          <p>{nextStep.why}</p>

          <span className="next-step-action">
            {nextStep.action.replaceAll("_", " ")}
          </span>

          <button
            className="roadmap-quiz-btn"
            onClick={() => openQuiz(nextStep.course_id)}
          >
            Take Course Quiz →
          </button>
        </section>
      )}

      <section className="roadmap-section">
        <div className="roadmap-section-heading">
          <div>
            <span className="roadmap-eyebrow">
              YOUR PERSONALIZED PATH
            </span>
            <h2>Recommended courses</h2>
          </div>

          <span className="roadmap-count">
            {courses.length} courses
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="roadmap-empty">
            <h3>No new courses to recommend yet</h3>
            <p>
              Your current plan has no eligible courses with identified
              skill gaps. Complete more learning activities or update
              your assessment to refresh your roadmap.
            </p>
          </div>
        ) : (
          <div className="roadmap-course-list">
            {courses.map((course, index) => (
              <article
                className="roadmap-course-card"
                key={course.course_id}
              >
                <div className="course-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="course-main">
                  <span className="course-priority">
                    PRIORITY {index + 1}
                  </span>

                  <h3>{course.course_name}</h3>
                  <p>{course.reason}</p>

                  <div className="course-meta">
                    <span>◷ {course.estimated_hours} hours</span>
                    <span>✦ {course.credits} credits</span>
                  </div>

                  <div className="skill-gap-list">
                    {course.skill_gaps?.map((gap) => (
                      <span key={gap.skill}>
                        {gap.skill}: Level {gap.current_level} →{" "}
                        {gap.target_level}
                      </span>
                    ))}
                  </div>

                  <button
                    className="roadmap-quiz-btn"
                    onClick={() => openQuiz(course.course_id)}
                  >
                    Take Quiz →
                  </button>
                </div>

                <div className="course-score">
                  <strong>{course.priority_score}</strong>
                  <span>Priority score</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="roadmap-section">
        <div className="roadmap-section-heading">
          <div>
            <span className="roadmap-eyebrow">STAY CONSISTENT</span>
            <h2>Your weekly schedule</h2>
          </div>
        </div>

        {weeklyPlan.length === 0 ? (
          <div className="roadmap-empty">
            No weekly schedule is available yet.
          </div>
        ) : (
          <div className="weekly-plan-list">
            {weeklyPlan.map((course) => (
              <article
                className="weekly-course"
                key={course.course_id}
              >
                <div className="weekly-course-heading">
                  <h3>{course.course_name}</h3>
                  <span>{course.total_hours} hrs total</span>
                </div>

                <div className="weekly-days">
                  {course.daily_schedule.map((day) => (
                    <div className="weekly-day" key={day.day}>
                      <span>{day.day.slice(0, 3)}</span>
                      <strong>{day.hours}h</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {recommendations?.review_completed?.length > 0 && (
        <section className="roadmap-section">
          <div className="roadmap-section-heading">
            <div>
              <span className="roadmap-eyebrow">KEEP IMPROVING</span>
              <h2>Skills to review</h2>
            </div>
          </div>

          <div className="roadmap-empty">
            {recommendations.review_completed.map((course) => (
              <div className="review-course" key={course.course_id}>
                <h3>{course.course_name}</h3>

                <p>
                  Revisit:{" "}
                  {course.weak_skills
                    .map((item) => item.skill)
                    .join(", ")}
                </p>

                <button
                  className="roadmap-quiz-btn"
                  onClick={() => openQuiz(course.course_id)}
                >
                  Retake Quiz →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default Roadmap;
