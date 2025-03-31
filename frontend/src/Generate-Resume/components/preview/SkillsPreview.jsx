import React, { useEffect, useState } from "react";

function SkillsPreview({ resumeInfo }) {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    const loadSkills = () => {
      if (resumeInfo?.skills?.length > 0) {
        setSkills(resumeInfo.skills);
      } else {
        try {
          const savedSkills = localStorage.getItem("resume_skills");
          if (savedSkills) setSkills(JSON.parse(savedSkills));
        } catch (error) {
          console.error("Error loading skills:", error);
        }
      }
    };

    loadSkills();
  }, [resumeInfo]);

  if (skills.length === 0) {
    return (
      <div className="my-6 text-center">
        <p className="text-sm text-muted-foreground">
          No skills information provided
        </p>
      </div>
    );
  }

  return (
    <section className="my-6">
      <h2
        className="text-xl font-bold mb-4 text-center uppercase tracking-wide"
        style={{ color: resumeInfo?.themeColor }}
      >
        Skills
      </h2>
      <hr className="mb-4" style={{ borderColor: resumeInfo?.themeColor }} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill, index) => (
          <article
            key={`skill-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <h3 className="text-sm font-medium">
                {skill.name || "Unnamed Skill"}
              </h3>
            </div>

            <div className="flex items-center gap-2 w-40">
              <div className="h-2 bg-muted rounded-full flex-1">
                <div
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: resumeInfo?.themeColor || "#64748b",
                    width: `${(skill.rating || 0) * 20}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8">
                ({skill.rating || 0}/5)
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SkillsPreview;
