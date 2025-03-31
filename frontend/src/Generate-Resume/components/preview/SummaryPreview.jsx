import React from "react";

function SummeryPreview({ resumeInfo }) {
  return (
    <p className="text-xs">
      {resumeInfo?.summery || "No summary available. Please add a summary."}
    </p>
  );
}

export default SummeryPreview;
