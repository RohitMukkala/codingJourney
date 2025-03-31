import { Button } from "@/components/ui/button";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import { Download, Share2 } from "lucide-react";
import React, { useContext, useEffect, useState } from "react";
import ResumePreview from "./components/ResumePreview";

function ViewResume() {
  const { resumeInfo } = useContext(ResumeInfoContext);
  const [resumeData, setResumeData] = useState(resumeInfo);

  useEffect(() => {
    const loadResumeData = () => {
      const savedData = {
        education: localStorage.getItem("resume_education"),
        experience: localStorage.getItem("resume_experience"),
        skills: localStorage.getItem("resume_skills"),
        personal: localStorage.getItem("resume_personal"),
        summary: localStorage.getItem("resume_summary"),
        theme: localStorage.getItem("resume_theme"),
      };

      const mergedData = {
        ...resumeInfo,
        education: savedData.education ? JSON.parse(savedData.education) : [],
        experience: savedData.experience
          ? JSON.parse(savedData.experience)
          : [],
        skills: savedData.skills ? JSON.parse(savedData.skills) : [],
        ...(savedData.personal && JSON.parse(savedData.personal)),
        summary: savedData.summary || "",
        themeColor: savedData.theme || "#3498db",
      };

      setResumeData(mergedData);
    };

    if (!resumeInfo || Object.keys(resumeInfo).length === 0) {
      loadResumeData();
    }
  }, [resumeInfo]);

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");

    // Clone the resume content
    const printContent = document.getElementById("print-area").cloneNode(true);

    // Get all styles from the main document
    let styles = "";
    for (const stylesheet of document.styleSheets) {
      try {
        for (const rule of stylesheet.cssRules) {
          styles += rule.cssText;
        }
      } catch (error) {
        console.warn("Could not access stylesheet: ", error);
      }
    }

    printWindow.document.write(`
      <html>
        <head>
          <title></title> <!-- Blank title to avoid unwanted text -->
          <style>
            ${styles}
            @page {
              size: auto;
              margin: 0; /* Removes browser default header/footer */
            }
            body {
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div id="print-content">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${resumeData?.firstName || "My"} Resume`,
          text: "Check out my professional resume!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Sharing failed:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="my-10 mx-4 md:mx-8 lg:mx-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Your Professional Resume is Ready!
        </h2>
        <div className="flex flex-col md:flex-row gap-4 justify-center my-8">
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="secondary" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Resume
          </Button>
        </div>
      </div>

      <div id="print-area" className="p-4 md:p-8 print:p-0">
        <ResumePreview resumeInfo={resumeData} />
      </div>
    </div>
  );
}

export default ViewResume;
