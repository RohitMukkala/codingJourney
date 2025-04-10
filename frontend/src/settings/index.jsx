import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axios";
import { motion } from "framer-motion";
import "./styles.css";
import { apiUrl } from "../config";

// Get the API URL from the global variable, env variable, or direct fallback
const API_URL =
  window.API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://codingjourney.onrender.com";
console.log("Settings component using API URL:", API_URL); // Debug log

const Settings = () => {
  const { user, updateUser, getToken, backendError: authError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    leetcode_username: "",
    github_username: "",
    codechef_username: "",
    codeforces_username: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ general: "", usernames: {} });
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        leetcode_username: user.leetcode_username || "",
        github_username: user.github_username || "",
        codechef_username: user.codechef_username || "",
        codeforces_username: user.codeforces_username || "",
      });
    }
  }, [user]);

  // Show auth error in the settings form if present
  useEffect(() => {
    if (authError) {
      setErrors((prev) => ({
        ...prev,
        general: authError,
      }));
    }
  }, [authError]);

  const validateUsername = (platform, value) => {
    if (!value) return true;
    const USERNAME_PATTERNS = {
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      leetcode: /^[a-zA-Z0-9_-]{3,25}$/,
      github: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
      codechef: /^[a-zA-Z0-9_]{3,20}$/,
      codeforces: /^[a-zA-Z0-9_-]{3,24}$/,
    };
    return USERNAME_PATTERNS[platform].test(value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ general: "", usernames: {} });
    setSuccess("");

    try {
      // First, validate all usernames
      const validationErrors = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== "username" &&
          value &&
          !validateUsername(key.replace("_username", ""), value)
        ) {
          validationErrors[key] = `Invalid ${key.replace(
            "_username",
            ""
          )} username format`;
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        setErrors((prev) => ({
          ...prev,
          usernames: validationErrors,
        }));
        setLoading(false);
        return;
      }

      // Prepare data for backend according to UserUpdate schema
      const backendData = {
        username: formData.username || null,
        leetcode_username: formData.leetcode_username || null,
        github_username: formData.github_username || null,
        codechef_username: formData.codechef_username || null,
        codeforces_username: formData.codeforces_username || null,
      };

      // Use axios instance for the request
      const response = await axiosInstance.put("/api/settings", backendData);

      // Successfully updated
      if (response.status === 200 && response.data) {
        // Update the user data in Clerk
        await updateUser({
          unsafeMetadata: {
            ...user?.unsafeMetadata,
            ...backendData,
          },
        });

        setSuccess("Settings saved successfully!");

        // Update form data with the response data
        setFormData((prev) => ({
          ...prev,
          ...response.data,
        }));
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      let errorMessage = "Failed to update settings";

      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please try again.";
      } else if (!navigator.onLine) {
        errorMessage =
          "You appear to be offline. Please check your internet connection.";
      }

      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-content">
        <div className="settings-form">
          <h2>Profile Settings</h2>
          {success && <div className="success-message">{success}</div>}
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className={errors.usernames.username ? "invalid" : ""}
              />
              {errors.usernames.username && (
                <div className="error">
                  {typeof errors.usernames.username === "string"
                    ? errors.usernames.username
                    : "Invalid username format"}
                </div>
              )}
            </div>

            <div className="platform-section">
              <h3>Coding Platform Usernames</h3>
              {Object.entries(formData)
                .filter(([key]) => key !== "username")
                .map(([key, value]) => {
                  const platform = key.replace("_username", "");
                  return (
                    <div key={key} className="form-group">
                      <label>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </label>
                      <input
                        name={key}
                        value={value}
                        onChange={handleChange}
                        placeholder={`Enter your ${platform} username`}
                        className={errors.usernames[platform] ? "invalid" : ""}
                      />
                      {errors.usernames[platform] && (
                        <div className="error">
                          {typeof errors.usernames[platform] === "string"
                            ? errors.usernames[platform]
                            : `Invalid ${platform} username format`}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="button-group">
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="logout-button"
                onClick={() => window.Clerk.signOut()}
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
