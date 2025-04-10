import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import axiosInstance from "../utils/axios";

// Define API_URL for backend requests
const API_URL = import.meta.env.VITE_API_URL;

// 1. Create context outside the provider
const AuthContext = createContext();

// 2. Main provider as default export
const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const [backendUser, setBackendUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Function to fetch user data from our backend
  const fetchBackendUser = useCallback(async () => {
    if (!isSignedIn) {
      setBackendUser(null);
      setIsLoadingUser(false);
      return;
    }
    setIsLoadingUser(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      // Assumes backend endpoint /api/users/me exists and returns user data
      const response = await axiosInstance.get(`/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackendUser(response.data);
      console.log("Fetched backend user:", response.data);
    } catch (error) {
      console.error("Failed to fetch backend user:", error);
      setBackendUser(null); // Clear on error
    } finally {
      setIsLoadingUser(false);
    }
  }, [isSignedIn, getToken]);

  // Fetch backend user when Clerk user is loaded and signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchBackendUser();
    } else if (isLoaded) {
      setIsLoadingUser(false); // Not signed in, loading finished
      setBackendUser(null);
    }
  }, [isLoaded, isSignedIn, fetchBackendUser]);

  // Function to manually refresh user data
  const refreshUser = useCallback(() => {
    if (isSignedIn) {
      fetchBackendUser();
    }
  }, [isSignedIn, fetchBackendUser]);

  // Combine Clerk user data with our backend data
  const combinedUser = React.useMemo(() => {
    if (!isSignedIn || !clerkUser || !backendUser) {
      return null;
    }
    // Prioritize backend data, supplement with Clerk data
    return {
      ...clerkUser.unsafeMetadata, // Start with Clerk metadata
      clerk_id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      // Overwrite/add fields from our backend DB record
      username: backendUser.username,
      profile_picture: backendUser.profile_picture, // Use the DB field
      leetcode_username: backendUser.leetcode_username,
      github_username: backendUser.github_username,
      codechef_username: backendUser.codechef_username,
      codeforces_username: backendUser.codeforces_username,
      // Add other fields from backendUser if needed
      // Include Clerk's profileImageUrl as fallback
      profileImageUrl: clerkUser.profileImageUrl,
    };
  }, [isSignedIn, clerkUser, backendUser]);

  const value = {
    isAuthenticated: isSignedIn,
    user: combinedUser,
    isLoading: isLoadingUser || !isLoaded, // Overall loading state
    getToken,
    refreshUser, // Expose refresh function
    updateUser: async (data) => {
      try {
        if (!clerkUser) throw new Error("Clerk user not available");
        const updateData = {
          unsafeMetadata: data.unsafeMetadata || {},
        };
        await clerkUser.update(updateData);
        // Optionally trigger a refresh AFTER Clerk update if metadata affects backend state
        // refreshUser();
      } catch (error) {
        console.error("Error updating Clerk user:", error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await window.Clerk.signOut();
        setBackendUser(null); // Clear local state on logout
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
