import { Button } from "@/components/ui/button";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import { Brain, LoaderCircle } from "lucide-react";
import React, { useContext, useState } from "react";
import {
  BtnBold,
  BtnBulletList,
  BtnItalic,
  BtnNumberedList,
  BtnStrikeThrough,
  BtnUnderline,
  Editor,
  EditorProvider,
  Separator,
  Toolbar,
} from "react-simple-wysiwyg";
import { toast } from "sonner";
import DOMPurify from "dompurify";

const PROMPT =
  "Position title: {positionTitle}. Based on the position title, generate 5-7 bullet points for my experience in resume. Please format the result in HTML bullet points (<ul><li>...</li></ul>). Do not include experience level.";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText";

function RichTextEditor({ onRichTextEditorChange, index, defaultValue }) {
  const [value, setValue] = useState(defaultValue);
  const { resumeInfo } = useContext(ResumeInfoContext);
  const [loading, setLoading] = useState(false);
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const GenerateSummaryFromAI = async () => {
    if (!resumeInfo?.experience?.[index]?.title) {
      toast.error("Please add a position title first");
      return;
    }

    setLoading(true);
    const prompt = PROMPT.replace(
      "{positionTitle}",
      resumeInfo.experience[index].title
    );

    try {
      const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: { text: prompt } }),
      });

      if (!response.ok) throw new Error("API request failed");

      const result = await response.json();
      const generatedText = DOMPurify.sanitize(
        result?.candidates?.[0]?.output || ""
      );

      setValue(generatedText);
      onRichTextEditorChange({ target: { value: generatedText } });
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Work Summary</span>
        <Button
          variant="outline"
          size="sm"
          onClick={GenerateSummaryFromAI}
          disabled={loading}
          className="gap-2 text-primary hover:bg-primary/10"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>AI Generate</span>
            </>
          )}
        </Button>
      </div>

      <EditorProvider>
        <Editor
          value={value}
          onChange={(e) => {
            const sanitizedValue = DOMPurify.sanitize(e.target.value);
            setValue(sanitizedValue);
            onRichTextEditorChange({ target: { value: sanitizedValue } });
          }}
          className="border rounded-md p-2 min-h-[150px]"
        >
          <Toolbar className="border-b p-1 gap-1">
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnStrikeThrough />
            <Separator />
            <BtnNumberedList />
            <BtnBulletList />
          </Toolbar>
        </Editor>
      </EditorProvider>
    </div>
  );
}

export default RichTextEditor;
