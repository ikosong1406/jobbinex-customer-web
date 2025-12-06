import React, { useState, useEffect, useRef, useCallback } from "react";
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
const GET_MESSAGE_ENDPOINT = `${Api}/customer/messages`; // Add this endpoint for fetching messages

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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Use useRef for polling interval instead of useState
  const pollingIntervalRef = useRef<number | null>(null);
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

  // --- Refresh Logic ---

  const refreshMessages = useCallback(
    async (conversationId?: string) => {
      if (!userData || !userData.assistant || isRefreshing) {
        return;
      }

      setIsRefreshing(true);
      try {
        const token = await localforage.getItem("authToken");
        if (!token) return;

        // Fetch all user messages
        const response = await axios.get<{ messages: MessageData[] }>(
          GET_MESSAGE_ENDPOINT,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.messages && response.data.messages.length > 0) {
          const enhancedMessages = response.data.messages.map((msg) =>
            enhanceMessageData(msg, userData)
          );

          setConversations(enhancedMessages);

          // If we have a selected conversation, update it
          if (selectedConversation) {
            const currentConv = enhancedMessages.find(
              (conv) => conv._id === selectedConversation._id
            );
            if (currentConv) {
              setSelectedConversation(currentConv);
            }
          } else if (conversationId) {
            // If we just created a conversation, select it
            const newConv = enhancedMessages.find(
              (conv) => conv._id === conversationId
            );
            if (newConv) {
              setSelectedConversation(newConv);
            }
          } else if (enhancedMessages.length > 0) {
            // Select the first conversation by default
            setSelectedConversation(enhancedMessages[0]);
          }
        }

        setLastRefreshTime(new Date());
      } catch (error) {
        console.error("Failed to refresh messages:", error);
        // Don't stop polling on error, just log it
      } finally {
        setIsRefreshing(false);
      }
    },
    [userData, selectedConversation, isRefreshing]
  );

  // Start polling for new messages every 2 seconds
  const startPolling = useCallback(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    pollingIntervalRef.current = window.setInterval(() => {
      if (userData?.assistant && !isRefreshing) {
        refreshMessages();
      }
    }, 2000); // Poll every 2 seconds
  }, [userData, isRefreshing, refreshMessages]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // --- Data Fetching ---

  const fetchUserData = async () => {
    setLoadingUser(true);
    setDataLoaded(false);
    try {
      const token = await localforage.getItem("authToken");

      if (!token) {
        toast.error("Session expired or token missing. Please log in.");
        navigate("/");
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserData(response.data);
      setDataLoaded(true);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("User data fetch failed:", axiosError);
      setDataLoaded(true);

      if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403
      ) {
        toast.error("Your session has expired. Please log in again.");
        await localforage.removeItem("authToken");
        navigate("/");
      } else {
        toast.error("Failed to load user data.");
      }
    } finally {
      setLoadingUser(false);
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

      // Refresh messages to get the latest
      refreshMessages(enhancedConversation._id);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Conversation fetch/create failed:", axiosError);
      toast.error("Failed to load conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  // Create a temporary conversation from userData (for UI purposes when no conversation exists)
  const createTemporaryConversation = (userData: UserData): MessageData => {
    const assistantDetails = getAssistantDetails(userData);

    return {
      _id: `temp-${Date.now()}`,
      userId: userData._id,
      assistantId: userData.assistant?._id || "unassigned",
      conversation: [],
      title: "New Conversation",
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...assistantDetails,
    };
  };

  // Initialize conversations after user data is loaded
  const initializeConversations = (userData: UserData) => {
    // If user has an assistant but no messages, create a temporary conversation for UI
    if (
      userData.assistant &&
      (!userData.messages || userData.messages.length === 0)
    ) {
      try {
        const tempConversation = createTemporaryConversation(userData);
        setConversations([tempConversation]);
        setSelectedConversation(tempConversation);
      } catch (error) {
        console.error("Failed to create temporary conversation:", error);
      }
    } else if (userData.messages && userData.messages.length > 0) {
      // User has existing messages - enhance the first one with display data
      const enhancedMessage = enhanceMessageData(
        userData.messages[0],
        userData
      );
      setConversations([enhancedMessage]);
      setSelectedConversation(enhancedMessage);
    }
    // If no assistant and no messages, the fallback will handle it
  };

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, []);

  // Initialize conversations when user data loads
  useEffect(() => {
    if (!loadingUser && userData && dataLoaded) {
      initializeConversations(userData);
    }
  }, [loadingUser, userData, dataLoaded]);

  // Start polling when a conversation is selected and user has assistant
  useEffect(() => {
    if (selectedConversation && userData?.assistant) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [selectedConversation, userData, startPolling, stopPolling]);

  // Clean up polling interval on component unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Scroll to bottom when conversation updates
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

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
      _id: Date.now().toString(),
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

        // Refresh to get the actual conversation data
        refreshMessages(conversationId);
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

        // Refresh after sending message to get any immediate response
        setTimeout(() => {
          refreshMessages(conversationId);
        }, 500);
      }
    } catch (err) {
      console.error("Message send failed:", err);
      toast.error("Failed to send message.");

      // Revert optimistic update on failure
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              conversation: prev.conversation.filter(
                (msg) => msg._id !== newEntry._id
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

  // Manual refresh button handler
  const handleManualRefresh = () => {
    if (!isRefreshing) {
      refreshMessages();
    }
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
            {conversations.map((conv) => (
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
                    {conv.conversation[conv.conversation.length - 1]?.content ||
                      "Start a conversation..."}
                  </p>
                </div>
              </div>
            ))}

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

          {/* Last refresh time indicator */}
          {lastRefreshTime && (
            <div className="p-3 text-xs text-gray-500 border-t border-gray-200">
              Last updated:{" "}
              {lastRefreshTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
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
              <div className="flex items-center gap-3">
                {isRefreshing && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FaSync className="animate-spin" /> Updating...
                  </span>
                )}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-500 hover:text-green-600 transition disabled:opacity-50"
                  title="Refresh messages"
                >
                  <FaSync className={`${isRefreshing ? "animate-spin" : ""}`} />
                </button>
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
