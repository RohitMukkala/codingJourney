import React, { useState, useEffect } from "react";
import PersonalDetails from "./forms/PersonalDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import Summary from "./forms/Summary";
import Experience from "./forms/Experience";
import Education from "./forms/Education";
import Skills from "./forms/Skills";
import { Link, useNavigate, useParams } from "react-router-dom";
import ThemeColor from "./ThemeColor";

function FormSection() {
  const [activeFormIndex, setActiveFormIndex] = useState(1);
  const [enableNext, setEnableNext] = useState(false);
  const { resumeId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeFormIndex === 6) {
      navigate("/resume-preview");
    }
  }, [activeFormIndex, navigate]);

  const forms = [
    <PersonalDetails enableNext={setEnableNext} key="personal" />,
    <Summary enableNext={setEnableNext} key="summary" />,
    <Experience key="experience" />,
    <Education key="education" />,
    <Skills key="skills" />,
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-3">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <ThemeColor />
        </div>

        <div className="flex gap-2">
          {activeFormIndex > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFormIndex((prev) => prev - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setActiveFormIndex((prev) => prev + 1)}
            disabled={!enableNext}
          >
            {activeFormIndex === forms.length ? "Preview" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">{forms[activeFormIndex - 1]}</div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Step {activeFormIndex} of {forms.length}
      </div>
    </div>
  );
}

export default FormSection;
