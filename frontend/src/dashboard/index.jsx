import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axios";
import PlatformCard from "./Dashboard/PlatformCard";
import AchievementShelf from "./Dashboard/AchievementShelf";
import { FaSync } from "react-icons/fa";
import "./styles.css";
import { useNavigate } from "react-router-dom";

// Define API_URL using Vite's environment variable mechanism
const API_URL = import.meta.env.VITE_API_URL;

// Key for localStorage
const STORAGE_KEY = "dashboardProfiles";

const Dashboard = () => {
  const { user, updateUser, getToken } = useAuth();
  const navigate = useNavigate();

  // Initialize state from localStorage
  const [profiles, setProfiles] = useState(() => {
    try {
      const storedProfiles = localStorage.getItem(STORAGE_KEY);
      console.log(
        "Read from localStorage:",
        storedProfiles ? JSON.parse(storedProfiles) : {}
      );
      return storedProfiles ? JSON.parse(storedProfiles) : {};
    } catch (error) {
      console.error("Error reading profiles from localStorage:", error);
      return {}; // Start fresh if storage is corrupt
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [activePlatform, setActivePlatform] = useState("github");

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      // Avoid saving initial empty state if it hasn't been populated yet
      if (Object.keys(profiles).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
        console.log("Saved profiles to localStorage:", profiles);
      }
    } catch (error) {
      console.error("Error saving profiles to localStorage:", error);
    }
  }, [profiles]); // Run whenever profiles state updates

  // Log profiles state whenever it changes
  useEffect(() => {
    console.log("Dashboard profiles state updated:", profiles);
  }, [profiles]);

  const fetchProfileData = async (platform, username) => {
    if (!username) return;

    console.log(`Fetching ${platform} data for ${username}`);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available.");
      }

      const response = await fetch(
        `${API_URL}/api/platform/${platform}/${username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch ${platform} data`);
      }
      const data = await response.json();
      console.log(`Received ${platform} data:`, data);
      setProfiles((prev) => ({ ...prev, [platform]: data }));
    } catch (err) {
      console.error(`Error fetching ${platform} data:`, err);
      setError(err.message);
    }
  };

  const fetchProfiles = async (forceUpdate = false) => {
    if (!user) return;

    console.log(
      "Fetching all profiles for user:",
      user.clerk_id,
      "Force update:",
      forceUpdate
    );
    setError(null);

    try {
      const platformsToFetch = {
        github: "github_username",
        leetcode: "leetcode_username",
        codechef: "codechef_username",
        codeforces: "codeforces_username",
      };

      const promises = Object.entries(platformsToFetch).map(
        ([platform, usernameKey]) => {
          const username = user[usernameKey];
          if (username && (forceUpdate || !profiles[platform])) {
            console.log(`Fetching data for ${platform}: ${username}.`);
            return fetchProfileData(platform, username);
          }
          if (!username) {
            console.log(`No username found for ${platform} in user metadata.`);
          }
          return Promise.resolve();
        }
      );

      await Promise.all(promises);
      console.log("Finished fetching all profiles.");
    } catch (err) {
      console.error("Error fetching profiles:", err);
      setError(err.message);
    }
  };

  const handleSync = async () => {
    if (!user || isSyncing) return;

    console.log("Syncing all profiles");
    setIsSyncing(true);
    setError(null);

    try {
      await fetchProfiles(true);
    } catch (err) {
      console.error("Error syncing profiles:", err);
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    console.log(
      "User authentication state:",
      user ? "Authenticated" : "Not authenticated"
    );
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Coding Profiles Dashboard</h1>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Syncing...
            </>
          ) : (
            "Sync All Profiles"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {["github", "leetcode", "codechef", "codeforces"].map((platform) => (
          <button
            key={platform}
            onClick={() => setActivePlatform(platform)}
            className={`p-4 rounded-lg text-center transition-colors duration-150 ${
              activePlatform === platform
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 min-h-[300px]">
        {user && user[`${activePlatform}_username`] ? (
          <PlatformCard
            platform={activePlatform}
            data={profiles[activePlatform]}
            username={user[`${activePlatform}_username`]}
          />
        ) : (
          <div className="text-center text-gray-500 p-6">
            <p className="mb-4">No {activePlatform} username configured.</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => navigate("/settings")}
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
