import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Layout from "./components/common/Layout";
import { authAPI } from "./services/api";


// Import all admin components
import Dashboard from "./components/admin/Dashboard";
import UserManagement from "./components/admin/UserManagement";
import PermissionSettings from "./components/admin/PermissionSettings";
import SystemConfig from "./components/admin/SystemConfig";
import BackupRestore from "./components/admin/BackupRestore";
import AuditLogs from "./components/admin/AuditLogs";
import DataImportExport from "./components/admin/DataImportExport";
import DatabaseManager from "./components/admin/DatabaseManager";
import ContentManagement from "./components/admin/ContentManagement";
import SEOTools from "./components/admin/SEOTools";
import Analytics from "./components/admin/Analytics";
import SecurityMonitor from "./components/admin/SecurityMonitor";
import PerformanceOptimizer from "./components/admin/PerformanceOptimizer";
import MultiLanguage from "./components/admin/MultiLanguage";
import CurrencyConverter from "./components/admin/CurrencyConverter";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import Accounts from "./components/admin/Accounts";
import CashApproval from "./components/admin/CashApproval";
import Ledger from "./components/admin/Ledger";
import ProfitLoss from "./components/admin/ProfitLoss";
import BalanceSheet from "./components/admin/BalanceSheet";
import RequirePerm from './components/common/RequirePerm';
import { PERMS } from './components/common/permissionMap';


import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.checkSession();
      if (response.data.loggedIn) {
        setIsAuthenticated(true);
        setUser(response.data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    if (userData.token) {
      localStorage.setItem("token", userData.token);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("token");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Real Estate Management...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            }
          />
          <Route
            path="/register"
            element={
              !isAuthenticated ? (
                <Register />
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              !isAuthenticated ? (
                <ForgotPassword />
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route path="dashboard" element={<Dashboard user={user} />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="permissions" element={<PermissionSettings />} />
            <Route path="config" element={<SystemConfig />} />
            <Route path="backup" element={<BackupRestore />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="data-export" element={<DataImportExport />} />
            <Route path="database" element={<DatabaseManager />} />
            <Route path="content" element={<ContentManagement />} />
            <Route path="seo" element={<SEOTools />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="security" element={<SecurityMonitor />} />
            <Route path="performance" element={<PerformanceOptimizer />} />
            <Route path="languages" element={<MultiLanguage />} />
            <Route path="currency" element={<CurrencyConverter />} />
            <Route path="accounts" element={<Accounts />} />

            {/* default */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? "/admin/dashboard" : "/login"}
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? "/admin/dashboard" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
