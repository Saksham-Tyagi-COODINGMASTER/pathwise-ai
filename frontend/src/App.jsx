
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Assessment from "./pages/Assessment";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import Quiz from "./pages/Quiz";
import NotFound from "./pages/NotFound";
import Quizzes from "./pages/Quizzes";
import Settings from "./pages/Settings";

import AppLayout from "./components/AppLayout";

// Read saved login information.
function getStoredUser() {
  try {
    const user = JSON.parse(
      localStorage.getItem("pathwise_user") || "null"
    );

    if (!user) return null;

    return {
      ...user,
      onboarding_completed:
        user.onboarding_completed ??
        user.onboarding_complete ??
        user["onboarding complete"] ??
        false,
    };
  } catch {
    return null;
  }
}

// Protect routes that require login.
function RequireAuth({ children }) {
  const token = localStorage.getItem("pathwise_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Protect routes that require completed onboarding.
function RequireOnboarding({ children }) {
  const token = localStorage.getItem("pathwise_token");
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Shared layout for authenticated pages.
function StudentLayout({ children }) {
  return (
    <RequireOnboarding>
      <AppLayout>{children}</AppLayout>
    </RequireOnboarding>
  );
}

// Prevent returning students from seeing onboarding again.
function OnboardingRoute() {
  const token = localStorage.getItem("pathwise_token");
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Onboarding />;
}

function App() {
  return (
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/onboarding"
          element={<OnboardingRoute />}
        />

        {/* Dashboard retains its existing sidebar. */}
        <Route
  path="/dashboard"
  element={
    <StudentLayout>
      <Dashboard />
    </StudentLayout>
  }
/>
        <Route
          path="/assessment"
          element={
            <StudentLayout>
              <Assessment />
            </StudentLayout>
          }
        />

        <Route
          path="/quizzes"
          element={
            <StudentLayout>
              <Quizzes />
            </StudentLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <StudentLayout>
              <Settings />
            </StudentLayout>
          }
        />

        <Route
          path="/roadmap"
          element={
            <StudentLayout>
              <Roadmap />
            </StudentLayout>
          }
        />

        <Route
          path="/quiz/:courseId"
          element={
            <StudentLayout>
              <Quiz />
            </StudentLayout>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;
