import React, { useEffect, useState, useRef } from "react";
import { apiUrl } from "./config";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAuth } from "./context/AuthContext";
import "./pdf-style.css";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#a83232",
  "#32a852",
];

function downloadCSV(profiles) {
  if (!profiles.length) return;
  const header = Object.keys(profiles[0]);
  const csv = [
    header.join(","),
    ...profiles.map((row) =>
      header.map((field) => JSON.stringify(row[field] ?? "")).join(",")
    ),
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analysis_data.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}

// This function will apply and then remove styles, ensuring the UI is not permanently changed.
function downloadPDF(ref) {
  if (!ref.current) return;

  const elementToCapture = ref.current;

  // 1. Define a map of problematic classes to the safe inline styles
  const styleOverrides = {
    // Gradient on the main background (we'll make it a solid color)
    ".from-blue-50.to-blue-200": { property: "background", value: "#f0f8ff" },
    // Card backgrounds
    ".bg-blue-50": { property: "backgroundColor", value: "#eff6ff" },
    // Button backgrounds
    ".bg-blue-700": { property: "backgroundColor", value: "#1d4ed8" },
    ".bg-green-600": { property: "backgroundColor", value: "#16a34a" },
    // Text colors
    ".text-blue-900": { property: "color", value: "#1e3a8a" },
    ".text-blue-800": { property: "color", value: "#1e40af" },
  };

  // 2. Apply the safe styles directly to the elements
  for (const [selector, style] of Object.entries(styleOverrides)) {
    const elements = elementToCapture.querySelectorAll(selector);
    elements.forEach((el) => {
      // We use setProperty with '!important' to ensure it overrides everything
      el.style.setProperty(style.property, style.value, "important");
    });
  }

  // Use a short timeout to let the browser apply the new inline styles
  setTimeout(() => {
    html2canvas(elementToCapture, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff", // Force a white background for the canvas itself
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const ratio = canvas.width / canvas.height;
        const pdfHeight = pdfWidth / ratio;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("analysis_data.pdf");
      })
      .catch((err) => console.error("PDF generation failed:", err))
      .finally(() => {
        // 4. IMPORTANT: Clean up and remove the inline styles after capture
        for (const [selector, style] of Object.entries(styleOverrides)) {
          const elements = elementToCapture.querySelectorAll(selector);
          elements.forEach((el) => {
            el.style.removeProperty(style.property);
          });
        }
      });
  }, 100);
}

export default function AnalysisPage() {
  const { isAuthenticated, getToken, isLoading, backendError } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const analysisRef = useRef();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError("You must be signed in to view your analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    getToken()
      .then((token) => {
        if (!token) throw new Error("No authentication token found.");
        return fetch(apiUrl("/api/analysis-data"), {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analysis data");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, getToken]);

  if (loading || isLoading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading analysis...
      </div>
    );
  if (backendError)
    return <div className="text-red-500 p-8">{backendError}</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!data) return null;

  const leetcode = data.profiles.find((p) => p.platform === "leetcode");
  const leetcodePie = leetcode
    ? [
        { name: "Easy", value: leetcode.easy_solved },
        { name: "Medium", value: leetcode.medium_solved },
        { name: "Hard", value: leetcode.hard_solved },
      ]
    : [];

  let languageMap = {};
  data.profiles.forEach((p) => {
    if (p.languages) {
      Object.entries(p.languages).forEach(([lang, percent]) => {
        languageMap[lang] = (languageMap[lang] || 0) + percent;
      });
    }
  });
  const languagePie = Object.entries(languageMap).map(([name, value]) => ({
    name,
    value: Math.round(value * 10) / 10,
  }));

  const ratings = data.profiles
    .filter((p) => p.current_rating > 0)
    .map((p) => ({ platform: p.platform, rating: p.current_rating }));

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#f8fafc" }}>
      <div
        className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8"
        ref={analysisRef}
      >
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
          Your Coding Journey Analysis
        </h1>
        <div className="flex flex-wrap gap-8 justify-center mb-8">
          {leetcode && (
            <div className="w-80 bg-blue-50 rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                LeetCode Problem Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={leetcodePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {leetcodePie.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {languagePie.length > 0 && (
            <div className="w-80 bg-blue-50 rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                Language Usage
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={languagePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {languagePie.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {ratings.length > 0 && (
            <div className="w-80 bg-blue-50 rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                Platform Ratings
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ratings}>
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rating" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="flex gap-4 justify-center mt-8">
          <button
            className="bg-blue-700 hover:bg-blue-900 text-white font-semibold py-2 px-6 rounded shadow"
            onClick={() => downloadPDF(analysisRef)}
          >
            Download as PDF
          </button>
          <button
            className="bg-green-600 hover:bg-green-800 text-white font-semibold py-2 px-6 rounded shadow"
            onClick={() => downloadCSV(data.profiles)}
          >
            Download as CSV
          </button>
        </div>
      </div>
    </div>
  );
}
