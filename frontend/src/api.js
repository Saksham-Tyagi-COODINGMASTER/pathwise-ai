const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

// Central function for communicating with the backend
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle backend errors
  if (!response.ok) {
    let errorMessage = "Something went wrong";

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = `Server error: ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// All backend API functions
export const api = {
  // Student
  registerStudent: (data) =>
    request("/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStudent: (studentId) =>
    request(`/students/${studentId}`),

  getAllStudents: () =>
    request("/students"),

  // Courses
  getCourses: () =>
    request("/courses"),

  // Assessment
  submitAssessment: (studentId, data) =>
    request(`/students/${studentId}/assessment`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboard: (studentId) =>
    request(`/students/${studentId}/dashboard`),

  // Mastery
  getMastery: (studentId) =>
    request(`/students/${studentId}/mastery`),

  // Learning
  getSkillGap: (studentId) =>
    request(`/students/${studentId}/skill-gap`),

  generatePlan: (studentId) =>
    request(`/students/${studentId}/generate-plan`, {
      method: "POST",
    }),

  // Quiz
  getQuiz: (courseId) =>
    request(`/courses/${courseId}/quiz`),

  submitQuiz: (studentId, data) =>
    request(`/students/${studentId}/quiz/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getQuizHistory: (studentId) =>
    request(`/students/${studentId}/quiz/history`),
};
