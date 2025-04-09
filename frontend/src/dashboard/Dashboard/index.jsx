import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../utils/axios";
import PlatformCard from "./PlatformCard";
import AchievementShelf from "./AchievementShelf";
import { FaSync } from "react-icons/fa";
import "./styles.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState({
    overall: true,
    github: false,
    leetcode: false,
    codechef: false,
    codeforces: false,
  });
  const [syncStatus, setSyncStatus] = useState("");

  const platformConfig = {
    github: { endpoint: "github", icon: "github" },
    leetcode: { endpoint: "leetcode", icon: "leetcode" },
    codechef: { endpoint: "codechef", icon: "codechef" },
    codeforces: { endpoint: "codeforces", icon: "codeforces" },
  };

  const fetchPlatformData = async (platform) => {
    try {
      setLoading((prev) => ({ ...prev, [platform]: true }));
      const { data } = await axiosInstance.get(
        `/api/${platformConfig[platform].endpoint}/${
          user[`${platform}_username`]
        }`
      );
      setProfileData((prev) => ({
        ...prev,
        [platform]: data,
      }));
    } catch (error) {
      console.error(`Error fetching ${platform} data:`, error);
      setProfileData((prev) => ({
        ...prev,
        [platform]: { error: "Failed to fetch data" },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const fetchAllPlatformData = async () => {
    setLoading((prev) => ({ ...prev, overall: true }));
    try {
      const { data } = await axiosInstance.get("/api/profiles");
      setProfileData(data);
    } catch (error) {
      console.error("Error fetching all profiles:", error);
    } finally {
      setLoading((prev) => ({ ...prev, overall: false }));
    }
  };

  const handleSync = async () => {
    try {
      setSyncStatus("Syncing...");
      await axiosInstance.post("/api/sync-profiles");
      await fetchAllPlatformData();
      setSyncStatus("Sync complete!");
      setTimeout(() => setSyncStatus(""), 2000);
    } catch (error) {
      setSyncStatus("Sync failed");
      console.error("Sync error:", error);
    }
  };

  useEffect(() => {
    if (user?.clerk_id) {
      fetchAllPlatformData();
    }
  }, [user?.clerk_id]);

  if (!user) {
    return (
      <div className="dashboard-container">
        <h2>Please log in to view your dashboard</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <nav className="platform-tabs">
          <motion.button
            className={`tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Overview
          </motion.button>

          {Object.keys(platformConfig).map((platform) => (
            <motion.button
              key={platform}
              className={`tab ${activeTab === platform ? "active" : ""}`}
              onClick={() => setActiveTab(platform)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </motion.button>
          ))}

          <div className="sync-container">
            <motion.button
              className="sync-button"
              onClick={handleSync}
              disabled={loading.overall}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaSync className={loading.overall ? "rotating" : ""} />
              {syncStatus || (loading.overall ? "Syncing..." : "Sync Now")}
            </motion.button>
          </div>
        </nav>

        <div className="platform-cards">
          {activeTab === "overview" ? (
            <>
              {Object.keys(platformConfig).map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  data={profileData[platform]}
                  loading={loading[platform]}
                  username={user[`${platform}_username`]}
                />
              ))}
            </>
          ) : (
            <PlatformCard
              platform={activeTab}
              data={profileData[activeTab]}
              loading={loading[activeTab]}
              username={user[`${activeTab}_username`]}
              expanded
            />
          )}
        </div>

        <AchievementShelf achievements={profileData} username={user.clerk_id} />
      </main>
    </div>
  );
};

export default Dashboard;
