import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Use Vite's env variables
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(async (config) => {
  try {
    // Get the current session
    const session = await window.Clerk?.session;
    if (session) {
      // Get a fresh token for this request
      const token = await session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["Content-Type"] = "application/json";
      }
    }
    return config;
  } catch (error) {
    console.error("Error in request interceptor:", error);
    return config;
  }
});

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("Authentication error:", error);
      // Don't redirect here, let the component handle it
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
