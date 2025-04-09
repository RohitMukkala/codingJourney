import React from "react";
import { motion } from "framer-motion";
import { FaTrophy, FaStar, FaCode, FaFire } from "react-icons/fa";
import "./styles.css";

const AchievementShelf = ({ achievements }) => {
  const calculateAchievements = () => {
    const achievementsList = [];
    const { github, leetcode, codechef, codeforces } = achievements;

    // GitHub Achievements
    if (github?.contributions) {
      const { current_streak, total_contributions } = github.contributions;
      const { stars } = github.stats || {};

      if (current_streak >= 7) {
        achievementsList.push({
          icon: <FaFire />,
          title: "Consistent Contributor",
          description: `${current_streak} day streak!`,
          color: "#ff9800",
          platform: "github",
        });
      }

      if (stars >= 10) {
        achievementsList.push({
          icon: <FaStar />,
          title: "Star Collector",
          description: `${stars} repository stars earned`,
          color: "#ffd700",
          platform: "github",
        });
      }

      if (total_contributions >= 1000) {
        achievementsList.push({
          icon: <FaCode />,
          title: "Commit Master",
          description: `${total_contributions}+ total contributions`,
          color: "#00b8d4",
          platform: "github",
        });
      }
    }

    // LeetCode Achievements
    if (leetcode?.total_problems_solved) {
      const { total_problems_solved, hard_solved } = leetcode;

      if (total_problems_solved >= 100) {
        achievementsList.push({
          icon: <FaCode />,
          title: "Century Club",
          description: "100+ problems solved",
          color: "#00b8d4",
          platform: "leetcode",
        });
      }

      if (hard_solved >= 10) {
        achievementsList.push({
          icon: <FaTrophy />,
          title: "Hard Worker",
          description: "10+ hard problems solved",
          color: "#f50057",
          platform: "leetcode",
        });
      }
    }

    // CodeChef Achievements
    if (codechef?.current_rating) {
      const { current_rating } = codechef;

      if (current_rating >= 1800) {
        achievementsList.push({
          icon: <FaTrophy />,
          title: "CodeChef Expert",
          description: "Rating 1800+",
          color: "#ff5722",
          platform: "codechef",
        });
      }

      if (current_rating >= 2000) {
        achievementsList.push({
          icon: <FaTrophy />,
          title: "CodeChef Master",
          description: "Rating 2000+",
          color: "#d32f2f",
          platform: "codechef",
        });
      }
    }

    // Codeforces Achievements
    if (codeforces?.codeforces_rating) {
      const { codeforces_rating, problems_solved_count } = codeforces;

      if (codeforces_rating >= 1400) {
        achievementsList.push({
          icon: <FaTrophy />,
          title: "Codeforces Specialist",
          description: "Rating 1400+",
          color: "#2196f3",
          platform: "codeforces",
        });
      }

      if (problems_solved_count >= 50) {
        achievementsList.push({
          icon: <FaCode />,
          title: "Problem Solver",
          description: "50+ problems solved",
          color: "#4caf50",
          platform: "codeforces",
        });
      }
    }

    return achievementsList.sort((a, b) => b.color.localeCompare(a.color));
  };

  const achievementItems = calculateAchievements();

  if (achievementItems.length === 0) return null;

  return (
    <div className="achievement-shelf">
      <h2>🏆 Achievements</h2>
      <div className="achievements-grid">
        {achievementItems.map((achievement, index) => (
          <motion.div
            key={`${achievement.platform}-${index}`}
            className="achievement-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{
              backgroundColor: `${achievement.color}20`,
              borderLeft: `4px solid ${achievement.color}`,
            }}
          >
            <div className="achievement-header">
              <div
                className="platform-indicator"
                style={{ backgroundColor: achievement.color }}
              >
                {achievement.platform.charAt(0).toUpperCase()}
              </div>
              <div
                className="achievement-icon"
                style={{ color: achievement.color }}
              >
                {achievement.icon}
              </div>
            </div>
            <div className="achievement-info">
              <h3>{achievement.title}</h3>
              <p>{achievement.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementShelf;
