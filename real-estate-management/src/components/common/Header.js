import React from "react";
import { useNavigate } from "react-router-dom";

function Header({ user, onLogout, toggleSidebar, sidebarOpen }) {


      const navigate = useNavigate();


  return (
    <header className="header">
      <div className="header-left">
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <h1>Real Estate Management Admin</h1>
      </div>
      <div className="header-auth-actions">
        <span className="user-info">
          Welcome, <strong>{user?.username}</strong> ({user?.role})
        </span>
        <button onClick={onLogout} className="btn-logout btn-secondary">
          Logout
        </button>
        <button
          className=" btn-settings btn-secondary"
          onClick={() => navigate("/settings")}
          type="button"
        >
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}

export default Header;
