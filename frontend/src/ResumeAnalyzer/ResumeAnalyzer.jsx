import { useState } from "react";

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile?.type === "application/pdf") {
      setFile(uploadedFile);
    }
  };

  const analyzeResume = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (error) {
      console.error("Error:", error);
      setAnalysis("Error analyzing resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Resume Analyzer</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Upload PDF Resume
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </label>
          {file && <p className="text-green-600 text-sm">File uploaded!</p>}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Job Description
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description..."
              className="mt-1 block w-full border rounded-md p-2 h-32"
            />
          </label>
        </div>
      </div>

      {file && (
        <button
          onClick={analyzeResume}
          disabled={loading}
          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
      )}

      {analysis && (
        <div className="mt-8 p-6 bg-muted rounded-md">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          <div className="whitespace-pre-wrap">{analysis}</div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
