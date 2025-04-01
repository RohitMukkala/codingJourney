import { Input } from "@/components/ui/input";
import { Rating } from "@smastrom/react-rating";
import "@smastrom/react-rating/style.css";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import { toast } from "sonner";
import React, { useContext, useEffect, useState } from "react";

function Skills() {
  const { resumeInfo, setResumeInfo } = useContext(ResumeInfoContext);
  const [skillsList, setSkillsList] = useState([{ name: "", rating: 0 }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedSkills = localStorage.getItem("resume_skills");
    if (savedSkills) {
      try {
        const parsedData = JSON.parse(savedSkills);
        setSkillsList(parsedData);
        setResumeInfo((prev) => ({ ...prev, skills: parsedData }));
      } catch (error) {
        toast.error("Failed to load saved skills");
      }
    }
  }, []);

  useEffect(() => {
    setResumeInfo((prev) => ({ ...prev, skills: skillsList }));
    localStorage.setItem("resume_skills", JSON.stringify(skillsList));
  }, [skillsList]);

  const handleChange = (index, field, value) => {
    setSkillsList((prev) =>
      prev.map((skill, i) =>
        i === index ? { ...skill, [field]: value } : skill
      )
    );
  };

  const addNewSkill = () => {
    setSkillsList((prev) => [...prev, { name: "", rating: 0 }]);
  };

  const removeSkill = (index) => {
    if (skillsList.length > 1) {
      setSkillsList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validateSkills = () => {
    return skillsList.every((skill) => skill.name.trim() !== "");
  };

  const handleSave = async () => {
    if (!validateSkills()) {
      toast.error("Please fill skill names before saving");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success("Skills saved successfully!");
    } catch (error) {
      toast.error("Failed to save skills");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
      <h2 className="font-bold text-lg mb-3">Professional Skills</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Add your key skills with proficiency ratings
      </p>

      <div className="space-y-4">
        {skillsList.map((item, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row gap-4 items-center border p-4 rounded-lg bg-muted/10"
          >
            <div className="w-full space-y-2">
              <label className="text-sm font-medium">
                Skill Name *
                <Input
                  value={item.name}
                  onChange={(e) => handleChange(index, "name", e.target.value)}
                  placeholder="e.g., JavaScript, Project Management"
                />
              </label>
            </div>

            <div className="w-full sm:w-auto space-y-2">
              <label className="text-sm font-medium">Proficiency</label>
              <div className="flex items-center gap-2">
                <Rating
                  style={{ maxWidth: 150 }}
                  value={item.rating}
                  onChange={(v) => handleChange(index, "rating", v)}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">
                  ({item.rating}/5)
                </span>
              </div>
            </div>

            {skillsList.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeSkill(index)}
                className="mt-2 sm:mt-0"
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
        <Button
          variant="outline"
          onClick={addNewSkill}
          className="text-primary"
        >
          + Add New Skill
        </Button>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default Skills;
