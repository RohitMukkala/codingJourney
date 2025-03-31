import React, { useEffect } from "react";
import { useResumeInfo } from "@/context/ResumeInfoContext";
import { useLocation } from "react-router-dom";
import FormSection from "./components/FormSection";
import ResumePreview from "./components/ResumePreview";

function CreateResume() {
  const { resetResume } = useResumeInfo();
  const location = useLocation();

  useEffect(() => {
    // Reset data every time user navigates to this page
    if (location.pathname === "/create-resume") {
      resetResume();
    }
  }, [location.pathname, resetResume]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen print:block">
      <div className="w-full md:w-1/2 p-4 print:hidden">
        <FormSection />
      </div>

      <div className="w-full md:w-1/2 print:w-full p-4 print:p-0">
        <ResumePreview />
      </div>
    </div>
  );
}

export default CreateResume;
