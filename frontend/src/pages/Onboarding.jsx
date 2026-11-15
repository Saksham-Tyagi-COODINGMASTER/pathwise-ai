
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Onboarding.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

const learningGoals = [
  {
    icon: "🚀",
    title: "Learn a new skill",
    description: "Explore something new and expand your abilities.",
  },
  {
    icon: "💼",
    title: "Prepare for a job",
    description: "Develop skills that help you build your career.",
  },
  {
    icon: "🎓",
    title: "Improve academically",
    description: "Perform better in your studies and exams.",
  },
  {
    icon: "🛠️",
    title: "Build real-world projects",
    description: "Turn your knowledge into practical experience.",
  },
  {
    icon: "🔄",
    title: "Switch careers",
    description: "Prepare yourself for a new professional direction.",
  },
  {
    icon: "🌱",
    title: "Personal growth",
    description: "Become a better learner and grow continuously.",
  },
];

const branches = [
  { value: "CSE", label: "Computer Science and Engineering" },
  { value: "ECE", label: "Electronics and Communication Engineering" },
  { value: "EEE", label: "Electrical and Electronics Engineering" },
  { value: "EE", label: "Electrical Engineering" },
  { value: "Engineering Physics", label: "Engineering Physics" },
  { value: "Mathematics and Computing", label: "Mathematics and Computing" },
  { value: "Mechanical Engineering", label: "Mechanical Engineering" },
  {
    value: "Chemical and Biochemical Engineering",
    label: "Chemical and Biochemical Engineering",
  },
  {
    value: "Civil and Infrastructure Engineering",
    label: "Civil and Infrastructure Engineering",
  },
];

