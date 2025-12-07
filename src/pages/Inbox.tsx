import React, { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane,
  FaBars,
  FaSearch,
  FaUserSlash,
  FaSync,
} from "react-icons/fa";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import Api from "../components/Api";

// --- Custom Hook/Import Mock ---
const useNavigate = () => (path: string) =>
  console.log(`Simulating navigation to ${path}`);

// --- Type Definitions ---

interface ConversationEntry {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface MessageData {
  _id: string;
  userId: string;
  assistantId: string;
  conversation: ConversationEntry[];
  title: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  // Display data from assistant
  assistantName: string;
  assistantAvatar: string;
  isAssistantOnline: boolean;
}

interface UserData {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  assistant: {
    _id: string;
    firstname: string;
    lastname: string;
    status: "online" | "offline";
  } | null;
  messages: MessageData[];
  jobs: any[];
  notifications: any[];
  preferredIndustries: string;
  preferredLocations: string;
  preferredRoles: string;
}

const USER_MESSAGE_COLOR_CLASS = "bg-green-500";
const PRIMARY_COLOR = USER_MESSAGE_COLOR_CLASS;
const SEND_MESSAGE_ENDPOINT = `${Api}/customer/sendMessage`;
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const CREATE_CONVERSATION_ENDPOINT = `${Api}/customer/createConv`;

// --- Fallback Component for No Assistant ---
const NoAssistantFallback: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <FaUserSlash className="text-yellow-600 text-3xl" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          No Assistant Assigned
        </h2>

        <p className="text-gray-600 mb-6">
          Unlock your personalized career assistant by subscribing! Get tailored
          job search support, interview preparation, and career guidance with
          our premium subscription plans.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition duration-200"
          >
            Check Again
          </button>

