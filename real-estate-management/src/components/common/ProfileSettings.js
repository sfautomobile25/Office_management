import React, { useState } from "react";
import { authAPI } from "../../services/api";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [username, setUsername] = useState(savedUser?.username || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const saveUsername = async () => {
    try {
      setSavingName(true);
      const res = await authAPI.updateUsername(username);

      const updatedUser = res?.data?.user || { ...savedUser, username };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Username updated");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update username");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    try {
      setSavingPass(true);
      await authAPI.updatePassword(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update password");
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header expense-header">
        <h3>⚙️ Profile Settings</h3>
      </div>

      <div className="settings-grid">
        {/* Username */}
        <div className="settings-card">
          <div className="settings-card-title">Change Username</div>

          <label className="settings-label">Username</label>
          <div className="settings-row">
            <input
              className="settings-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter new username"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={saveUsername}
              disabled={savingName}
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="settings-hint">
            Username must be unique and at least 3 characters.
          </div>
        </div>

        {/* Password */}
        <div className="settings-card">
          <div className="settings-card-title">Change Password</div>

          <label className="settings-label">Current Password</label>
          <input
            type="password"
            className="settings-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
          />

          <label className="settings-label">New Password</label>
          <input
            type="password"
            className="settings-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
          />

          <button
            type="button"
            className="btn-secondary"
            onClick={changePassword}
            disabled={savingPass}
          >
            {savingPass ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

    </div>
  );
}
