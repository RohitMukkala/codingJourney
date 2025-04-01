import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResumeInfo } from "@/context/ResumeInfoContext";
import { LoaderCircle } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import RichTextEditor from "../RichTextEditor";

const initialExperience = {
  title: "",
  companyName: "",
  city: "",
  state: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  workSummary: "",
};

function Experience() {
  const { resumeInfo, setResumeInfo } = useResumeInfo();
  const [loading, setLoading] = useState(false);

  const handleChange = (index, field, value) => {
    const updatedExperience = [...resumeInfo.experience];
    updatedExperience[index] = { ...updatedExperience[index], [field]: value };
    setResumeInfo((prev) => ({ ...prev, experience: updatedExperience }));
  };

  const handleRichTextChange = (index, value) => {
    const updatedExperience = [...resumeInfo.experience];
    updatedExperience[index].workSummary = value; // Store only the string
    setResumeInfo((prev) => ({ ...prev, experience: updatedExperience }));
  };

  const addNewExperience = () => {
    setResumeInfo((prev) => ({
      ...prev,
      experience: [...prev.experience, { ...initialExperience }],
    }));
  };

  const removeExperience = (index) => {
    if (resumeInfo.experience.length > 1) {
      setResumeInfo((prev) => ({
        ...prev,
        experience: prev.experience.filter((_, i) => i !== index),
      }));
    }
  };

  const validateExperience = () => {
    return resumeInfo.experience.every(
      (exp) => exp.title && exp.companyName && exp.startDate
    );
  };

  const handleSave = async () => {
    if (!validateExperience()) {
      toast.error("Please fill required fields (*)");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      localStorage.setItem(
        "resume_experience",
        JSON.stringify(resumeInfo.experience)
      );
      toast.success("Experience saved successfully!");
    } catch (error) {
      toast.error("Failed to save experience");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
      <h2 className="font-bold text-lg mb-3">Professional Experience</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Add your work history and achievements
      </p>

      <div className="space-y-6">
        {resumeInfo.experience.map((item, index) => (
          <div key={index} className="border p-4 rounded-lg bg-muted/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Position Title *
                  <Input
                    value={item.title}
                    onChange={(e) =>
                      handleChange(index, "title", e.target.value)
                    }
                    placeholder="Software Engineer"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Company Name *
                  <Input
                    value={item.companyName}
                    onChange={(e) =>
                      handleChange(index, "companyName", e.target.value)
                    }
                    placeholder="Tech Corp Inc."
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  City
                  <Input
                    value={item.city}
                    onChange={(e) =>
                      handleChange(index, "city", e.target.value)
                    }
                    placeholder="New York"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  State
                  <Input
                    value={item.state}
                    onChange={(e) =>
                      handleChange(index, "state", e.target.value)
                    }
                    placeholder="NY"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date *
                  <Input
                    type="date"
                    value={item.startDate}
                    onChange={(e) =>
                      handleChange(index, "startDate", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Input
                    type="checkbox"
                    checked={item.currentlyWorking}
                    onChange={(e) =>
                      handleChange(index, "currentlyWorking", e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  Currently Working
                </label>
                {!item.currentlyWorking && (
                  <Input
                    type="date"
                    value={item.endDate}
                    onChange={(e) =>
                      handleChange(index, "endDate", e.target.value)
                    }
                    min={item.startDate}
                    disabled={item.currentlyWorking}
                  />
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <RichTextEditor
                  defaultValue={item.workSummary}
                  onRichTextEditorChange={(value) =>
                    handleRichTextChange(index, value)
                  }
                />
              </div>
            </div>

            {resumeInfo.experience.length > 1 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeExperience(index)}
                >
                  Remove Experience
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
        <Button variant="outline" onClick={addNewExperience}>
          + Add Experience
        </Button>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

export default Experience;
