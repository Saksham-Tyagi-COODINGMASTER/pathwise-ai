
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Quizzes.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

function Quizzes() {
  const navigate = useNavigate();

  const [curriculum, setCurriculum] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCurriculum = async () => {
      const token = localStorage.getItem("pathwise_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch the curriculum and the student's saved profile.
        const [curriculumResponse, profileResponse] =
          await Promise.all([
            fetch(`${API_URL}/curriculum/me`, { headers }),
            fetch(`${API_URL}/onboarding/me`, { headers }),
          ]);

        const curriculumData = await curriculumResponse.json();
        const profileData = await profileResponse.json();

        if (!curriculumResponse.ok) {
          throw new Error(
            curriculumData.detail ||
              "Unable to load your curriculum."
          );
        }

        if (!profileResponse.ok) {
          throw new Error(
            profileData.detail ||
              "Unable to load your profile information."
          );
        }

        // Support the profile response whether student details
        // are returned directly or inside a nested object.
        const semester =
          profileData.current_semester ??
          profileData.student?.current_semester ??
          profileData.profile?.current_semester ??
          profileData.onboarding?.current_semester ??
          curriculumData.current_semester ??
          curriculumData.student?.current_semester;

        const semesterNumber = Number(semester);

        if (
          !Number.isInteger(semesterNumber) ||
          semesterNumber < 1 ||
          semesterNumber > 8
        ) {
          throw new Error(
            "Your current semester could not be found. Please check your profile settings."
          );
        }

        setCurriculum(curriculumData);
        setCurrentSemester(semesterNumber);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, [navigate]);

  // Show only the semester selected in the student's profile.
  const semesters = (curriculum?.semesters || []).filter(
    (semester, index) => {
      const semesterNumber = Number(
        semester.semester ??
          semester.semester_number ??
          index + 1
      );

      return semesterNumber === currentSemester;
    }
  );

  const totalCourses = semesters.reduce(
    (total, semester) =>
      total + (semester.courses?.length || 0),
    0
  );

  const startQuiz = (course) => {
    const courseId =
      course.code || course.course_id || course.course_key;

    if (!courseId) {
      setError("This course does not have a valid course ID.");
      return;
    }

    navigate(`/quiz/${encodeURIComponent(courseId)}`);
  };

  if (loading) {
    return (
      <main className="quizzes-page">
        <div className="quizzes-state">
          <div className="quizzes-loader" />
          <h2>Loading your courses...</h2>
          <p>Preparing your personalized quiz library.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="quizzes-page">
      <header className="quizzes-header">
        <div>
          <span className="quizzes-eyebrow">
            PATHWISE AI / PRACTICE CENTER
          </span>

          <h1>
            Your <span>Quizzes</span>
          </h1>

          <p>
            Choose a course from your current semester to
            generate a personalized AI-powered quiz.
          </p>
        </div>

        <button
          className="quizzes-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </header>

      {error && (
        <div className="quizzes-error">
          {error}
        </div>
      )}

      <section className="quizzes-overview">
        <div className="quizzes-overview-card">
          <span>Your semester</span>
          <strong>
            {currentSemester
              ? `Semester ${currentSemester}`
              : "—"}
          </strong>
        </div>

        <div className="quizzes-overview-card">
          <span>Available courses</span>
          <strong>{totalCourses}</strong>
        </div>

        <div className="quizzes-overview-card">
          <span>Quiz mode</span>
          <strong>AI Powered</strong>
        </div>
      </section>

      {!curriculum ? (
        <section className="quizzes-empty">
          <div>📚</div>
          <h2>Unable to load curriculum</h2>
          <p>
            Your curriculum could not be loaded. Please try
            again or return to your dashboard.
          </p>

          <button
            className="quizzes-primary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </section>
      ) : semesters.length === 0 || totalCourses === 0 ? (
        <section className="quizzes-empty">
          <div>📚</div>
          <h2>
            No courses found for Semester {currentSemester}
          </h2>
          <p>
            There are currently no available courses for your
            selected semester. Check your profile or curriculum
            information.
          </p>

          <button
            className="quizzes-primary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </section>
      ) : (
        <section className="quizzes-semesters">
          {semesters.map((semester, index) => {
            const semesterNumber = Number(
              semester.semester ??
                semester.semester_number ??
                index + 1
            );

            return (
              <div
                className="quizzes-semester"
                key={
                  semester.semester_id ||
                  semester.id ||
                  semesterNumber
                }
              >
                <div className="quizzes-semester-heading">
                  <div>
                    <span className="quizzes-eyebrow">
                      SEMESTER {semesterNumber}
                    </span>

                    <h2>
                      {semester.name ||
                        `Semester ${semesterNumber}`}
                    </h2>
                  </div>

                  <span className="quizzes-course-count">
                    {semester.courses?.length || 0} courses
                  </span>
                </div>

                <div className="quizzes-course-grid">
                  {(semester.courses || []).map(
                    (course, courseIndex) => {
                      const courseId =
                        course.code ||
                        course.course_id ||
                        course.course_key;

                      return (
                        <article
                          className="quizzes-course-card"
                          key={
                            course.course_key ||
                            courseId ||
                            courseIndex
                          }
                        >
                          <div className="quizzes-course-top">
                            <span className="quizzes-course-icon">
                              ◈
                            </span>

                            <span className="quizzes-course-code">
                              {courseId || "COURSE"}
                            </span>
                          </div>

                          <h3>
                            {course.name ||
                              course.course_name ||
                              "Untitled Course"}
                          </h3>

                          <div className="quizzes-course-details">
                            <span>
                              {course.credits ?? "—"} Credits
                            </span>

                            <span>
                              {course.department ||
                                "Curriculum Course"}
                            </span>
                          </div>

                          <button
                            className="quizzes-primary-btn"
                            disabled={!courseId}
                            onClick={() => startQuiz(course)}
                          >
                            Generate Quiz →
                          </button>
                        </article>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default Quizzes;
