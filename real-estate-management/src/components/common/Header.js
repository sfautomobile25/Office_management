import React from 'react';

function Header({ user, onLogout, toggleSidebar, sidebarOpen }) {
    return (
        <header className="header">
            <div className="header-left">
                <button 
                    className="sidebar-toggle" 
                    onClick={toggleSidebar}
                    aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {sidebarOpen ? '✕' : '☰'}
                </button>
                <h1>Real Estate Management Admin</h1>
            </div>
            <div className="header-right">
                <span className="user-info">
                    Welcome, <strong>{user?.username}</strong> ({user?.role})
                </span>
                <button onClick={onLogout} className="logout-btn">
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Header;