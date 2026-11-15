
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

const INSTITUTE_OPTIONS = [
  {
    value: "IIT_DHARWAD",
    label: "Indian Institute of Technology Dharwad",
  },
];

const BRANCH_OPTIONS = [
  { value: "CSE", label: "Computer Science and Engineering" },
  {
    value: "ECE",
    label: "Electronics and Communication Engineering",
  },
  {
    value: "EEE",
    label: "Electrical and Electronics Engineering",
  },
  { value: "EE", label: "Electrical Engineering" },
  { value: "Engineering Physics", label: "Engineering Physics" },
  {
    value: "Mathematics and Computing",
    label: "Mathematics and Computing",
  },
  {
    value: "Mechanical Engineering",
    label: "Mechanical Engineering",
  },
  {
    value: "Chemical and Biochemical Engineering",
    label: "Chemical and Biochemical Engineering",
  },
  {
    value: "Civil and Infrastructure Engineering",
    label: "Civil and Infrastructure Engineering",
  },
];

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const ADMISSION_YEAR_OPTIONS = [2023, 2024, 2025, 2026];

const PREFERENCE_OPTIONS = [
  "Visual learning",
  "Reading and notes",
  "Videos and tutorials",
  "Hands-on practice",
  "Quizzes and assessments",
  "Group learning",
  "Self-paced learning",
];

const EMPTY_FORM = {
  name: "",
  programme: "B.Tech",
  year: 1,
  institute: "IIT_DHARWAD",
  degree: "B.Tech",
  branch: "CSE",
  admission_year: 2025,
  current_semester: 1,
  hours_per_week: 5,
  goalsText: "",
  learning_preferences: [],
};

function getPictureUrl(picture) {
  if (!picture) return "";

  if (
    picture.startsWith("http://") ||
    picture.startsWith("https://")
  ) {
    return picture;
  }

  return `${API_URL}${picture.startsWith("/") ? "" : "/"}${picture}`;
}

function makeForm(profile) {
  const goals = Array.isArray(profile.goals)
    ? profile.goals
    : profile.goal
      ? [profile.goal]
      : [];

  return {
    name: profile.name || "",
    programme: profile.programme || "B.Tech",
    year: profile.year ?? 1,
    institute: profile.institute || "IIT_DHARWAD",
    degree: profile.degree || "B.Tech",
    branch:
      BRANCH_OPTIONS.find(
        (option) =>
          option.value === profile.branch ||
          option.label === profile.branch
      )?.value || profile.branch || "CSE",
    admission_year: profile.admission_year ?? 2025,
    current_semester: profile.current_semester ?? 1,
    hours_per_week: profile.hours_per_week ?? 5,
    goalsText: goals.join("\n"),
    learning_preferences: Array.isArray(
      profile.learning_preferences
    )
      ? profile.learning_preferences
      : [],
  };
}

