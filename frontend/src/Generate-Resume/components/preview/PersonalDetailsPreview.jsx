import React from "react";
import { Mail, Phone } from "lucide-react";

function PersonalDetailsPreview({ resumeInfo }) {
  if (!resumeInfo) return null;

  return (
    <header className="space-y-2 mb-6">
      {/* Name */}
      <div className="text-center">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: resumeInfo.themeColor }}
        >
          {resumeInfo.firstName} {resumeInfo.lastName}
        </h1>

        {/* Job Title */}
        {resumeInfo.jobTitle && (
          <h2 className="text-lg font-medium text-muted-foreground">
            {resumeInfo.jobTitle}
          </h2>
        )}
      </div>

      {/* Contact Information */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-sm">
        {/* Address */}
        {resumeInfo.address && (
          <p
            className="font-medium text-center"
            style={{ color: resumeInfo.themeColor }}
          >
            {resumeInfo.address}
          </p>
        )}

        {/* Contact Details */}
        <div className="flex items-center gap-4">
          {resumeInfo.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span style={{ color: resumeInfo.themeColor }}>
                {resumeInfo.phone}
              </span>
            </div>
          )}

          {resumeInfo.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <a
                href={`mailto:${resumeInfo.email}`}
                className="hover:underline"
                style={{ color: resumeInfo.themeColor }}
              >
                {resumeInfo.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <hr
        className="my-4 border-t-2"
        style={{ borderColor: resumeInfo.themeColor }}
      />
    </header>
  );
}

export default PersonalDetailsPreview;
