import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function GenerateResume() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-4"
      style={{ backgroundColor: "#f8fafc" }}
    >
      <div className="max-w-3xl space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          Craft Your Professional Resume
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground">
          Create an impressive resume in minutes and unlock new career
          opportunities
        </p>

        <div className="mt-8">
          <Button
            onClick={() => navigate("/Create-Resume")}
            size="lg"
            className="text-lg px-8 py-6 hover:scale-105 transition-transform"
          >
            Get Started Now
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-muted-foreground text-sm">
          <div className="border rounded-lg p-4 hover:border-primary transition-colors">
            <h3 className="font-medium">Easy Templates</h3>
            <p>Professionally designed layouts</p>
          </div>
          <div className="border rounded-lg p-4 hover:border-primary transition-colors">
            <h3 className="font-medium">AI-Powered Suggestions</h3>
            <p>Smart content optimization</p>
          </div>
          <div className="border rounded-lg p-4 hover:border-primary transition-colors">
            <h3 className="font-medium">Instant PDF Download</h3>
            <p>Ready-to-use format</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerateResume;
