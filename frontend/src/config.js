/**
 * Central configuration file for environment settings
 */

// Detect environment
export const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// API URL configuration with fallbacks
export const API_URL =
  window.API_URL ||
  import.meta.env.VITE_API_URL ||
  (isDevelopment
    ? "http://localhost:8000"
    : "https://codingjourney.onrender.com");

// Clerk API URL for frontend
export const CLERK_API_URL = window.location.hostname.endsWith("codenexusai.me")
  ? "https://clerk.codenexusai.me"
  : "https://clerk.dev";

// Timeouts
export const TIMEOUT = {
  default: isDevelopment ? 30000 : 10000, // 30s local, 10s production
  long: isDevelopment ? 60000 : 20000, // 60s local, 20s production
};

// Log config on startup
console.log(
  `App running in ${isDevelopment ? "DEVELOPMENT" : "PRODUCTION"} mode`
);
console.log(`Using API URL: ${API_URL}`);

// Helper to create API url with endpoint
export const apiUrl = (endpoint) =>
  `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

// Export default config for convenience
export default {
  API_URL,
  isDevelopment,
  TIMEOUT,
  apiUrl,
  CLERK_API_URL,
};
