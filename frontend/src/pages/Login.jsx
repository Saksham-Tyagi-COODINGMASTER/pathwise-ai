
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "./Login.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://pathwise-ai-backend-b38t.onrender.com"
).replace(/\/$/, "");

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Google login failed.");
      }

      localStorage.setItem("pathwise_token", data.access_token);
      localStorage.setItem("pathwise_user", JSON.stringify(data.user));

      if (data.user.onboarding_completed) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      console.error("Google authentication error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <nav className="login-nav">
        <div className="login-logo">
          <span className="logo-symbol">P</span>
          <span>
            pathwise<span className="logo-ai"> AI</span>
          </span>
        </div>

        <a href="/" className="back-home">
          Back to home
        </a>
      </nav>

      <section className="login-container">
        <div className="login-card">
          <div className="login-icon">✦</div>

          <p className="login-eyebrow">YOUR JOURNEY STARTS HERE</p>

          <h1>
            Welcome to
            <br />
            <span>Pathwise AI.</span>
          </h1>

          <p className="login-description">
            Your personal AI learning companion.
            Sign in to discover your potential and build
            a learning path designed around you.
          </p>

          <div className="login-divider">
            <span>GET STARTED WITH</span>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError("Google sign-in was unsuccessful.")
              }
              theme="outline"
              shape="rectangular"
              size="large"
              text="continue_with"
              width="320"
            />
          </div>

          {loading && (
            <p className="login-status">Signing you in...</p>
          )}

          {error && (
            <p className="login-error">{error}</p>
          )}

          <p className="login-terms">
            By continuing, you agree to our Terms of Service
            and Privacy Policy.
          </p>
        </div>

        <p className="login-footer">
          Learn smarter. Grow faster. Go further.
        </p>
      </section>
    </main>
  );
}

export default Login;