function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureRemoving, setPictureRemoving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const savedUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("pathwise_user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("pathwise_token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/onboarding/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load your profile."
          );
        }

        setStudent(data);
        setForm(makeForm(data));

        // Keep the local account cache in sync with the server.
        try {
          const cachedUser = JSON.parse(
            localStorage.getItem("pathwise_user") || "{}"
          );

          localStorage.setItem(
            "pathwise_user",
            JSON.stringify({
              ...cachedUser,
              name: data.name,
              email: data.email || cachedUser.email,
              picture: data.picture
                ? getPictureUrl(data.picture)
                : null,
            })
          );
        } catch {
          // A cache error should not prevent Settings from loading.
        }
      } catch (err) {
        setError(
          err.message ||
            "Something went wrong while loading your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const syncCachedUser = (updates) => {
    try {
      const cachedUser = JSON.parse(
        localStorage.getItem("pathwise_user") || "{}"
      );

      localStorage.setItem(
        "pathwise_user",
        JSON.stringify({
          ...cachedUser,
          ...updates,
        })
      );
    } catch {
      // Local cache issues should not undo a successful API update.
    }
  };

  const togglePreference = (preference) => {
    setForm((current) => ({
      ...current,
      learning_preferences:
        current.learning_preferences.includes(preference)
          ? current.learning_preferences.filter(
              (item) => item !== preference
            )
          : [...current.learning_preferences, preference],
    }));
  };

  const cancelEditing = () => {
    setForm(makeForm(student));
    setEditing(false);
    setError("");
    setSuccess("");
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your image must be 5 MB or smaller.");
      return;
    }

    const token = localStorage.getItem("pathwise_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError("");
    setSuccess("");
    setPictureUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/settings/profile-picture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to upload your picture."
        );
      }

      setStudent((current) => ({
        ...current,
        picture: data.picture,
      }));

      syncCachedUser({
        picture: getPictureUrl(data.picture),
      });

      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      setError(err.message || "Picture upload failed.");
    } finally {
      setPictureUploading(false);
    }
  };

  const handlePictureRemove = async () => {
    const token = localStorage.getItem("pathwise_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError("");
    setSuccess("");
    setPictureRemoving(true);

    try {
      const response = await fetch(
        `${API_URL}/settings/profile-picture`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to remove your picture."
        );
      }

      setStudent((current) => ({
        ...current,
        picture: null,
      }));

      syncCachedUser({
        picture: null,
      });

      setSuccess("Profile picture removed successfully.");
    } catch (err) {
      setError(err.message || "Unable to remove your picture.");
    } finally {
      setPictureRemoving(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const goals = form.goalsText
      .split("\n")
      .map((goal) => goal.trim())
      .filter(Boolean);

    if (form.name.trim().length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    if (goals.length === 0) {
      setError("Please add at least one learning goal.");
      return;
    }

    if (
      !INSTITUTE_OPTIONS.some(
        (option) => option.value === form.institute
      )
    ) {
      setError("Please select a valid institute.");
      return;
    }

    if (
      !BRANCH_OPTIONS.some(
        (option) => option.value === form.branch
      )
    ) {
      setError("Please select a valid branch.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      programme: "B.Tech",
      year: Number(form.year),
      institute: form.institute,
      degree: "B.Tech",
      branch: form.branch,
      admission_year: Number(form.admission_year),
      current_semester: Number(form.current_semester),
      hours_per_week: Number(form.hours_per_week),
      goals,
      learning_preferences: form.learning_preferences,
    };

    const token = localStorage.getItem("pathwise_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/settings/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save your changes."
        );
      }

      const updatedStudent = data.student;

      setStudent(updatedStudent);
      setForm(makeForm(updatedStudent));
      setEditing(false);

      syncCachedUser({
        name: updatedStudent.name,
        picture: updatedStudent.picture
          ? getPictureUrl(updatedStudent.picture)
          : null,
      });

      setSuccess(
        data.message || "Your settings have been saved."
      );
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while saving your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("pathwise_token");
    localStorage.removeItem("pathwise_user");
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <main className="settings-page">
        <div className="settings-glow settings-glow-one" />
        <div className="settings-state">
          <div className="settings-loader" />
          <h2>Loading settings...</h2>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="settings-page">
        <div className="settings-glow settings-glow-one" />

        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">
              PATHWISE AI / ACCOUNT
            </span>
            <h1>
              Your <span>Settings</span>
            </h1>
          </div>

          <button
            type="button"
            className="settings-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </header>

        {error && (
          <div className="settings-alert settings-alert-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="settings-primary-btn"
          onClick={() => navigate("/onboarding")}
        >
          Complete onboarding →
        </button>
      </main>
    );
  }

  const goals = Array.isArray(student.goals)
    ? student.goals
    : student.goal
      ? [student.goal]
      : [];

  const email =
    student.email || savedUser.email || "Not available";

  const selectedBranch =
    BRANCH_OPTIONS.find(
      (option) => option.value === student.branch
    )?.label || student.branch || "Not provided";

  const selectedInstitute =
    INSTITUTE_OPTIONS.find(
      (option) => option.value === student.institute
    )?.label || student.institute || "Not provided";

  return (
    <main className="settings-page">
      <div className="settings-glow settings-glow-one" />
      <div className="settings-glow settings-glow-two" />

      <div className="settings-container">
        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">
              PATHWISE AI / ACCOUNT
            </span>

            <h1>
              Your <span>Settings</span>
            </h1>

            <p>
              Manage your academic profile and learning preferences.
            </p>
          </div>

          <button
            type="button"
            className="settings-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </header>

        {error && (
          <div
            className="settings-alert settings-alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="settings-alert settings-alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        <form
          className="settings-sections"
          onSubmit={handleSave}
        >
          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-eyebrow">
                  01 / PERSONAL
                </span>
                <h2>Profile information</h2>
                <p>
                  Your personal and academic information.
                </p>
              </div>

              <span className="settings-card-icon">◉</span>
            </div>

            {/* Profile picture */}
            <div className="settings-photo-section">
              <div className="settings-photo-preview">
                {student.picture ? (
                  <img
                    src={getPictureUrl(student.picture)}
                    alt="Your profile"
                    className="settings-profile-picture"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="settings-profile-picture settings-profile-fallback">
                    {(student.name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="settings-photo-details">
                <strong>Profile picture</strong>
                <p>
                  Choose a photo that represents you on Pathwise AI.
                  JPG, PNG or WebP · Maximum 5 MB.
                </p>

                <div className="settings-photo-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handlePictureUpload}
                  />

                  <button
                    type="button"
                    className="settings-photo-upload"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      pictureUploading ||
                      pictureRemoving
                    }
                  >
                    {pictureUploading
                      ? "Uploading..."
                      : student.picture
                        ? "Change Photo"
                        : "Upload Photo"}
                  </button>

                  {student.picture && (
                    <button
                      type="button"
                      className="settings-photo-remove"
                      onClick={handlePictureRemove}
                      disabled={
                        pictureUploading ||
                        pictureRemoving
                      }
                    >
                      {pictureRemoving
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-profile-grid">
              <label className="settings-field">
                <span>Full name</span>

                {editing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    minLength={2}
                    maxLength={100}
                  />
                ) : (
                  <strong>
                    {student.name || "Not provided"}
                  </strong>
                )}
              </label>

              <div className="settings-field">
                <span>
                  Email address
                  <small>Google account · read only</small>
                </span>
                <strong>{email}</strong>
              </div>

              <label className="settings-field">
                <span>Institute</span>

                {editing ? (
                  <select
                    value={form.institute}
                    onChange={(event) =>
                      updateField("institute", event.target.value)
                    }
                    required
                  >
                    {INSTITUTE_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>{selectedInstitute}</strong>
                )}
              </label>

              <label className="settings-field">
                <span>Degree</span>

                {editing ? (
                  <select value="B.Tech" disabled>
                    <option value="B.Tech">B.Tech</option>
                  </select>
                ) : (
                  <strong>{student.degree || "B.Tech"}</strong>
                )}
              </label>

              <label className="settings-field">
                <span>Branch</span>

                {editing ? (
                  <select
                    value={form.branch}
                    onChange={(event) =>
                      updateField("branch", event.target.value)
                    }
                    required
                  >
                    {BRANCH_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>{selectedBranch}</strong>
                )}
              </label>

              <div className="settings-field">
                <span>Programme</span>
                <strong>B.Tech</strong>
              </div>

              <label className="settings-field">
                <span>Admission year</span>

                {editing ? (
                  <select
                    value={form.admission_year}
                    onChange={(event) =>
                      updateField(
                        "admission_year",
                        event.target.value
                      )
                    }
                    required
                  >
                    {ADMISSION_YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>
                    {student.admission_year ?? "Not provided"}
                  </strong>
                )}
              </label>

              <label className="settings-field">
                <span>Current semester</span>

                {editing ? (
                  <select
                    value={form.current_semester}
                    onChange={(event) =>
                      updateField(
                        "current_semester",
                        event.target.value
                      )
                    }
                    required
                  >
                    {SEMESTER_OPTIONS.map((semester) => (
                      <option
                        key={semester}
                        value={semester}
                      >
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>
                    {student.current_semester
                      ? `Semester ${student.current_semester}`
                      : "Not provided"}
                  </strong>
                )}
              </label>

              <label className="settings-field">
                <span>Current year of study</span>

                {editing ? (
                  <select
                    value={form.year}
                    onChange={(event) =>
                      updateField("year", event.target.value)
                    }
                    required
                  >
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>
                    {student.year
                      ? `Year ${student.year}`
                      : "Not provided"}
                  </strong>
                )}
              </label>
            </div>

            {editing && (
              <p className="settings-note">
                These dropdown options are the same as the onboarding
                form.
              </p>
            )}
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-eyebrow">
                  02 / LEARNING
                </span>
                <h2>Learning preferences</h2>
                <p>
                  Personalise how Pathwise AI supports your learning.
                </p>
              </div>

              <span className="settings-card-icon">✦</span>
            </div>

            <label className="settings-field settings-hours">
              <span>Available learning hours per week</span>

              {editing ? (
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={form.hours_per_week}
                  onChange={(event) =>
                    updateField(
                      "hours_per_week",
                      event.target.value
                    )
                  }
                  required
                />
              ) : (
                <strong>
                  {student.hours_per_week ?? "Not provided"}
                  {student.hours_per_week != null
                    ? " hours"
                    : ""}
                </strong>
              )}
            </label>

            <label className="settings-field settings-goals-input">
              <span>
                Learning goals
                {editing && (
                  <small>Enter one goal per line</small>
                )}
              </span>

              {editing ? (
                <textarea
                  rows={4}
                  value={form.goalsText}
                  onChange={(event) =>
                    updateField("goalsText", event.target.value)
                  }
                  placeholder={
                    "Improve programming skills\nPrepare for internships"
                  }
                />
              ) : goals.length > 0 ? (
                <div className="settings-goal-list">
                  {goals.map((goal, index) => (
                    <div
                      className="settings-goal"
                      key={`${goal}-${index}`}
                    >
                      <span>✓</span>
                      {goal}
                    </div>
                  ))}
                </div>
              ) : (
                <strong>No learning goals added.</strong>
              )}
            </label>

            <div className="settings-preferences">
              <span className="settings-field-label">
                Preferred learning methods
              </span>

              {editing ? (
                <div className="settings-preference-grid">
                  {PREFERENCE_OPTIONS.map((preference) => (
                    <label
                      className="settings-checkbox"
                      key={preference}
                    >
                      <input
                        type="checkbox"
                        checked={form.learning_preferences.includes(
                          preference
                        )}
                        onChange={() =>
                          togglePreference(preference)
                        }
                      />
                      <span>{preference}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="settings-chip-list">
                  {student.learning_preferences?.length ? (
                    student.learning_preferences.map(
                      (preference) => (
                        <span
                          className="settings-chip"
                          key={preference}
                        >
                          {preference}
                        </span>
                      )
                    )
                  ) : (
                    <p className="settings-muted">
                      No learning preferences selected yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="settings-card settings-account-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-eyebrow">
                  03 / SECURITY
                </span>
                <h2>Account</h2>
                <p>
                  Your Google account email is managed by Google.
                </p>
              </div>

              <span className="settings-card-icon">⌑</span>
            </div>

            <div className="settings-account-row">
              <div>
                <strong>Signed in as</strong>
                <p>{email}</p>
              </div>

              <button
                type="button"
                className="settings-signout-btn"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </section>

          <div className="settings-form-actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="settings-cancel-btn"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="settings-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving changes..."
                    : "Save Changes →"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="settings-primary-btn"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setEditing(true);
                }}
              >
                Edit Profile & Settings →
              </button>
            )}
          </div>
        </form>

        <footer className="settings-footer">
          <span>YOUR PATH.</span>
          <span>YOUR PACE.</span>
          <span>YOUR POTENTIAL.</span>
        </footer>
      </div>
    </main>
  );
}

export default Settings;
