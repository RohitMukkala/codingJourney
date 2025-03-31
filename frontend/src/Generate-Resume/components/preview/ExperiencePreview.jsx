import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";

function ExperiencePreview({ resumeInfo }) {
  const [experienceList, setExperienceList] = useState([]);

  useEffect(() => {
    const loadExperience = () => {
      if (resumeInfo?.experience?.length > 0) {
        setExperienceList(resumeInfo.experience);
      } else {
        const savedData = localStorage.getItem("resume_experience");
        if (savedData) {
          try {
            setExperienceList(JSON.parse(savedData));
          } catch (error) {
            console.error("Error loading experience data:", error);
          }
        }
      }
    };

    loadExperience();
  }, [resumeInfo]);

  if (experienceList.length === 0) {
    return (
      <div className="my-6 text-center">
        <p className="text-sm text-muted-foreground">
          No professional experience provided
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
        Professional Experience
      </h2>
      <hr className="mb-4" style={{ borderColor: resumeInfo?.themeColor }} />

      <div className="space-y-6">
        {experienceList.map((exp, index) => (
          <article key={`exp-${index}`} className="mb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-semibold">
                {exp.title || "Position Not Specified"}
              </h3>
              <span className="text-sm text-muted-foreground">
                {exp.startDate || "Start Date"} -{" "}
                {exp.currentlyWorking ? "Present" : exp.endDate || "End Date"}
              </span>
            </div>

            <div className="mt-1">
              <p className="text-sm font-medium">
                {exp.companyName || "Company Name"}
                {(exp.city || exp.state) && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({exp.city ? `${exp.city}, ` : ""}
                    {exp.state})
                  </span>
                )}
              </p>
            </div>

            {exp.workSummary && (
              <div
                className="text-sm text-muted-foreground mt-2 prose prose-sm"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(exp.workSummary),
                }}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default ExperiencePreview;
