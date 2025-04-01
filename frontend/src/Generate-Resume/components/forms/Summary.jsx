import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "sonner";

function Summary({ enabledNext }) {
  const { resumeInfo, setResumeInfo } = useContext(ResumeInfoContext);
  const [summery, setSummery] = useState("");

  // ✅ Load existing summary when component mounts
  useEffect(() => {
    setSummery(resumeInfo?.summery || "");
  }, [resumeInfo?.summery]);

  // ✅ Save function (updates context and shows toast)
  const handleSave = () => {
    setResumeInfo((prev) => ({ ...prev, summery }));
    toast.success("Summary saved successfully!");
    enabledNext(true); // ✅ Add toast feedback
  };

  return (
    <div>
      <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
        <h2 className="font-bold text-lg">Summary</h2>
        <p>Add a summary for your job title</p>

        <form className="mt-7" onSubmit={(e) => e.preventDefault()}>
          <div className="flex justify-between items-end">
            <label>Add Summary</label>
          </div>
          <Textarea
            className="mt-5"
            required
            value={summery}
            onChange={(e) => setSummery(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Summary;
