import { useState } from "react";
import Message from "./Message";
import { apiUrl, isDevelopment } from "./config";
import { useAuth } from "./context/AuthContext";

export default function ChatInterface() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    setMessages((prev) => [...prev, { content: input, isBot: false }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token (if user is signed in)
      let headers = { "Content-Type": "application/json" };
      try {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        // Continue without token if not available
        if (isDevelopment) {
          console.log("No auth token available for chat, continuing as guest");
        }
      }

      // Get bot response
      const response = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({ content: input }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { content: data.content, isBot: true }]);
    } catch (error) {
      console.error("Chat error:", error);
      setError(error.message);
      setMessages((prev) => [
        ...prev,
        {
          content: `❌ Error: ${error.message}`,
          isBot: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="max-w-4xl mx-auto p-4 flex flex-col"
      style={{ height: "calc(100vh - 200px)", backgroundColor: "#f8fafc" }}
    >
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, i) => (
          <Message key={i} content={msg.content} isBot={msg.isBot} />
        ))}

        {isLoading && (
          <div className="p-4 rounded-lg bg-gray-100 ml-4">
            <div className="flex items-center text-gray-500">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Ask for code, roadmaps, or interview questions..."
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
