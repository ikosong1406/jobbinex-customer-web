import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaBars, FaSearch } from "react-icons/fa";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import Api from "../components/Api";

// --- Custom Hook/Import Mock ---
// Assuming this is used for navigation on session expiry
// Replace with 'import { useNavigate } from "react-router-dom";' if you're using react-router-dom
const useNavigate = () => (path: string) =>
  console.log(`Simulating navigation to ${path}`);

// --- Type Definitions based on the final Mongoose Schema ---

// Defines a single entry in the chat thread
interface ConversationEntry {
  _id: string;
  role: "user" | "assistant";
  content: string; // Renamed from 'text' to match the schema 'content'
  createdAt: string; // The time the message was sent
}

// Defines the entire conversation thread (the Parent 'Message' document)
interface MessageData {
  _id: string; // The conversation ID (Message ID in your schema)
  userId: string;
  assistantId: string;
  // This is the array that holds all individual messages
  conversation: ConversationEntry[];
  // Placeholder data for display (must be filled during fetch/population)
  assistantName: string; // The name of the Assistant
  assistantAvatar: string; // The avatar of the Assistant
  isAssistantOnline: boolean; // Online status of the Assistant
}

// **NEW:** Interface for User Data
interface UserData {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  // ... potentially other fields
}

// Placeholder for the primary color variable (often green or blue for user messages)
const USER_MESSAGE_COLOR_CLASS = "bg-green-500"; // Changed to a common green class
const PRIMARY_COLOR = USER_MESSAGE_COLOR_CLASS; // Using green for consistency
const MESSAGE_API_ENDPOINT = `${Api}/customer/sendMessage`; // Conversation endpoint
// **NEW:** User Data Endpoint
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`; // Example endpoint

const Inbox: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [conversations, setConversations] = useState<MessageData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<MessageData | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // **REMOVED:** const [loading, setLoading] = useState(true); // This was declared but never read
  // **NEW:** State for User Data and Loading
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Function to simulate scrolling to the bottom of the chat
  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  // **NEW:** Function to get User Initials
  const getUserInitials = (user: UserData | null): string => {
    if (!user) return "U";
    const firstInitial = user.firstname ? user.firstname[0].toUpperCase() : "";
    const lastInitial = user.lastname ? user.lastname[0].toUpperCase() : "";
    return `${firstInitial}${lastInitial}`.substring(0, 2) || "U";
  };

  // --- Data Fetching ---

  // **NEW:** User Data Fetching Function
  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const token = await localforage.getItem("authToken");

      if (!token) {
        toast.error("Session expired or token missing. Please log in.");
        navigate("/"); // Redirect to login
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`, // Send token in the Authorization header
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
        navigate("/"); // **FIXED:** Removed second argument
      } else {
        toast.error("Failed to load user data.");
      }
    } finally {
      setLoadingUser(false);
    }
  };
  // **END NEW**

  const fetchConversations = async () => {
    // **REMOVED:** setLoading(true); // This was setting a state that's never used
    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Authentication required.");
        return;
      }

      // NOTE: This endpoint should fetch ALL conversation documents
      // for the currently logged-in user.
      const response = await axios.get<MessageData[]>(MESSAGE_API_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // --- MOCKING DISPLAY DATA for demonstration ---
      const mockData: MessageData[] = response.data.map((conv) => ({
        ...conv,
        // Mocking display data for the Assistant
        assistantName: `Assistant ${conv.assistantId.substring(0, 4)}`,
        assistantAvatar: `https://i.pravatar.cc/60?img=${Math.floor(
          Math.random() * 25
        )}`,
        isAssistantOnline: Math.random() > 0.5,
      }));

      setConversations(mockData);
      if (mockData.length > 0 && !selectedConversation) {
        setSelectedConversation(mockData[0]);
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Fetch failed:", axiosError);
      toast.error("Failed to load conversations.");
    } finally {
      // **REMOVED:** setLoading(false); // This was setting a state that's never used
    }
  };

  // **NEW:** Fetch user data first, then conversations
  useEffect(() => {
    fetchUserData();
  }, [navigate]); // Depend on navigate mock/real hook

  useEffect(() => {
    if (!loadingUser) {
      fetchConversations();
    }
  }, [loadingUser]); // Fetch conversations once user data loading is complete

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  // --- Send Message Handler ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    const newEntry: ConversationEntry = {
      _id: Date.now().toString(), // Mock ID for immediate display
      role: "user", // The sender is the 'user'
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

    // Scroll to bottom immediately after optimistic update
    setTimeout(scrollToBottom, 0);

    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Session expired.");
        return;
      }

      // API call to push the new message entry into the 'conversation' array
      await axios.post(
        `${MESSAGE_API_ENDPOINT}/${selectedConversation._id}`,
        {
          role: newEntry.role,
          content: newEntry.content,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      // Revert optimistic update on failure
      console.error("Message send failed:", err);
      toast.error("Failed to send message.");

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

  // **REMOVED:** The commented-out loading logic since we're not using loading state anymore

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Sidebar (Clients List) */}
      <div
        className={`fixed lg:static top-0 left-0 h-full bg-white border-r border-gray-200 w-72 flex flex-col transition-transform duration-300 z-30
				${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="p-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversations ({conversations.length})
          </h2>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            ✖
          </button>
        </div>

        <div className="p-3 flex items-center bg-gray-50 mx-3 rounded-lg">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search assistants..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            // Filter logic would go here
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
                    ? `bg-gray-100 border-l-4 border-[${PRIMARY_COLOR}]`
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
                    "No messages yet."}
                </p>
              </div>
            </div>
          ))}
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
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gray-50"
            >
              {selectedConversation.conversation.map((msg) => (
                <div
                  key={msg._id}
                  // KEY CHANGE: Check for 'user' to align right
                  className={`flex items-end ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar for the Assistant (Left Side) */}
                  {msg.role === "assistant" && (
                    <img
                      src={selectedConversation.assistantAvatar}
                      alt={selectedConversation.assistantName}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === "user" // KEY CHANGE: User message on the right with green background
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
                      {/* Format the timestamp */}
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* **UPDATED**: User Initials Avatar for the User (Right Side) */}
                  {msg.role === "user" && (
                    <div
                      className={`w-8 h-8 rounded-full ml-3 bg-gray-200 flex items-center justify-center text-xs font-semibold`}
                      style={{
                        backgroundColor: PRIMARY_COLOR,
                        color: "white",
                      }} // Use primary color for user's own avatar
                    >
                      {getUserInitials(userData)}
                    </div>
                  )}
                </div>
              ))}
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
                // **FIXED:** Using bracket notation for dynamic Tailwind JIT color can be problematic.
                // Replaced with a placeholder class or fixed color if necessary for consistency.
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
            <p className="text-gray-500">
              Select an assistant to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
