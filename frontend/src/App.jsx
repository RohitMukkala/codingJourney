import { useUser } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import Header from "@/components/custom/header";
import { LoaderCircle } from "lucide-react";

function App() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth/sign-in" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <Outlet />
      </main>

      <footer className="border-t py-4 mt-8 print:hidden">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Resume Builder. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
