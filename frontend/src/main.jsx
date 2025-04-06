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
import Home from "./home/index.jsx";
import Dashboard from "./dashboard/index.jsx";
import GenerateResume from "./Generate-Resume";
import CreateResume from "./Generate-Resume/CreateResume";
import ViewResume from "./Generate-Resume/ViewResume";
import { ResumeInfoProvider } from "@/context/ResumeInfoContext";
import ResumeAnalyzer from "./ResumeAnalyzer/ResumeAnalyzer";
import ChatInterface from "./ChatInterface";

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
  // Root-level catch-all
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ResumeInfoProvider>
        <RouterProvider router={router} />
      </ResumeInfoProvider>
    </ClerkProvider>
  </StrictMode>
);
