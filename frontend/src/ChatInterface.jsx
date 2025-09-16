import { useState, useEffect } from "react";
import Message from "./Message";
import { apiUrl, isDevelopment } from "./config";
import { useAuth } from "./context/AuthContext";
import { History, Search, X, MessageSquare } from "lucide-react";

export default function ChatInterface() {
  const { getToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Group messages into conversation sessions using session_id from database
  const groupMessagesIntoSessions = (messages) => {
    if (!messages || messages.length === 0) return [];

    // Group messages by session_id
    const sessionMap = new Map();

    messages.forEach((msg) => {
      const sessionId = msg.session_id || `unknown_${msg.id}`;

      if (!sessionMap.has(sessionId)) {
        const messageTime = new Date(msg.created_at);
        sessionMap.set(sessionId, {
          id: sessionId,
          title:
            msg.user_message.substring(0, 50) +
            (msg.user_message.length > 50 ? "..." : ""),
          startTime: messageTime,
          endTime: messageTime,
          messageCount: 0,
          messages: [],
        });
      }

      const session = sessionMap.get(sessionId);
      const userMessage = { content: msg.user_message, isBot: false };
      const botMessage = { content: msg.ai_response, isBot: true };

      session.messages.push(userMessage, botMessage);
      session.messageCount += 2;

      // Update end time to the latest message
      const messageTime = new Date(msg.created_at);
      if (messageTime > session.endTime) {
        session.endTime = messageTime;
      }
    });

    // Convert map to array and sort by most recent first
    const sessions = Array.from(sessionMap.values());
    sessions.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    return sessions;
  };

  // Load a specific chat session
  const loadSession = (sessionId) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
      setShowHistorySidebar(false);
    }
  };

  // Start a new conversation
  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowHistorySidebar(false);
  };

  // Filter sessions based on search query
  const filteredSessions = chatSessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isAuthenticated) {
        setLoadingHistory(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(apiUrl("/api/chat/history"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // Group messages by sessions (conversations that happened within 1 hour)
          const sessions = groupMessagesIntoSessions(data.messages);
          setChatSessions(sessions);

          // Load the most recent session
          if (sessions.length > 0) {
            const latestSession = sessions[0];
            setCurrentSessionId(latestSession.id);
            setMessages(latestSession.messages || []);
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [isAuthenticated, getToken]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // If this is a new conversation, create a new session
    if (!currentSessionId) {
      const now = new Date();
      const newSession = {
        id: `session_new_${now.getTime()}`, // Use timestamp-based ID
        title: input.substring(0, 50) + (input.length > 50 ? "..." : ""),
        startTime: now,
        endTime: now,
        messageCount: 0,
        messages: [],
      };
      setChatSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    }

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
      const botMessage = { content: data.content, isBot: true };
      setMessages((prev) => [...prev, botMessage]);

      // Update the current session with the new messages
      if (currentSessionId) {
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === currentSessionId
              ? {
                  ...session,
                  messages: [
                    ...session.messages,
                    { content: input, isBot: false },
                    botMessage,
                  ],
                  messageCount: session.messageCount + 2,
                  endTime: new Date(),
                }
              : session
          )
        );
      }
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

  if (loadingHistory) {
    return (
      <div
        className="max-w-4xl mx-auto p-4 flex items-center justify-center"
        style={{ height: "calc(100vh - 200px)", backgroundColor: "#f8fafc" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex"
      style={{ height: "calc(100vh - 120px)", backgroundColor: "#f8fafc" }}
    >
      {/* History Sidebar */}
      {showHistorySidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Chat History
              </h2>
              <button
                onClick={() => setShowHistorySidebar(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={startNewChat}
                className="w-full p-3 text-left hover:bg-blue-50 rounded-lg border-2 border-dashed border-blue-200 text-blue-600 font-medium mb-2"
              >
                + Start New Chat
              </button>

              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    currentSessionId === session.id
                      ? "bg-blue-100 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.messageCount} messages •{" "}
                        {session.startTime.toLocaleDateString()}
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                </div>
              ))}

              {filteredSessions.length === 0 && searchQuery && (
                <p className="text-gray-500 text-center py-4">
                  No conversations found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <History className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                {currentSessionId ? "Chat" : "New Chat"}
              </h1>
              {currentSessionId && (
                <p className="text-sm text-gray-500">
                  {chatSessions.find((s) => s.id === currentSessionId)
                    ?.messageCount || 0}{" "}
                  messages
                </p>
              )}
            </div>
          </div>
          {currentSessionId && (
            <button
              onClick={startNewChat}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Chat
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg mb-2">Welcome to CodeNexus AI Chat!</p>
              <p>
                Ask me anything about coding, algorithms, or your career
                journey.
              </p>
            </div>
          )}

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

        {/* Chat Input */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
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
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
