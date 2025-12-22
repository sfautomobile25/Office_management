import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children, user, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="layout">
            <Header 
                user={user} 
                onLogout={onLogout} 
                toggleSidebar={toggleSidebar} 
                sidebarOpen={sidebarOpen}
            />
            <div className="layout-content">
                <Sidebar isOpen={sidebarOpen} user={user} />
                <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;