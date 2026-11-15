
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Quiz.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const COURSE_NAMES = {
  CS101: "Introduction to Programming",
  CS102: "Data Structures and Algorithms",
  MA101: "Calculus",
};

function Quiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const normalizedCourseId = courseId?.toUpperCase();
  const courseName =
    COURSE_NAMES[normalizedCourseId] || normalizedCourseId;

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [studentId, setStudentId] = useState(null);
  const [token, setToken] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [provider, setProvider] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [difficulty, setDifficulty] = useState("adaptive");
  const [numQuestions, setNumQuestions] = useState(5);

  // Result review navigation
  const [reviewIndex, setReviewIndex] = useState(0);

  // Load the logged-in student.
  useEffect(() => {
    const savedToken = localStorage.getItem("pathwise_token");

    let savedUser = null;

    try {
      savedUser = JSON.parse(
        localStorage.getItem("pathwise_user") || "{}"
      );
    } catch {
      savedUser = null;
    }

    if (!savedToken || !savedUser?.student_id) {
      navigate("/login");
      return;
    }

    setToken(savedToken);
    setStudentId(savedUser.student_id);
    setLoading(false);
  }, [navigate]);

  // Generate an AI-powered quiz.
  const generateQuiz = async () => {
    if (!studentId || !token) return;

    setLoading(true);
    setError("");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setSessionId(null);
    setHistory([]);
    setCurrentQuestionIndex(0);
    setReviewIndex(0);

    try {
      const response = await fetch(
        `${API_URL}/students/${studentId}/quiz/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course_id: normalizedCourseId,
            difficulty,
            num_questions: Number(numQuestions),
            course_name: courseName,
            topics: [],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to generate your quiz."
        );
      }

      setQuestions(data.questions || []);
      setSessionId(data.session_id);
      setProvider(data.provider || "AI");
    } catch (err) {
      setError(err.message || "Quiz generation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Select an answer.
  const selectAnswer = (questionId, optionKey) => {
    if (result || submitting) return;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionKey,
    }));
  };

  // Count answers belonging to the current quiz.
  const answeredCount = questions.filter(
    (question) => answers[question.id] !== undefined
  ).length;

  const unansweredCount = questions.length - answeredCount;

  const progressPercentage =
    questions.length > 0
      ? (answeredCount / questions.length) * 100
      : 0;

  // Jump to a particular question.
  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return;

    setCurrentQuestionIndex(index);
    setError("");
  };

  // Submit the generated quiz session.
  const submitQuiz = async () => {
    if (!sessionId) {
      setError("Quiz session not found. Please generate another quiz.");
      return;
    }

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered question(s).\n\n` +
        "Are you sure you want to submit your quiz?"
      );

      if (!confirmed) return;
    }

    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/students/${studentId}/quiz/session/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            answers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to submit your quiz."
        );
      }

      setResult(data);
      setReviewIndex(0);

      // Load previous attempts after successful submission.
      try {
        const historyResponse = await fetch(
          `${API_URL}/students/${studentId}/quiz/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();

          setHistory(
            (historyData.attempts || []).filter(
              (attempt) =>
                attempt.course_id?.toUpperCase() === normalizedCourseId
            )
          );
        }
      } catch {
        // The score remains available if history cannot load.
      }
    } catch (err) {
      setError(err.message || "Quiz submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const score = Number(result?.score_percentage ?? 0);

  const getPerformance = () => {
    if (score >= 80) {
      return {
        title: "Excellent work!",
        message: "You've demonstrated a strong understanding of this course.",
        icon: "🏆",
      };
    }

    if (score >= 60) {
      return {
        title: "Good progress!",
        message: "You're building a solid foundation. Keep practising.",
        icon: "🌟",
      };
    }

    if (score >= 40) {
      return {
        title: "You're getting there!",
        message: "Review the course topics and try another attempt.",
        icon: "💪",
      };
    }

    return {
      title: "Keep learning!",
      message: "Every attempt helps you improve. Revisit the learning resources and try again.",
      icon: "📚",
    };
  };

  // Initial loading screen.
  if (loading) {
    return (
      <main className="quiz-page quiz-state">
        <div className="quiz-loader"></div>
        <h2>
          {questions.length > 0
            ? "Preparing your quiz..."
            : "Generating your quiz..."}
        </h2>
        <p>Pathwise AI is preparing your questions.</p>
      </main>
    );
  }

  // Results and detailed review screen.
  if (result) {
    const performance = getPerformance();
    const review = result.review || [];
    const currentReview = review[reviewIndex];

    const correctCount = Number(result.correct_answers || 0);
    const incorrectCount =
      result.incorrect_answers ??
      (result.total_questions - correctCount);

    return (
      <main className="quiz-page">
        <header className="quiz-header">
          <div>
            <span className="quiz-eyebrow">
              PATHWISE AI / QUIZ RESULTS
            </span>
            <h1>
              Your <span>Results</span>
            </h1>
            <p>{courseName}</p>
          </div>
        </header>

        {/* Overall score */}
        <section className="quiz-result-card">
          <div className="quiz-result-icon">
            {performance.icon}
          </div>

          <h2>{performance.title}</h2>
          <p>{performance.message}</p>

          <div className="quiz-score-circle">
            <strong>{score}%</strong>
            <span>Your score</span>
          </div>

          <div className="quiz-result-stats">
            <div>
              <strong>{correctCount}</strong>
              <span>Correct answers</span>
            </div>

            <div>
              <strong>{result.total_questions}</strong>
              <span>Total questions</span>
            </div>

            <div>
              <strong>{incorrectCount}</strong>
              <span>Incorrect answers</span>
            </div>
          </div>

          <div className="quiz-result-actions">
            <button
              className="quiz-primary-btn"
              onClick={generateQuiz}
            >
              Generate Another Quiz
            </button>

            <button
              className="quiz-secondary-btn"
              onClick={() => navigate("/roadmap")}
            >
              Back to Roadmap
            </button>
          </div>
        </section>

        {/* Question-by-question review */}
        {review.length > 0 && (
          <section className="quiz-review-section">
            <div className="quiz-section-heading">
              <span className="quiz-eyebrow">
                LEARN FROM YOUR ATTEMPT
              </span>
              <h2>Question Review</h2>
              <p>
                Review your answers and understand the reasoning
                behind each correct answer.
              </p>
            </div>

            {/* Review question navigator */}
            <div className="quiz-review-navigator">
              <div className="quiz-review-nav-heading">
                <strong>Questions</strong>
                <span>
                  {reviewIndex + 1} of {review.length}
                </span>
              </div>

              <div className="quiz-review-nav-grid">
                {review.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setReviewIndex(index)}
                    className={[
                      "quiz-review-nav-item",
                      item.is_correct ? "correct" : "incorrect",
                      reviewIndex === index ? "active" : "",
                    ].join(" ")}
                    aria-label={`Review question ${index + 1}`}
                    aria-current={
                      reviewIndex === index ? "step" : undefined
                    }
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="quiz-review-legend">
                <span>
                  <i className="review-legend-correct"></i>
                  Correct
                </span>
                <span>
                  <i className="review-legend-incorrect"></i>
                  Incorrect
                </span>
              </div>
            </div>

            {/* Individual question review card */}
            {currentReview && (
              <article className="quiz-review-card" key={currentReview.id}>
                <div className="quiz-review-card-top">
                  <span className="quiz-question-number">
                    QUESTION {String(reviewIndex + 1).padStart(2, "0")}
                  </span>

                  <span
                    className={`quiz-review-status ${
                      currentReview.is_correct ? "correct" : "incorrect"
                    }`}
                  >
                    {currentReview.is_correct
                      ? "✓ Correct"
                      : "✕ Incorrect"}
                  </span>
                </div>

                <div className="quiz-skill-label">
                  {currentReview.skill || "General"}
                </div>

                <h2 className="quiz-review-question">
                  {currentReview.question}
                </h2>

                {/* All answer options */}
                <div className="quiz-review-options">
                  {Object.entries(currentReview.options || {}).map(
                    ([key, value]) => {
                      const isCorrect =
                        key === currentReview.correct_answer;

                      const isSelected =
                        key === currentReview.selected_answer;

                      let optionClass = "";

                      if (isCorrect) {
                        optionClass = "review-option-correct";
                      } else if (isSelected) {
                        optionClass = "review-option-incorrect";
                      }

                      return (
                        <div
                          key={key}
                          className={`quiz-review-option ${optionClass}`}
                        >
                          <span className="quiz-option-key">
                            {key}
                          </span>

                          <span className="quiz-option-text">
                            {value}
                          </span>

                          {isCorrect && (
                            <span className="quiz-review-option-label">
                              Correct answer
                            </span>
                          )}

                          {!isCorrect && isSelected && (
                            <span className="quiz-review-option-label">
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Answer comparison */}
                <div className="quiz-answer-comparison">
                  <div>
                    <span>Your answer</span>
                    <strong>
                      {currentReview.selected_answer
                        ? `${currentReview.selected_answer}. ${
                            currentReview.selected_answer_text || ""
                          }`
                        : "Not answered"}
                    </strong>
                  </div>

                  <div>
                    <span>Correct answer</span>
                    <strong>
                      {currentReview.correct_answer}.{" "}
                      {currentReview.correct_answer_text || ""}
                    </strong>
                  </div>
                </div>

                {/* Separate explanation panel */}
                <div className="quiz-explanation-panel">
                  <div className="quiz-explanation-heading">
                    <span className="quiz-explanation-icon">💡</span>
                    <div>
                      <span className="quiz-eyebrow">
                        UNDERSTAND THE CONCEPT
                      </span>
                      <h3>Explanation</h3>
                    </div>
                  </div>

                  <p>
                    {currentReview.explanation ||
                      "No explanation is available for this question."}
                  </p>

                  {currentReview.skill && (
                    <div className="quiz-explanation-topic">
                      <span>Related topic</span>
                      <strong>{currentReview.skill}</strong>
                    </div>
                  )}
                </div>

                {/* Review navigation */}
                <div className="quiz-review-navigation">
                  <button
                    className="quiz-secondary-btn"
                    disabled={reviewIndex === 0}
                    onClick={() =>
                      setReviewIndex((previous) => previous - 1)
                    }
                  >
                    ← Previous
                  </button>

                  <span>
                    {reviewIndex + 1} / {review.length}
                  </span>

                  <button
                    className="quiz-primary-btn"
                    disabled={reviewIndex === review.length - 1}
                    onClick={() =>
                      setReviewIndex((previous) => previous + 1)
                    }
                  >
                    Next →
                  </button>
                </div>
              </article>
            )}
          </section>
        )}

        {review.length === 0 && (
          <section className="quiz-review-unavailable">
            <h2>Detailed review unavailable</h2>
            <p>
              Your score was saved, but this submission did not
              include question explanations. Generate a new quiz
              after checking the backend response.
            </p>
          </section>
        )}

        {/* Previous attempts */}
        {history.length > 0 && (
          <section className="quiz-history-section">
            <div className="quiz-section-heading">
              <span className="quiz-eyebrow">YOUR PROGRESS</span>
              <h2>Previous Attempts</h2>
            </div>

            <div className="quiz-history-list">
              {history.map((attempt) => (
                <div
                  className="quiz-history-item"
                  key={attempt.attempt_id}
                >
                  <div>
                    <strong>Attempt #{attempt.attempt_id}</strong>
                    <span>
                      {attempt.created_at
                        ? new Date(attempt.created_at).toLocaleString()
                        : "Previous attempt"}
                    </span>
                  </div>

                  <strong className="quiz-history-score">
                    {attempt.score}%
                  </strong>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // Quiz configuration screen.
  if (questions.length === 0) {
    return (
      <main className="quiz-page">
        <header className="quiz-header">
          <div>
            <span className="quiz-eyebrow">
              PATHWISE AI / PERSONALIZED PRACTICE
            </span>
            <h1>
              AI <span>Quiz Generator</span>
            </h1>
            <p>{courseName}</p>
          </div>

          <button
            className="quiz-secondary-btn"
            onClick={() => navigate("/roadmap")}
          >
            Back to Roadmap
          </button>
        </header>

        <section className="quiz-progress-card">
          <h2>Customize your quiz</h2>
          <p>
            Choose your preferred difficulty and number of questions.
            Pathwise AI will generate a quiz for this course.
          </p>

          <div className="quiz-config-field">
            <label htmlFor="quiz-difficulty">Difficulty</label>
            <select
              id="quiz-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </div>

          <div className="quiz-config-field">
            <label htmlFor="quiz-count">Number of questions</label>
            <input
              id="quiz-count"
              type="number"
              min="1"
              max="30"
              value={numQuestions}
              onChange={(event) => {
                const value = event.target.value;
                setNumQuestions(value === "" ? "" : Number(value));
              }}
            />
          </div>

          {error && <div className="quiz-error">{error}</div>}

          <button
            className="quiz-primary-btn"
            onClick={generateQuiz}
            disabled={
              !numQuestions ||
              numQuestions < 1 ||
              numQuestions > 30 ||
              !studentId
            }
          >
            Generate AI Quiz →
          </button>
        </section>
      </main>
    );
  }

  // Active quiz screen.
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <main className="quiz-page">
      <header className="quiz-header">
        <div>
          <span className="quiz-eyebrow">
            PATHWISE AI / KNOWLEDGE CHECK
          </span>
          <h1>
            Course <span>Quiz</span>
          </h1>
          <p>{courseName}</p>
          <p className="quiz-provider-label">
            Generated using: {provider}
          </p>
        </div>

        <button
          className="quiz-secondary-btn"
          onClick={() => navigate("/roadmap")}
        >
          Back to Roadmap
        </button>
      </header>

      {/* Answer progress */}
      <section className="quiz-progress-card">
        <div className="quiz-progress-info">
          <span>YOUR PROGRESS</span>
          <strong>
            {answeredCount} / {questions.length} answered
          </strong>
        </div>

        <div className="quiz-progress-track">
          <div
            className="quiz-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="quiz-answer-summary">
          <span>
            <strong>{answeredCount}</strong> answered
          </span>
          <span>
            <strong>{unansweredCount}</strong> remaining
          </span>
        </div>
      </section>

      {/* Clickable question navigator */}
      <section className="quiz-navigator">
        <div className="quiz-navigator-heading">
          <div>
            <strong>Question Navigator</strong>
            <p>Select a number to jump to that question.</p>
          </div>
          <span>
            {answeredCount}/{questions.length} completed
          </span>
        </div>

        <div className="quiz-navigator-grid">
          {questions.map((question, index) => {
            const isAnswered =
              answers[question.id] !== undefined;
            const isCurrent = currentQuestionIndex === index;

            return (
              <button
                key={question.id}
                type="button"
                className={[
                  "quiz-navigator-item",
                  isAnswered ? "answered" : "unanswered",
                  isCurrent ? "current" : "",
                ].join(" ")}
                onClick={() => goToQuestion(index)}
                aria-label={`Go to question ${index + 1}${
                  isAnswered ? ", answered" : ", unanswered"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {index + 1}
                {isAnswered && (
                  <span className="quiz-navigator-check">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="quiz-navigator-legend">
          <span>
            <i className="legend-answered"></i>
            Answered
          </span>
          <span>
            <i className="legend-unanswered"></i>
            Unanswered
          </span>
          <span>
            <i className="legend-current"></i>
            Current
          </span>
        </div>
      </section>

      {/* Current question card */}
      <section className="quiz-question-list">
        {currentQuestion && (
          <article
            className="quiz-question-card"
            key={currentQuestion.id}
          >
            <div className="quiz-question-top">
              <span className="quiz-question-number">
                QUESTION {String(currentQuestionIndex + 1).padStart(2, "0")}
              </span>

              <span
                className={`quiz-difficulty ${
                  currentQuestion.difficulty?.toLowerCase()
                }`}
              >
                {currentQuestion.difficulty}
              </span>
            </div>

            <div className="quiz-skill-label">
              {currentQuestion.skill}
            </div>

            <h2>{currentQuestion.question}</h2>

            <div className="quiz-options">
              {Object.entries(currentQuestion.options || {}).map(
                ([key, value]) => (
                  <button
                    type="button"
                    key={key}
                    className={`quiz-option ${
                      answers[currentQuestion.id] === key
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectAnswer(currentQuestion.id, key)
                    }
                  >
                    <span className="quiz-option-key">{key}</span>
                    <span className="quiz-option-text">{value}</span>

                    {answers[currentQuestion.id] === key && (
                      <span className="quiz-option-check">✓</span>
                    )}
                  </button>
                )
              )}
            </div>
          </article>
        )}

        <div className="quiz-question-navigation">
          <button
            className="quiz-secondary-btn"
            disabled={currentQuestionIndex === 0}
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
          >
            ← Previous
          </button>

          <span className="quiz-question-counter">
            {currentQuestionIndex + 1} / {questions.length}
          </span>

          <button
            className="quiz-primary-btn"
            disabled={currentQuestionIndex === questions.length - 1}
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
          >
            Next →
          </button>
        </div>
      </section>

      {error && <div className="quiz-error">{error}</div>}

      {/* Submission */}
      <section className="quiz-submit-section">
        <div>
          <strong>Ready to submit?</strong>
          <p>
            {unansweredCount === 0
              ? "You've answered every question."
              : `You have ${unansweredCount} unanswered question(s). You can still submit if you wish.`}
          </p>
        </div>

        <button
          className="quiz-primary-btn"
          onClick={submitQuiz}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Quiz →"}
        </button>
      </section>
    </main>
  );
}

export default Quiz;
