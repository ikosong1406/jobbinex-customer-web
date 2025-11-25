import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaBars, FaSearch } from "react-icons/fa";
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
  };
  messages: MessageData[]; // Array of message objects
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

  // Helper function to get assistant details from userData
  const getAssistantDetails = (userData: UserData) => {
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

  // --- Data Fetching ---

  const fetchUserData = async () => {
    setLoadingUser(true);
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
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("User data fetch failed:", axiosError);

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
    if (!userData || !userData.assistant) {
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
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Conversation fetch/create failed:", axiosError);
      toast.error("Failed to load conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  // Create a temporary conversation from userData (for UI purposes when no conversation exists)
  const createTemporaryConversation = (): MessageData => {
    if (!userData || !userData.assistant) {
      throw new Error("No user data or assistant available");
    }

    const assistantDetails = getAssistantDetails(userData);

    return {
      _id: `temp-${Date.now()}`,
      userId: userData._id,
      assistantId: userData.assistant._id,
      conversation: [],
      title: "New Conversation",
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...assistantDetails,
    };
  };

  useEffect(() => {
    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    if (!loadingUser && userData) {
      // If user has an assistant but no messages, create a temporary conversation for UI
      if (
        userData.assistant &&
        (!userData.messages || userData.messages.length === 0)
      ) {
        try {
          const tempConversation = createTemporaryConversation();
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
    }
  }, [loadingUser, userData]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  // --- Send Message Handler ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedConversation || !userData) return;

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
        const enhancedConversation = enhanceMessageData(
          createdConversation,
          userData
        );

        // Now send the actual message to the newly created conversation
        await axios.post(
          SEND_MESSAGE_ENDPOINT,
          {
            messageId: createdConversation._id,
            role: newEntry.role,
            content: newEntry.content,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update with the real conversation data
        setSelectedConversation(enhancedConversation);
        setConversations([enhancedConversation]);
      } else {
        // Existing conversation - just send the message
        await axios.post(
          SEND_MESSAGE_ENDPOINT,
          {
            messageId: selectedConversation._id,
            role: newEntry.role,
            content: newEntry.content,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
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

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Sidebar (Assistant List) */}
      <div
        className={`fixed lg:static top-0 left-0 h-full bg-white border-r border-gray-200 w-72 flex flex-col transition-transform duration-300 z-30
        ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Assistant</h2>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            ✖
          </button>
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
                  {conv.isAssistantOnline && (
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
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

          {/* Show if user has no assistant */}
          {!loadingUser && userData && !userData.assistant && (
            <div className="px-4 py-3 text-center text-gray-500">
              <p>No assistant assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col relative">
        {selectedConversation ? (
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
        ) : (
          <div className="flex items-center justify-center flex-1">
            {loadingConversation || loadingUser ? (
              <div className="text-gray-500">Loading...</div>
            ) : userData && !userData.assistant ? (
              <div className="text-center">
                <p className="text-gray-500 mb-4">
                  No assistant assigned to your account.
                </p>
                <p className="text-sm text-gray-400">
                  Please contact support to get assigned an assistant.
                </p>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
