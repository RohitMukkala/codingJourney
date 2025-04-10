import axios from "axios";

// Get the API URL from the global variable, env variable, or direct fallback
const API_URL =
  window.API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://codingjourney.onrender.com";
console.log("Axios using API URL:", API_URL); // Debug log

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
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
