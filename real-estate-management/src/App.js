import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";

import Layout from "./components/common/Layout";
import RequirePerm from "./components/common/RequirePerm";
import { PERMS } from "./components/common/permissionMap";

import { authAPI } from "./services/api";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Admin components
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

import Accounts from "./components/admin/Accounts";
import CashApproval from "./components/admin/CashApproval";
import Ledger from "./components/admin/Ledger";
import ProfitLoss from "./components/admin/ProfitLoss";
import BalanceSheet from "./components/admin/BalanceSheet";
import SettingsPage from "./components/common/ProfileSettings";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const t = setInterval(() => {
      authAPI.checkSession().catch(() => {});
    }, 12000);

    return () => clearInterval(t);
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.checkSession();
      if (response.data?.loggedIn) {
        setIsAuthenticated(true);
        setUser(response.data.user);

        // Keep local storage user in sync so RequirePerm/Sidebar can read it
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);

    if (userData?.token) {
      localStorage.setItem("token", userData.token);
    }

    // ✅ store user for permission checks
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
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
    localStorage.removeItem("user");
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
      <>
        {/* your routes/layout */}
        <ToastContainer
          position="top-center"
          autoClose={2500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
        />
      </>

      <div className="App">
        <Routes>
          {/* Public routes */}
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

          {/* Admin routes (nested) */}
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
            {/* Dashboard */}
            <Route
              path="dashboard"
              element={
                <RequirePerm perm={PERMS.DASHBOARD}>
                  <Dashboard user={user} />
                </RequirePerm>
              }
            />

            {/* User & Permission Management */}
            <Route
              path="users"
              element={
                <RequirePerm perm={PERMS.USER_MANAGE}>
                  <UserManagement />
                </RequirePerm>
              }
            />
            <Route
              path="permissions"
              element={
                <RequirePerm perm={PERMS.USER_MANAGE}>
                  <PermissionSettings />
                </RequirePerm>
              }
            />

            {/* System/Admin modules */}
            <Route
              path="config"
              element={
                <RequirePerm perm={PERMS.CONFIG}>
                  <SystemConfig />
                </RequirePerm>
              }
            />
            <Route
              path="backup"
              element={
                <RequirePerm perm={PERMS.BACKUP}>
                  <BackupRestore />
                </RequirePerm>
              }
            />
            <Route
              path="audit-logs"
              element={
                <RequirePerm perm={PERMS.AUDIT}>
                  <AuditLogs />
                </RequirePerm>
              }
            />
            <Route
              path="data-export"
              element={
                <RequirePerm perm={PERMS.DATA}>
                  <DataImportExport />
                </RequirePerm>
              }
            />
            <Route
              path="database"
              element={
                <RequirePerm perm={PERMS.DATABASE}>
                  <DatabaseManager />
                </RequirePerm>
              }
            />
            <Route
              path="content"
              element={
                <RequirePerm perm={PERMS.CONTENT}>
                  <ContentManagement />
                </RequirePerm>
              }
            />
            <Route
              path="seo"
              element={
                <RequirePerm perm={PERMS.SEO}>
                  <SEOTools />
                </RequirePerm>
              }
            />
            <Route
              path="analytics"
              element={
                <RequirePerm perm={PERMS.ANALYTICS}>
                  <Analytics />
                </RequirePerm>
              }
            />
            <Route
              path="security"
              element={
                <RequirePerm perm={PERMS.SECURITY}>
                  <SecurityMonitor />
                </RequirePerm>
              }
            />
            <Route
              path="performance"
              element={
                <RequirePerm perm={PERMS.PERFORMANCE}>
                  <PerformanceOptimizer />
                </RequirePerm>
              }
            />
            <Route
              path="languages"
              element={
                <RequirePerm perm={PERMS.LANGUAGE}>
                  <MultiLanguage />
                </RequirePerm>
              }
            />
            <Route
              path="currency"
              element={
                <RequirePerm perm={PERMS.CURRENCY}>
                  <CurrencyConverter />
                </RequirePerm>
              }
            />

            {/* Accounts/Cash */}
            <Route
              path="accounts"
              element={
                <RequirePerm perm={PERMS.ACCOUNTS}>
                  <Accounts />
                </RequirePerm>
              }
            />
            <Route
              path="cash-approval"
              element={
                <RequirePerm perm={PERMS.CASH_APPROVE}>
                  <CashApproval />
                </RequirePerm>
              }
            />

            {/* Reports */}
            <Route
              path="ledger"
              element={
                <RequirePerm perm={PERMS.REPORTS}>
                  <Ledger />
                </RequirePerm>
              }
            />
            <Route
              path="profit-loss"
              element={
                <RequirePerm perm={PERMS.REPORTS}>
                  <ProfitLoss />
                </RequirePerm>
              }
            />
            <Route
              path="balance-sheet"
              element={
                <RequirePerm perm={PERMS.REPORTS}>
                  <BalanceSheet />
                </RequirePerm>
              }
            />

            {/* default inside /admin */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Root redirect */}
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? "/admin/dashboard" : "/login"}
                replace
              />
            }
          />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? "/admin/dashboard" : "/login"}
                replace
              />
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