function Onboarding() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [programme, setProgramme] = useState("B.Tech");
  const [institute, setInstitute] = useState("IIT_DHARWAD");
  const [branch, setBranch] = useState("CSE");
  const [admissionYear, setAdmissionYear] = useState("2025");
  const [currentSemester, setCurrentSemester] = useState("1");
  const [year, setYear] = useState("1");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleGoal = (goal) => {
    setError("");

    setSelectedGoals((previous) =>
      previous.includes(goal)
        ? previous.filter((item) => item !== goal)
        : [...previous, goal]
    );
  };

  const saveOnboarding = async (event) => {
    event.preventDefault();
    setError("");

    if (!programme.trim()) {
      setError("Please enter your programme or course.");
      return;
    }

    if (!branches.some((item) => item.value === branch)) {
      setError("Please select a valid branch.");
      return;
    }

    if (selectedGoals.length === 0) {
      setError("Please select at least one learning goal.");
      return;
    }

    const token = localStorage.getItem("pathwise_token");

    if (!token) {
      setError("Your login session was not found. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        programme: programme.trim(),
        year: Number(year),
        goals: selectedGoals,
        hours_per_week: Number(hoursPerWeek),
        institute,
        degree: "B.Tech",
        branch,
        admission_year: Number(admissionYear),
        current_semester: Number(currentSemester),
        ...(branch === "CSE" && {
          curriculum_version: "2025",
        }),
      };

      const response = await fetch(`${API_URL}/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save your onboarding information."
        );
      }

      const savedBranch = data.student?.branch;

      if (savedBranch !== branch) {
        throw new Error(
          `Branch mismatch: you selected ${branch}, but the server saved ${savedBranch || "no branch"}.`
        );
      }

      let savedUser = {};

      try {
        savedUser = JSON.parse(
          localStorage.getItem("pathwise_user") || "{}"
        );
      } catch {
        savedUser = {};
      }

      localStorage.setItem(
        "pathwise_user",
        JSON.stringify({
          ...savedUser,
          onboarding_completed: true,
          student_id: data.student.id,
        })
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-glow onboarding-glow-one" />
      <div className="onboarding-glow onboarding-glow-two" />

      <div className="onboarding-container">
        <header className="onboarding-header">
          <a href="/" className="onboarding-logo">
            <span className="logo-icon">P</span>
            <span>
              pathwise<span className="logo-ai"> AI</span>
            </span>
          </a>

          <span className="header-tag">
            YOUR PERSONAL LEARNING SPACE
          </span>
        </header>

        <section className="onboarding-main">
          <div className="onboarding-progress">
            <div className="progress-heading">
              <span>
                {currentStep === 0
                  ? "GETTING STARTED"
                  : currentStep === 1
                  ? "YOUR LEARNING GOALS"
                  : "YOUR PROFILE"}
              </span>

              <span>
                {currentStep === 0
                  ? "WELCOME"
                  : currentStep === 1
                  ? "01 / 02"
                  : "02 / 02"}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width:
                    currentStep === 0
                      ? "0%"
                      : currentStep === 1
                      ? "50%"
                      : "100%",
                }}
              />
            </div>
          </div>

          {currentStep === 0 && (
            <div className="onboarding-content">
              <div className="onboarding-label">
                <span className="label-star">✦</span>
                YOUR JOURNEY STARTS HERE
              </div>

              <h1>
                Let's find your
                <br />
                <span>way forward.</span>
              </h1>

              <p className="onboarding-description">
                Every great journey begins with understanding where
                you are and where you want to go. Let's build a
                learning experience that's completely yours.
              </p>

              <button
                className="onboarding-button"
                onClick={() => setCurrentStep(1)}
              >
                Let's get started
                <span className="button-arrow">→</span>
              </button>

              <div className="onboarding-note">
                <span>✦</span>
                It only takes a few minutes.
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="goals-content">
              <div className="onboarding-label">
                <span className="label-star">✦</span>
                LET'S GET TO KNOW YOU
              </div>

              <h1>
                What would you like
                <br />
                <span>to achieve?</span>
              </h1>

              <p className="goals-description">
                Choose the goals that matter to you.
                You can select more than one.
              </p>

              <div className="goals-grid">
                {learningGoals.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.title);

                  return (
                    <button
                      type="button"
                      key={goal.title}
                      className={`goal-card ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => toggleGoal(goal.title)}
                      aria-pressed={isSelected}
                    >
                      <span className="goal-icon">{goal.icon}</span>

                      <span className="goal-card-text">
                        <strong>{goal.title}</strong>
                        <small>{goal.description}</small>
                      </span>

                      <span className="goal-check">
                        {isSelected ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="goals-actions">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => setCurrentStep(0)}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="onboarding-button"
                  disabled={selectedGoals.length === 0}
                  onClick={() => {
                    setError("");
                    setCurrentStep(2);
                  }}
                >
                  Continue
                  <span className="button-arrow">→</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <form
              className="profile-content"
              onSubmit={saveOnboarding}
            >
              <div className="onboarding-label">
                <span className="label-star">✦</span>
                ALMOST THERE
              </div>

              <h1>
                Tell us about
                <br />
                <span>yourself.</span>
              </h1>

              <p className="goals-description">
                This helps Pathwise create a learning journey
                that matches your schedule and education.
              </p>

              <div className="profile-fields">
                <label className="profile-field">
                  <span>Institute</span>
                  <select
                    value={institute}
                    onChange={(e) => setInstitute(e.target.value)}
                  >
                    <option value="IIT_DHARWAD">
                      Indian Institute of Technology Dharwad
                    </option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>Degree</span>
                  <select value="B.Tech" disabled>
                    <option value="B.Tech">B.Tech</option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>Branch</span>
                  <select
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setError("");
                    }}
                  >
                    {branches.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="profile-field">
                  <span>Admission year</span>
                  <select
                    value={admissionYear}
                    onChange={(e) => setAdmissionYear(e.target.value)}
                  >
                    {[2023, 2024, 2025, 2026].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="profile-field">
                  <span>Current semester</span>
                  <select
                    value={currentSemester}
                    onChange={(e) =>
                      setCurrentSemester(e.target.value)
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                      <option key={item} value={item}>
                        Semester {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="profile-field">
                  <span>Programme</span>
                  <input
                    type="text"
                    value={`B.Tech — ${
                      branches.find((item) => item.value === branch)?.label
                    }`}
                    readOnly
                  />
                </label>

                <label className="profile-field">
                  <span>Current year of study</span>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                      <option key={item} value={item}>
                        Year {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="profile-field">
                  <span>Available learning hours per week</span>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={hoursPerWeek}
                    onChange={(e) =>
                      setHoursPerWeek(e.target.value)
                    }
                    required
                  />
                </label>
              </div>

              {error && (
                <p className="onboarding-error" role="alert">
                  {error}
                </p>
              )}

              <div className="goals-actions">
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    setError("");
                    setCurrentStep(1);
                  }}
                  disabled={loading}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  className="onboarding-button"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Complete onboarding"}
                  {!loading && (
                    <span className="button-arrow">→</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

        <footer className="onboarding-footer">
          <span>YOUR PATH.</span>
          <span>YOUR PACE.</span>
          <span>YOUR POTENTIAL.</span>
        </footer>
      </div>
    </main>
  );
}

export default Onboarding;
