import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useContext } from "react";
import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import { toast } from "sonner";

function PersonalDetails({ enableNext }) {
  const { resumeInfo, setResumeInfo } = useContext(ResumeInfoContext);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setResumeInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!resumeInfo.firstName || !resumeInfo.lastName) {
      toast.error("Please fill in required fields");
      return;
    }

    enableNext(true);
    toast.success("Personal details saved!");
    localStorage.setItem("resume_personal", JSON.stringify(resumeInfo));
  };

  return (
    <div className="p-5 shadow-lg rounded-lg border-t-primary border-t-4 mt-10">
      <h2 className="font-bold text-lg mb-2">Personal Details</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Provide your basic information
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name *</label>
            <Input
              name="firstName"
              required
              value={resumeInfo?.firstName || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name *</label>
            <Input
              name="lastName"
              required
              value={resumeInfo?.lastName || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Job Title *</label>
            <Input
              name="jobTitle"
              required
              value={resumeInfo?.jobTitle || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              name="address"
              value={resumeInfo?.address || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone *</label>
            <Input
              name="phone"
              required
              type="tel"
              pattern="[0-9]{10}"
              value={resumeInfo?.phone || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <Input
              name="email"
              required
              type="email"
              value={resumeInfo?.email || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit">Save Details</Button>
        </div>
      </form>
    </div>
  );
}

export default PersonalDetails;
