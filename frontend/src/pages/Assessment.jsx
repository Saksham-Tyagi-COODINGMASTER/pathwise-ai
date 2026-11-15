
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Assessment.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Assessment() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [branch, setBranch] = useState("");
  const [currentSemester, setCurrentSemester] = useState(null);

  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState("");

  const [skillLevels, setSkillLevels] = useState({});
  const [confidenceLevels, setConfidenceLevels] = useState({});
  const [interests, setInterests] = useState([]);
  const [availableHours, setAvailableHours] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const courseNames = useMemo(
    () => courses.map((course) => course.name),
    [courses]
  );

  useEffect(() => {
    let active = true;

    const loadCurriculum = async () => {
      setCurriculumLoading(true);
      setCurriculumError("");

      try {
        const token = localStorage.getItem("pathwise_token");

        if (!token) {
          throw new Error("Please log in to load your curriculum.");
        }

        const response = await fetch(`${API_URL}/curriculum/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load your curriculum."
          );
        }

        const semester = Number(data.current_semester);

        const semesterData = data.semesters?.find(
          (item) => Number(item.semester) === semester
        );

        const verifiedCourses = (
          semesterData?.courses || []
        ).filter(
          (course) =>
            course.status === "verified" &&
            !course.is_elective &&
            course.name &&
            !/elective|placeholder/i.test(course.name)
        );

        const uniqueCourses = [];
        const seenNames = new Set();

        verifiedCourses.forEach((course) => {
          const normalizedName = course.name.trim().toLowerCase();

          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            uniqueCourses.push(course);
          }
        });

        if (!active) return;

        if (uniqueCourses.length === 0) {
          throw new Error(
            `No verified courses were found for ${data.branch || "your branch"} in Semester ${semester}.`
          );
        }

        setCourses(uniqueCourses);
        setBranch(data.branch || "");
        setCurrentSemester(semester);

        setSkillLevels({});
        setConfidenceLevels({});
        setInterests([]);
      } catch (err) {
        if (active) {
          setCurriculumError(
            err.message || "Unable to load your curriculum."
          );
        }
      } finally {
        if (active) {
          setCurriculumLoading(false);
        }
      }
    };

    loadCurriculum();

    return () => {
      active = false;
    };
  }, []);

  // Selecting Pass / No Pass in either rating section
  // marks the whole course as not requiring skill-gap recommendations.
  const updateRating = (courseName, value, ratingType) => {
    if (value === -1) {
      setSkillLevels((previous) => ({
        ...previous,
        [courseName]: -1,
      }));

      setConfidenceLevels((previous) => ({
        ...previous,
        [courseName]: -1,
      }));

      setError("");
      return;
    }

    if (ratingType === "skill") {
      setSkillLevels((previous) => ({
        ...previous,
        [courseName]: Number(value),
      }));

      // If the course was previously marked Pass / No Pass,
      // require a fresh confidence rating before including it.
      setConfidenceLevels((previous) => {
        if (previous[courseName] !== -1) return previous;

        const updated = { ...previous };
        delete updated[courseName];
        return updated;
      });
    } else {
      setConfidenceLevels((previous) => ({
        ...previous,
        [courseName]: Number(value),
      }));

      setSkillLevels((previous) => {
        if (previous[courseName] !== -1) return previous;

        const updated = { ...previous };
        delete updated[courseName];
        return updated;
      });
    }

    setError("");
  };

  const toggleInterest = (interest) => {
    setInterests((previous) =>
      previous.includes(interest)
        ? previous.filter((item) => item !== interest)
        : [...previous, interest]
    );

    setError("");
  };

  const isRatingComplete = (ratings) =>
    courseNames.every(
      (courseName) => ratings[courseName] !== undefined
    );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (curriculumLoading || courses.length === 0) {
      setError("Your curriculum is not ready yet.");
      return;
    }

    if (!isRatingComplete(skillLevels)) {
      setError(
        "Please complete all knowledge ratings. Choose 0–5 or Pass / No Pass."
      );
      return;
    }

    if (!isRatingComplete(confidenceLevels)) {
      setError(
        "Please complete all confidence ratings. Choose 0–5 or Pass / No Pass."
      );
      return;
    }

    if (interests.length === 0) {
      setError("Please select at least one learning interest.");
      return;
    }

    const token = localStorage.getItem("pathwise_token");

    let savedUser = {};

    try {
      savedUser = JSON.parse(
        localStorage.getItem("pathwise_user") || "{}"
      );
    } catch {
      savedUser = {};
    }

    const studentId = savedUser.student_id || savedUser.id;

    if (!token || !studentId) {
      setError(
        "Your login or student profile is missing. Please log in again."
      );
      return;
    }

    const payload = {
      skill_levels: skillLevels,
      interests,
      confidence_levels: confidenceLevels,
      available_hours: Number(availableHours),
    };

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/students/${studentId}/assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Assessment submission failed."
        );
      }

      navigate("/roadmap");
    } catch (err) {
      setError(err.message || "Unable to submit assessment.");
    } finally {
      setLoading(false);
    }
  };

  const renderRating = (course, values, ratingType, label) => {
    const courseName = course.name;
    const selectedValue = values[courseName];

    const isPassNoPass =
      skillLevels[courseName] === -1 ||
      confidenceLevels[courseName] === -1;

    return (
      <div className="rating-group">
        <div className="rating-heading">
          <span>
            {courseName}
            {course.code && (
              <small className="assessment-course-code">
                {course.code}
              </small>
            )}
          </span>

          <strong>
            {isPassNoPass
              ? "Pass / No Pass"
              : selectedValue === undefined
                ? "Not rated"
                : `${selectedValue} / 5`}
          </strong>
        </div>

        <div className="rating-options">
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              className={
                selectedValue === value && !isPassNoPass
                  ? "rating-option selected"
                  : "rating-option"
              }
              onClick={() =>
                updateRating(courseName, value, ratingType)
              }
              aria-label={`${label} for ${courseName}: ${value}`}
              aria-pressed={
                selectedValue === value && !isPassNoPass
              }
            >
              {value}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={
            isPassNoPass
              ? "rating-pass-option selected"
              : "rating-pass-option"
          }
          onClick={() =>
            updateRating(courseName, -1, ratingType)
          }
          aria-pressed={isPassNoPass}
        >
          Pass / No Pass — Skip skill recommendations
        </button>

        <div className="rating-scale">
          <span>0 — No knowledge</span>
          <span>5 — Excellent</span>
        </div>
      </div>
    );
  };

  const completedRatings =
    courseNames.filter(
      (name) => skillLevels[name] !== undefined
    ).length +
    courseNames.filter(
      (name) => confidenceLevels[name] !== undefined
    ).length;

  const totalRatings = courseNames.length * 2;

  const progress = totalRatings
    ? Math.round((completedRatings / totalRatings) * 100)
    : 0;

  if (curriculumLoading) {
    return (
      <main className="assessment-page">
        <div className="assessment-container assessment-state">
          <div className="assessment-loader" />
          <h2>Loading your curriculum...</h2>
          <p>Preparing courses for your branch and semester.</p>
        </div>
      </main>
    );
  }

  if (curriculumError) {
    return (
      <main className="assessment-page">
        <div className="assessment-container assessment-state">
          <h2>Couldn't load your courses</h2>
          <p className="assessment-error" role="alert">
            {curriculumError}
          </p>
          <button
            type="button"
            className="assessment-submit-btn"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="assessment-page">
      <div className="assessment-container">
        <header className="assessment-header">
          <span className="assessment-eyebrow">
            PATHWISE AI · PERSONALIZATION
          </span>

          <h1>
            Let's understand your <span>skills.</span>
          </h1>

          <p>
            Rate your knowledge and confidence in the courses
            you're currently studying. We'll use your answers
            to build your learning roadmap.
          </p>

          <div className="assessment-curriculum-info">
            <span>{branch}</span>
            <span>Semester {currentSemester}</span>
            <span>{courses.length} verified courses</span>
          </div>
        </header>

        <div className="assessment-progress">
          <div className="assessment-progress-info">
            <span>Assessment progress</span>
            <strong>{progress}%</strong>
          </div>

          <div className="assessment-progress-track">
            <div
              className="assessment-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="assessment-progress-count">
            {completedRatings} of {totalRatings} ratings completed
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <section className="assessment-section">
            <div className="assessment-section-heading">
              <span className="assessment-step">01</span>
              <div>
                <h2>Rate your current knowledge</h2>
                <p>
                  How much do you currently know about each course?
                </p>
              </div>
            </div>

            <div className="assessment-rating-list">
              {courses.map((course) => (
                <div
                  className="assessment-rating-card"
                  key={course.course_key}
                >
                  {renderRating(
                    course,
                    skillLevels,
                    "skill",
                    "Knowledge level"
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="assessment-section">
            <div className="assessment-section-heading">
              <span className="assessment-step">02</span>
              <div>
                <h2>Rate your confidence</h2>
                <p>
                  How confident are you when studying or applying
                  each course?
                </p>
              </div>
            </div>

            <div className="assessment-rating-list">
              {courses.map((course) => (
                <div
                  className="assessment-rating-card"
                  key={course.course_key}
                >
                  {renderRating(
                    course,
                    confidenceLevels,
                    "confidence",
                    "Confidence level"
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="assessment-section">
            <div className="assessment-section-heading">
              <span className="assessment-step">03</span>
              <div>
                <h2>Choose your interests</h2>
                <p>
                  Select the courses you are most interested in
                  learning more about.
                </p>
              </div>
            </div>

            <div className="interest-grid">
              {courses.map((course) => (
                <button
                  type="button"
                  key={course.course_key}
                  className={
                    interests.includes(course.name)
                      ? "interest-option selected"
                      : "interest-option"
                  }
                  onClick={() => toggleInterest(course.name)}
                  aria-pressed={interests.includes(course.name)}
                >
                  <span>
                    {interests.includes(course.name) ? "✓" : "+"}
                  </span>
                  {course.name}
                </button>
              ))}
            </div>
          </section>

          <section className="assessment-section">
            <div className="assessment-section-heading">
              <span className="assessment-step">04</span>
              <div>
                <h2>Your weekly availability</h2>
                <p>
                  How many hours can you dedicate to learning each week?
                </p>
              </div>
            </div>

            <div className="hours-card">
              <div className="hours-value">
                <strong>{availableHours}</strong>
                <span>hours per week</span>
              </div>

              <input
                type="range"
                min="1"
                max="40"
                value={availableHours}
                onChange={(event) =>
                  setAvailableHours(Number(event.target.value))
                }
                className="hours-slider"
              />

              <div className="hours-scale">
                <span>1 hour</span>
                <span>40 hours</span>
              </div>
            </div>
          </section>

          {error && (
            <div className="assessment-error" role="alert">
              {error}
            </div>
          )}

          <div className="assessment-submit-area">
            <p>
              Your answers will help Pathwise create a personalized
              learning roadmap for your branch.
            </p>

            <button
              type="submit"
              className="assessment-submit-btn"
              disabled={loading}
            >
              {loading
                ? "Saving your assessment..."
                : "Generate My Learning Roadmap →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default Assessment;
