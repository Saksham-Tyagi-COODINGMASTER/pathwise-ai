
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./AppLayout.css";

function AppLayout({ children }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem("pathwise_token");
    localStorage.removeItem("pathwise_user");
    navigate("/login", { replace: true });
  };

  const navigation = [
    { label: "Dashboard", path: "/dashboard", icon: "⌂" },
    { label: "Quizzes", path: "/quizzes", icon: "✦" },
    { label: "Self-Assessment", path: "/assessment", icon: "◈" },
    { label: "Learning Roadmap", path: "/roadmap", icon: "↗" },
    { label: "Settings", path: "/settings", icon: "⚙" },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/dashboard" className="app-sidebar-logo">
          <span className="app-logo-icon">P</span>
          <span className="app-logo-text">
            pathwise <span>AI</span>
          </span>
        </Link>

        <div className="app-sidebar-label">WORKSPACE</div>

        <nav className="app-sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `app-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="app-nav-icon">{item.icon}</span>
              <span className="app-nav-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-bottom">
          <button
            type="button"
            className="app-nav-link"
            onClick={handleSignOut}
          >
            <span className="app-nav-icon">↪</span>
            <span className="app-nav-text">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