          <button
            onClick={() => (window.location.href = "/customer/profile")}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition duration-200"
          >
            Subscribe Now
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Usually assigned within 24 hours of subscription.
        </p>
      </div>
    </div>
  );
};

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<MessageData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<MessageData | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  // Use refs to track the latest state without causing re-renders
  const conversationsRef = useRef<MessageData[]>([]);
  const selectedConversationRef = useRef<MessageData | null>(null);
  const userDataRef = useRef<UserData | null>(null);
  const isPollingRef = useRef(true);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  const getUserInitials = (user: UserData | null): string => {
    if (!user) return "U";
    const firstInitial = user.firstname ? user.firstname[0].toUpperCase() : "";
    const lastInitial = user.lastname ? user.lastname[0].toUpperCase() : "";
    return `${firstInitial}${lastInitial}`.substring(0, 2) || "U";
  };

  // Helper function to get assistant details from userData - with null check
  const getAssistantDetails = (userData: UserData) => {
    if (!userData.assistant) {
      return {
        assistantName: "Unassigned Assistant",
        assistantAvatar:
          "https://ui-avatars.com/api/?name=Assistant&background=6b7280&color=fff",
        isAssistantOnline: false,
      };
    }

    return {
      assistantName: `${userData.assistant.firstname} ${userData.assistant.lastname}`,
      assistantAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        userData.assistant.firstname + "+" + userData.assistant.lastname
      )}&background=4eaa3c&color=fff`,
      isAssistantOnline: userData.assistant.status === "online",
    };
  };

  // Helper function to enhance message data with display information
  const enhanceMessageData = (
    message: MessageData,
    userData: UserData
  ): MessageData => {
    const assistantDetails = getAssistantDetails(userData);
    return {
      ...message,
      ...assistantDetails,
    };
  };

  // Function to fetch user data (messages) - SIMPLIFIED VERSION
  const fetchUserData = async () => {
    try {
      const token = await localforage.getItem("authToken");

      if (!token) {
        console.error("Session expired or token missing. Please log in.");
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = response.data;
      setUserData(userData);
      userDataRef.current = userData;

      // Transform the API data into the format expected by the component
      if (
        userData.assistant &&
        userData.messages &&
        userData.messages.length > 0
      ) {
        const transformedConversations: MessageData[] = userData.messages.map(
          (message) => {
            return enhanceMessageData(message, userData);
          }
        );

        // Only update if there are actual changes to avoid unnecessary re-renders
        if (
          JSON.stringify(transformedConversations) !==
          JSON.stringify(conversationsRef.current)
        ) {
          setConversations(transformedConversations);
          conversationsRef.current = transformedConversations;

          // Update selected conversation if it exists in the new data
          if (selectedConversationRef.current) {
            const updatedSelectedConversation = transformedConversations.find(
              (conv) => conv._id === selectedConversationRef.current?._id
            );
            if (updatedSelectedConversation) {
              setSelectedConversation(updatedSelectedConversation);
              selectedConversationRef.current = updatedSelectedConversation;
            }
          } else if (transformedConversations.length > 0) {
            // Set the first conversation as selected if no conversation is selected yet
            setSelectedConversation(transformedConversations[0]);
            selectedConversationRef.current = transformedConversations[0];
          }
        }
      } else if (userData.assistant) {
        // User has assistant but no messages - create a temporary conversation
        const tempConversation: MessageData = {
          _id: `temp-${Date.now()}`,
          userId: userData._id,
          assistantId: userData.assistant._id,
          conversation: [],
          title: "New Conversation",
          lastActivityAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...getAssistantDetails(userData),
        };

        setConversations([tempConversation]);
        conversationsRef.current = [tempConversation];
        setSelectedConversation(tempConversation);
        selectedConversationRef.current = tempConversation;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Only show error toast for initial load, not for polling failures
      if (loadingUser) {
        toast.error("Failed to load messages.");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, []);

  // Polling effect - fetch messages every 2 seconds
  useEffect(() => {
    // Skip polling if not enabled or no assistant
    if (!isPolling || !userData?.assistant) return;

    const intervalId = setInterval(() => {
      if (isPollingRef.current && userData?.assistant) {
        fetchUserData();
      }
    }, 2000); // 2 seconds

    // Cleanup interval on component unmount or when polling stops
    return () => {
      clearInterval(intervalId);
    };
  }, [isPolling, userData?.assistant]);

  // Update refs when state changes
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  // Scroll to bottom when conversation updates
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.conversation?.length]);

  // --- Send Message Handler ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedConversation || !userData) {
      if (!userData?.assistant) {
        toast.error("No assistant assigned to send messages.");
      }
      return;
    }

    // Don't allow sending messages if no real assistant
    if (!userData.assistant) {
      toast.error("No assistant assigned to send messages.");
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage("");

    const newEntry: ConversationEntry = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: messageContent,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI Update
    const updatedConversation = {
      ...selectedConversation,
      conversation: [...selectedConversation.conversation, newEntry],
    };

    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === updatedConversation._id ? updatedConversation : conv
      )
    );

    setTimeout(scrollToBottom, 0);

    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Session expired.");
        return;
      }

      let conversationId = selectedConversation._id;

      // If this is a temporary conversation, we need to create it first
      if (selectedConversation._id.startsWith("temp-")) {
        const createResponse = await axios.post<{ conversation: MessageData }>(
          CREATE_CONVERSATION_ENDPOINT,
          {
            assistantId: userData.assistant._id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const createdConversation = createResponse.data.conversation;
        conversationId = createdConversation._id;

        // Now send the actual message to the newly created conversation
        await axios.post(
          SEND_MESSAGE_ENDPOINT,
          {
            messageId: conversationId,
            role: newEntry.role,
            content: newEntry.content,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Existing conversation - just send the message
        await axios.post(
          SEND_MESSAGE_ENDPOINT,
          {
            messageId: conversationId,
            role: newEntry.role,
            content: newEntry.content,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Immediately refresh messages after sending
      fetchUserData();
    } catch (err) {
      console.error("Message send failed:", err);
      toast.error("Failed to send message.");

      // Revert optimistic update on failure
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              conversation: prev.conversation.filter(
                (msg) => !msg._id.startsWith("temp-")
              ),
            }
          : null
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === selectedConversation._id ? selectedConversation : conv
        )
      );
    }
  };

  const fetchOrCreateConversation = async () => {
    if (!userData) {
      toast.error("User data not loaded.");
      return;
    }

    if (!userData.assistant) {
      toast.error("No assistant assigned to your account.");
      return;
    }

    setLoadingConversation(true);
    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Authentication required.");
        return;
      }

      let conversation: MessageData | null = null;

      // If user has existing messages, use the first one
      if (userData.messages && userData.messages.length > 0) {
        conversation = userData.messages[0];
      } else {
        // If no existing conversation, create a new one
        const createResponse = await axios.post<{
          message: string;
          conversation: MessageData;
        }>(
          CREATE_CONVERSATION_ENDPOINT,
          {
            assistantId: userData.assistant._id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        conversation = createResponse.data.conversation;
      }

      // Add display data for the conversation using the assistant from userData
      const enhancedConversation = enhanceMessageData(conversation, userData);

      setConversations([enhancedConversation]);
      setSelectedConversation(enhancedConversation);

      // Immediately refresh messages to get latest
      fetchUserData();
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Conversation fetch/create failed:", axiosError);
      toast.error("Failed to load conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  // Manual refresh button handler
  const handleManualRefresh = () => {
    fetchUserData();
  };

  // Function to stop polling (optional)
  const stopPolling = () => {
    setIsPolling(false);
  };

  // Function to start polling (optional)
  const startPolling = () => {
    setIsPolling(true);
  };

  // Check if user has no assistant
  const hasNoAssistant = !loadingUser && userData && !userData.assistant;
  const hasAssistant = !loadingUser && userData && userData.assistant;
  const showStartConversation =
    hasAssistant && !selectedConversation && !loadingConversation;

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Sidebar (Assistant List) */}
      {hasAssistant && (
        <div
          className={`fixed lg:static top-0 left-0 h-full bg-white border-r border-gray-200 w-72 flex flex-col transition-transform duration-300 z-30
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              My Assistant
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-500 hover:text-green-600 transition disabled:opacity-50"
                title="Refresh messages"
              >
                <FaSync className={`${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                ✖
              </button>
            </div>
          </div>

          <div className="p-3 flex items-center bg-gray-50 mx-3 rounded-lg">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-2">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 mt-8 px-4">
                <p>No conversations yet</p>
                <p className="text-sm mt-2">
                  Start a conversation with your assistant
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-gray-100
                    ${
                      selectedConversation?._id === conv._id
                        ? `bg-gray-100 border-l-4 ${PRIMARY_COLOR}`
                        : ""
                    }`}
                >
                  <img
                    src={conv.assistantAvatar}
                    alt={conv.assistantName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {conv.assistantName}
                      </h3>
                      <div className="flex items-center gap-1">
                        {conv.isAssistantOnline && (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {conv.conversation[conv.conversation.length - 1]
                        ?.content || "Start a conversation..."}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {conv.conversation.length} messages
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Show loading state */}
            {loadingConversation && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <div
        className={`flex-1 flex flex-col relative ${
          hasNoAssistant ? "w-full" : ""
        }`}
      >
        {loadingUser ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-gray-500">Loading your inbox...</div>
          </div>
        ) : hasNoAssistant ? (
          <NoAssistantFallback />
        ) : selectedConversation ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden text-gray-600"
                  onClick={() => setSidebarOpen(true)}
                >
                  <FaBars size={18} />
                </button>
                <img
                  src={selectedConversation.assistantAvatar}
                  alt={selectedConversation.assistantName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.assistantName}
                  </h2>
                  <p
                    className={`text-xs ${
                      selectedConversation.isAssistantOnline
                        ? "text-green-500"
                        : "text-gray-400"
                    }`}
                  >
                    {selectedConversation.isAssistantOnline
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div
              ref={chatBodyRef}
              className="flex-1 overflow-y-auto px-2 py-5 space-y-5 bg-gray-50"
            >
              {selectedConversation.conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="text-lg mb-2">No messages yet</p>
                  <p className="text-sm">
                    Start a conversation with your assistant!
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    Auto-refreshing every 2 seconds for new messages
                  </div>
                </div>
              ) : (
                selectedConversation.conversation.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex items-end ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <img
                        src={selectedConversation.assistantAvatar}
                        alt={selectedConversation.assistantName}
                        className="w-8 h-8 rounded-full mr-1"
                      />
                    )}

                    <div
                      className={`max-w-[95%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        msg.role === "user"
                          ? `${USER_MESSAGE_COLOR_CLASS} text-white rounded-br-none`
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-xs mt-1 ${
                          msg.role === "user"
                            ? "text-green-100 text-right"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ml-1`}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        {getUserInitials(userData)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="bg-white border-t border-gray-200 p-4 flex items-center gap-3 sticky bottom-0 shadow-md"
            >
              <input
                type="text"
                placeholder={`Message ${selectedConversation.assistantName}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={newMessage.trim() === ""}
                className={`p-3 rounded-full ${USER_MESSAGE_COLOR_CLASS} text-white transition disabled:bg-gray-400`}
              >
                <FaPaperPlane size={16} />
              </button>
            </form>
          </>
        ) : showStartConversation ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <p className="text-gray-500 mb-4">
                Start a conversation with your assistant
              </p>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                onClick={fetchOrCreateConversation}
              >
                Start Conversation
              </button>
              <div className="mt-4 text-xs text-gray-400">
                Will auto-refresh for new messages every 2 seconds
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <div className="text-gray-500">Setting up your inbox...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
