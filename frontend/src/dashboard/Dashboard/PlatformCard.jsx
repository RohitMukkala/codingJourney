import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaGithub, FaCode, FaStar, FaCodeBranch } from "react-icons/fa";
import { SiLeetcode, SiCodechef, SiCodeforces } from "react-icons/si";

// Helper component for displaying individual stats
const StatItem = ({ label, value, icon }) => (
  <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg text-center">
    <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
      {label}
    </span>
    <span className="text-lg font-semibold text-gray-800 flex items-center">
      {icon && React.createElement(icon, { className: "mr-1" })}
      {value !== null && value !== undefined ? value : "-"}
    </span>
  </div>
);

// Helper for language bars
const LanguageBar = ({ lang, percent }) => (
  <div className="mb-2">
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{lang}</span>
      <span className="text-gray-500">{percent?.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full"
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  </div>
);

// Helper for LeetCode progress bars
const ProgressBar = ({ label, solved, total, color }) => {
  const percentage = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className="text-gray-500">
          {solved} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
};

const PlatformCard = ({ platform, data, username }) => {
  const navigate = useNavigate();

  // Centralized configuration
  const platformConfig = {
    github: {
      icon: FaGithub,
      color: "bg-gray-800",
      usernamePattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
    },
    leetcode: {
      icon: SiLeetcode,
      color: "bg-yellow-500",
      usernamePattern: /^[a-zA-Z0-9_-]{3,25}$/,
    },
    codechef: {
      icon: SiCodechef,
      color: "bg-yellow-700",
      usernamePattern: /^[a-zA-Z0-9_]{3,20}$/,
    },
    codeforces: {
      icon: SiCodeforces,
      color: "bg-blue-700",
      usernamePattern: /^[a-zA-Z0-9_-]{3,24}$/,
    },
  };

  const config = platformConfig[platform];

  const renderNoUsername = () => (
    <div className="p-6 text-center">
      <p className="text-gray-600 mb-4">
        Valid {platform} username required to fetch data.
      </p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={() => navigate("/settings")}
      >
        Update in Settings
      </button>
    </div>
  );

  const renderStats = () => {
    switch (platform) {
      case "github":
        return (
          <div className="p-4 space-y-4">
            <div className="text-center text-sm font-mono bg-gray-100 p-1 rounded">
              @{username}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatItem
                label="Contributions"
                value={data?.totalContributions}
              />
              <StatItem
                label="Current Streak"
                value={data?.currentStreak ? `${data.currentStreak} d` : "-"}
              />
              <StatItem
                label="Longest Streak"
                value={data?.longestStreak ? `${data.longestStreak} d` : "-"}
              />
              <StatItem label="Stars" value={data?.totalStars} icon={FaStar} />
              <StatItem
                label="Forks"
                value={data?.totalForks}
                icon={FaCodeBranch}
              />
            </div>
            {data?.languages && Object.keys(data.languages).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                  Top Languages
                </h4>
                <div className="space-y-2">
                  {Object.entries(data.languages)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([lang, percent]) => (
                      <LanguageBar key={lang} lang={lang} percent={percent} />
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      case "leetcode":
        return (
          <div className="p-4 space-y-4">
            <div className="text-center text-sm font-mono bg-gray-100 p-1 rounded">
              @{username}
            </div>
            <StatItem label="Total Solved" value={data?.totalSolved} />
            <div className="pt-2">
              <ProgressBar
                label="Easy"
                solved={data?.easySolved}
                total={data?.totalSolved}
                color="#00B8A3"
              />
              <ProgressBar
                label="Medium"
                solved={data?.mediumSolved}
                total={data?.totalSolved}
                color="#FFC01E"
              />
              <ProgressBar
                label="Hard"
                solved={data?.hardSolved}
                total={data?.totalSolved}
                color="#FF375F"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                label="Ranking"
                value={data?.ranking ? `#${data.ranking}` : "-"}
              />
              <StatItem label="Reputation" value={data?.reputation} />
              <StatItem label="Contribution" value={data?.contributionPoints} />
            </div>
          </div>
        );
      case "codechef":
        return (
          <div className="p-4 space-y-4">
            <div className="text-center text-sm font-mono bg-gray-100 p-1 rounded">
              @{username}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Rating" value={data?.currentRating} />
              <StatItem label="Highest" value={data?.highestRating} />
              <StatItem
                label="Global Rank"
                value={data?.globalRank ? `#${data.globalRank}` : "-"}
              />
              <StatItem
                label="Country Rank"
                value={data?.countryRank ? `#${data.countryRank}` : "-"}
              />
            </div>
            {data?.stars && (
              <div className="text-center mt-2">
                <span
                  className={`inline-block px-3 py-1 text-sm font-semibold rounded-full text-white ${config.color}`}
                >
                  {data.stars} ⭐
                </span>
              </div>
            )}
          </div>
        );
      case "codeforces":
        return (
          <div className="p-4 space-y-4">
            <div className="text-center text-sm font-mono bg-gray-100 p-1 rounded">
              @{username}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Rating" value={data?.currentRating} />
              <StatItem label="Highest" value={data?.highestRating} />
              <StatItem label="Rank" value={data?.rank || "-"} />
              <StatItem
                label="Contribution"
                value={data?.contribution || "-"}
              />
              <StatItem label="Solved" value={data?.solvedProblems} />
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 text-center text-red-500">
            Unsupported platform: {platform}
          </div>
        );
    }
  };

  // Simple Loading placeholder
  const renderInitialLoading = () => (
    <div className="p-6 min-h-[150px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
    </div>
  );

  // Determine content based on state
  let content;
  if (!username || !config?.usernamePattern.test(username)) {
    content = renderNoUsername();
  } else if (data === undefined) {
    // Data is loading (hasn't arrived from parent yet)
    content = renderInitialLoading();
  } else {
    // Data has arrived (or might be explicitly null/empty from fetch, renderStats handles this)
    content = renderStats();
  }

  return (
    <motion.div
      className={`platform-card border rounded-lg shadow-md overflow-hidden bg-white`}
      style={{ borderColor: config?.color.replace("bg-", "#") }} // Crude color conversion for border
      whileHover={{ scale: 1.02, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div
        className={`card-header flex items-center p-3 text-white ${
          config?.color || "bg-gray-500"
        }`}
      >
        {config?.icon &&
          React.createElement(config.icon, { className: "mr-2", size: 20 })}
        <h3 className="font-semibold text-lg">
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </h3>
      </div>
      <div className="card-content">{content}</div>
    </motion.div>
  );
};

export default PlatformCard;
