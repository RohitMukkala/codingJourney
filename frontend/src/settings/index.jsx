import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axios";
import { motion } from "framer-motion";
import "./styles.css";

// Get the API URL from the global variable, env variable, or direct fallback
const API_URL =
  window.API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://codingjourney.onrender.com";
console.log("Settings component using API URL:", API_URL); // Debug log

const Settings = () => {
  const { user, updateUser, getToken } = useAuth();
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
      // Test connectivity first with a simple GET request
      try {
        const testResponse = await fetch(`${API_URL}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        console.log(
          "Test connectivity result:",
          testResponse.status,
          await testResponse.text()
        );
      } catch (testError) {
        console.error("Test connectivity failed:", testError);
      }

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

      // Verify we have an active session
      const session = await window.Clerk?.session;
      if (!session) {
        throw new Error("No active session found");
      }

      // Get a fresh token
      const token = await session.getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Prepare data for backend according to UserUpdate schema
      const backendData = {
        username: formData.username || null,
        leetcode_username: formData.leetcode_username || null,
        github_username: formData.github_username || null,
        codechef_username: formData.codechef_username || null,
        codeforces_username: formData.codeforces_username || null,
      };

      console.log("Sending settings update to:", `${API_URL}/api/settings`);
      console.log("With data:", backendData);
      console.log("Token length:", token ? token.length : 0);

      // Try a test request with POST instead of PUT (some hosts block PUT)
      try {
        console.log("Testing POST request first...");
        const testPost = await fetch(`${API_URL}/api/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        console.log("GET /api/users/me result:", testPost.status);
      } catch (postError) {
        console.error("GET test failed:", postError);
      }

      // Use fetch API instead of axios to debug CORS issues
      const response = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(backendData),
      });

      console.log("Settings update response status:", response.status);

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        data = { detail: responseText };
      }

      if (response.ok) {
        // Update the user data in Clerk
        await updateUser({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            ...backendData,
          },
        });

        setSuccess("Settings saved successfully!");

        // Update form data with the response data
        setFormData((prev) => ({
          ...prev,
          ...data,
        }));
      } else {
        const errorMessage = data?.detail || "Failed to update settings";
        setErrors((prev) => ({
          ...prev,
          general:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to update settings",
        }));
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      let errorMessage = "Failed to update settings";

      if (
        err.message === "No active session found" ||
        err.message === "Failed to get authentication token"
      ) {
        errorMessage = "Please sign in again to continue";
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (err.response?.status === 401) {
        errorMessage = "Your session has expired. Please sign in again.";
        setTimeout(async () => {
          try {
            await window.Clerk?.signOut();
            window.location.href = "/login";
          } catch (signOutError) {
            console.error("Error during sign out:", signOutError);
            window.location.href = "/login";
          }
        }, 2000);
      } else if (err.response?.data?.detail) {
        errorMessage =
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : "Failed to update settings";
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
