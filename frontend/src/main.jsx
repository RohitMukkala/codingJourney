import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.jsx";
import SignInPage from "./auth/sign-in";
import SignUpPage from "./auth/sign-up"; // ✅ NEW
import Home from "./home/index.jsx";
import Dashboard from "./dashboard/index.jsx";
import GenerateResume from "./Generate-Resume";
import CreateResume from "./Generate-Resume/CreateResume";
import ViewResume from "./Generate-Resume/ViewResume";
import { ResumeInfoProvider } from "@/context/ResumeInfoContext";
import ResumeAnalyzer from "./ResumeAnalyzer/ResumeAnalyzer";
import ChatInterface from "./ChatInterface";
import AuthProvider from "@/context/AuthContext";
import Settings from "./settings";
import AnalysisPage from "./AnalysisPage";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Catch-all for authenticated routes
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/analysis",
        element: <AnalysisPage />, // ✅ Add this here
      },
      {
        path: "/generate-resume",
        element: <GenerateResume />,
      },
      {
        path: "/create-resume",
        element: <CreateResume />,
      },
      {
        path: "/view-resume",
        element: <ViewResume />,
      },
      {
        path: "/analyze-resume",
        element: <ResumeAnalyzer />,
      },
      {
        path: "/chat",
        element: <ChatInterface />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth/sign-in",
    element: <SignInPage />,
  },
  {
    path: "/auth/sign-up",
    element: <SignUpPage />,
  },
  // Root-level catch-all
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AuthProvider>
        {" "}
        {/* Added wrapper */}
        <ResumeInfoProvider>
          <RouterProvider router={router} />
        </ResumeInfoProvider>
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>
);
