import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import React, { useContext, useEffect, useState } from "react";
import { Brain, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

const GOOGLE_API_KEY = "your_google_api_key_here"; // 🔴 Replace with your actual API key

function Summary({ enabledNext }) {
  const { resumeInfo, setResumeInfo } = useContext(ResumeInfoContext);
  const [summery, setSummery] = useState("");

  const [loading, setLoading] = useState(false);
  const [aiGeneratedSummeryList, setAiGenerateSummeryList] = useState([]);

  // ✅ Load existing summary when component mounts
  useEffect(() => {
    setSummery(resumeInfo?.summery || "");
  }, [resumeInfo?.summery]);

  // ✅ Save function (updates context and shows toast)
  const handleSave = () => {
    setResumeInfo((prev) => ({ ...prev, summery }));
    toast.success("Summary saved successfully!");
    enabledNext(true); // ✅ Add toast feedback
  };

  const GenerateSummeryFromAI = async () => {
    setLoading(true);
    const prompt = `Generate a professional job summary for the job title: "${
      resumeInfo?.jobTitle || "Software Engineer"
    }". Provide 3 versions: Mid Level, Experienced, and Fresher. Return the result in JSON format with 'summary' and 'experience_level' fields.`;

    try {
      const requestBody = {
        model: "gemini-pro",
        messages: [{ role: "user", content: prompt }],
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateText?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();
      const parsedData = responseData?.candidates?.[0]?.content;

      if (parsedData) {
        setAiGenerateSummeryList(JSON.parse(parsedData));
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      toast.error("Failed to generate summary.");
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
        <h2 className="font-bold text-lg">Summary</h2>
        <p>Add a summary for your job title</p>

        <form className="mt-7" onSubmit={(e) => e.preventDefault()}>
          <div className="flex justify-between items-end">
            <label>Add Summary</label>
            <Button
              variant="outline"
              onClick={GenerateSummeryFromAI}
              type="button"
              size="sm"
              className="border-primary text-primary flex gap-2"
            >
              <Brain className="h-4 w-4" /> Generate from AI
            </Button>
          </div>
          <Textarea
            className="mt-5"
            required
            value={summery}
            onChange={(e) => setSummery(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? <LoaderCircle className="animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </div>

      {aiGeneratedSummeryList.length > 0 && (
        <div className="my-5">
          <h2 className="font-bold text-lg">Suggestions</h2>
          {aiGeneratedSummeryList.map((item, index) => (
            <div
              key={index}
              onClick={() => setSummery(item?.summary)}
              className="p-5 shadow-lg my-4 rounded-lg cursor-pointer"
            >
              <h2 className="font-bold my-1 text-primary">
                Level: {item?.experience_level}
              </h2>
              <p>{item?.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Summary;
