import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { FaGithub, FaCode } from "react-icons/fa";
import { SiLeetcode, SiCodechef, SiCodeforces } from "react-icons/si";
import axiosInstance from "../../utils/axios";
import "./styles.css";

const ProfilePanel = () => {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axiosInstance.put(
        "/api/settings/profile-picture",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      await updateUser();
    } catch (error) {
      setUploadError(error.response?.data?.detail || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const getPlatformStatus = (platform) => {
    return user?.[`${platform}_username`] ? "connected" : "disconnected";
  };

  return (
    <div className="profile-panel-content">
      <div className="photo-upload-container">
        <motion.div
          className="photo-circle"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt="Profile"
              className="profile-photo"
            />
          ) : (
            <div className="upload-placeholder">
              <FaCode size={40} />
              <p>{uploading ? "Uploading..." : "Upload Photo"}</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e.target.files[0])}
            disabled={uploading}
            className="photo-input"
          />
        </motion.div>
        {uploadError && <div className="upload-error">{uploadError}</div>}
      </div>

      <div className="user-details">
        <div className="name-container">
          <h2 className="user-name">
            {user?.email || "Anonymous Coder"}
            {user?.email && (
              <span className="verified-badge" title="Verified">
                ✓
              </span>
            )}
          </h2>
          <p className="user-email">{user?.email || "No email provided"}</p>
        </div>

        <div className="clerk-id">
          <span>Clerk ID:</span>
          <code>{user?.clerk_id}</code>
        </div>
      </div>

      <div className="platform-connections">
        <h3>Connected Platforms</h3>
        <div className="connection-grid">
          <div className={`platform-icon ${getPlatformStatus("github")}`}>
            <FaGithub size={24} />
            {user?.github_username && (
              <span className="platform-username">@{user.github_username}</span>
            )}
          </div>
          <div className={`platform-icon ${getPlatformStatus("leetcode")}`}>
            <SiLeetcode size={24} />
            {user?.leetcode_username && (
              <span className="platform-username">
                @{user.leetcode_username}
              </span>
            )}
          </div>
          <div className={`platform-icon ${getPlatformStatus("codechef")}`}>
            <SiCodechef size={24} />
            {user?.codechef_username && (
              <span className="platform-username">
                @{user.codechef_username}
              </span>
            )}
          </div>
          <div className={`platform-icon ${getPlatformStatus("codeforces")}`}>
            <SiCodeforces size={24} />
            {user?.codeforces_username && (
              <span className="platform-username">
                @{user.codeforces_username}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
