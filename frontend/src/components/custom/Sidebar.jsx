import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <h2 className="text-xl font-bold mb-6 px-2">Resume Builder</h2>
      <nav className="space-y-3">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="dashboard">
            🏠
          </span>
          Dashboard
        </Link>

        <Link
          to="/generate-resume"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="resume">
            📝
          </span>
          Generate Resume
        </Link>

        <Link
          to="/analyze-resume"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="analyze">
            🔍
          </span>
          Analyze Resume
        </Link>

        <Link
          to="/chat"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="chat">
            💬
          </span>
          Chat
        </Link>
        <Link
          to="/analysis"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="chart">
            📊
          </span>
          Analysis
        </Link>

        <Link
          to="/settings"
          onClick={onClose}
          className="sidebar-link flex items-center gap-2"
        >
          <span role="img" aria-label="settings">
            ⚙️
          </span>
          Settings
        </Link>
      </nav>
    </div>
  );
}
