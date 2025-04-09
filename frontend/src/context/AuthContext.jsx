import React, { createContext, useContext, useEffect } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import axiosInstance from "../utils/axios";

// 1. Create context outside the provider
const AuthContext = createContext();

// 2. Main provider as default export
const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && user) {
        try {
          await axiosInstance.post("/users/sync", {
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            metadata: user.unsafeMetadata || {},
          });
        } catch (error) {
          console.error("User sync error:", error.message);
        }
      }
    };
    syncUser();
  }, [isSignedIn, isLoaded, user]);

  const value = {
    isAuthenticated: isSignedIn,
    user: user
      ? {
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          ...user.unsafeMetadata,
        }
      : null,
    getToken,
    updateUser: async (data) => {
      try {
        const updateData = {
          unsafeMetadata: data.unsafeMetadata || {},
        };
        await user.update(updateData);
      } catch (error) {
        console.error("Error updating user:", error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await window.Clerk.signOut();
      } catch (error) {
        console.error("Logout error:", error);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Named export for the hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// 4. Default export the provider
export default AuthProvider;
