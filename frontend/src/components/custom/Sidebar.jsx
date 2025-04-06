import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <h2 className="text-xl font-bold mb-6 px-2">Resume Builder</h2>
      <nav className="space-y-3">
        <Link to="/dashboard" onClick={onClose} className="sidebar-link">
          Dashboard
        </Link>
        <Link to="/generate-resume" onClick={onClose} className="sidebar-link">
          Generate Resume
        </Link>
        <Link to="/analyze-resume" onClick={onClose} className="sidebar-link">
          Analyze Resume
        </Link>
        <Link to="/chat" onClick={onClose} className="sidebar-link">
          Chat
        </Link>
      </nav>
    </div>
  );
}
