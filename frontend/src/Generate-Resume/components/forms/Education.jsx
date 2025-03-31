import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResumeInfo } from "@/context/ResumeInfoContext";
import { LoaderCircle } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

function Education() {
  const { resumeInfo, setResumeInfo } = useResumeInfo();
  const [loading, setLoading] = useState(false);

  const handleChange = (index, field, value) => {
    const updatedEducation = [...resumeInfo.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    setResumeInfo((prev) => ({ ...prev, education: updatedEducation }));
  };

  const addNewEducation = () => {
    setResumeInfo((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          universityName: "",
          degree: "",
          major: "",
          startDate: "",
          endDate: "",
          description: "",
        },
      ],
    }));
  };

  const removeEducation = (index) => {
    if (resumeInfo.education.length > 1) {
      setResumeInfo((prev) => ({
        ...prev,
        education: prev.education.filter((_, i) => i !== index),
      }));
    }
  };

  const validateEducation = () => {
    return resumeInfo.education.every(
      (edu) => edu.universityName && edu.degree && edu.startDate
    );
  };

  const handleSave = async () => {
    if (!validateEducation()) {
      toast.error("Please fill required fields (*)");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      localStorage.setItem(
        "resume_education",
        JSON.stringify(resumeInfo.education)
      );
      toast.success("Education details saved successfully!");
    } catch (error) {
      toast.error("Failed to save education details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
      <h2 className="font-bold text-lg mb-3">Education Details</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Add your educational qualifications
      </p>

      <div className="space-y-4">
        {resumeInfo.education.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/10"
          >
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">
                University Name *
                <Input
                  value={item.universityName}
                  onChange={(e) =>
                    handleChange(index, "universityName", e.target.value)
                  }
                  placeholder="University of Example"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Degree *
                <Input
                  value={item.degree}
                  onChange={(e) =>
                    handleChange(index, "degree", e.target.value)
                  }
                  placeholder="Bachelor's Degree"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Major
                <Input
                  value={item.major}
                  onChange={(e) => handleChange(index, "major", e.target.value)}
                  placeholder="Computer Science"
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
              <label className="text-sm font-medium">
                End Date
                <Input
                  type="date"
                  value={item.endDate}
                  onChange={(e) =>
                    handleChange(index, "endDate", e.target.value)
                  }
                  min={item.startDate}
                />
              </label>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">
                Description
                <Textarea
                  value={item.description}
                  onChange={(e) =>
                    handleChange(index, "description", e.target.value)
                  }
                  placeholder="Relevant coursework, achievements..."
                  className="min-h-[100px]"
                />
              </label>
            </div>

            {resumeInfo.education.length > 1 && (
              <div className="col-span-2 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeEducation(index)}
                >
                  Remove Entry
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={addNewEducation}
            className="text-primary"
          >
            + Add Education
          </Button>
        </div>

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

export default Education;
