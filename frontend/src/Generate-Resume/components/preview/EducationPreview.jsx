import React from "react";

function EducationPreview({ resumeInfo }) {
  if (!resumeInfo?.education || resumeInfo.education.length === 0) {
    return (
      <div className="my-6 text-center">
        <p className="text-sm text-muted-foreground">
          No education information provided
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
        Education
      </h2>
      <hr className="mb-4" style={{ borderColor: resumeInfo?.themeColor }} />

      <div className="space-y-4">
        {resumeInfo.education.map((edu, index) => (
          <article key={`edu-${index}`} className="mb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-semibold">
                {edu.universityName || "University Name"}
              </h3>
              <span className="text-sm text-muted-foreground">
                {edu.startDate
                  ? `${edu.startDate} - ${edu.endDate || "Present"}`
                  : "Dates not specified"}
              </span>
            </div>

            <div className="mt-1">
              <p className="text-sm font-medium">
                {edu.degree || "Degree not specified"}
                {edu.major && ` in ${edu.major}`}
              </p>
            </div>

            {edu.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {edu.description}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default EducationPreview;
