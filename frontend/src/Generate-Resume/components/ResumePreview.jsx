import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import React, { useContext } from "react";
import PersonalDetailsPreview from "./preview/PersonalDetailsPreview";
import SummaryPreview from "./preview/SummaryPreview";
import ExperiencePreview from "./preview/ExperiencePreview";
import EducationPreview from "./preview/EducationPreview";
import SkillsPreview from "./preview/SkillsPreview";

function ResumePreview() {
  const { resumeInfo } = useContext(ResumeInfoContext);

  return (
    <div
      className="shadow-lg p-8 md:p-14 border-t-8 print:p-4 print:shadow-none"
      style={{
        borderColor: resumeInfo?.themeColor,
        minHeight: "100vh",
      }}
    >
      <div className="space-y-6">
        <PersonalDetailsPreview resumeInfo={resumeInfo} />
        <SummaryPreview resumeInfo={resumeInfo} />
        <ExperiencePreview resumeInfo={resumeInfo} />
        <EducationPreview resumeInfo={resumeInfo} />
        <SkillsPreview resumeInfo={resumeInfo} />
      </div>
    </div>
  );
}

export default ResumePreview;
