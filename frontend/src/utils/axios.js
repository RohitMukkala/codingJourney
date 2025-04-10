import axios from "axios";
import { API_URL, TIMEOUT, isDevelopment } from "../config";

console.log(
  `Axios initialized with: ${API_URL}, timeout: ${TIMEOUT.default}ms`
);

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: TIMEOUT.default,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get the current session
      const session = await window.Clerk?.session;
      if (session) {
        // Get a fresh token for this request
        const token = await session.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (isDevelopment) {
        console.log(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
      }

      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log(
        `API Response: ${response.status} for ${response.config.url}`
      );
    }
    return response;
  },
  async (error) => {
    // Enhanced error logging
    if (error.response) {
      console.error(
        `API Error ${error.response.status}: ${
          error.response.data?.detail || error.message
        }`
      );
    } else if (error.request) {
      if (error.code === "ECONNABORTED") {
        console.error(
          `Request timeout (${TIMEOUT.default}ms) - Server might be slow or unreachable`
        );
      } else {
        console.error(`Network Error: ${error.message} - Server might be down`);
      }
    } else {
      console.error(`Request Error: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
