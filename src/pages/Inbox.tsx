import React, { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane,
  FaBars,
  FaSearch,
  FaUserSlash,
  FaTimes,
  FaCircle,
} from "react-icons/fa";
import axios from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import Api from "../components/Api";

// --------------------------------------------------
// Types
// --------------------------------------------------

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

const PRIMARY_GREEN = "#4eaa3c";
const SEND_MESSAGE_ENDPOINT = `${Api}/customer/sendMessage`;
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const CREATE_CONVERSATION_ENDPOINT = `${Api}/customer/createConv`;

// --------------------------------------------------
// No assistant fallback — same language as Profile's activation card
// --------------------------------------------------

const NoAssistantFallback: React.FC = () => (
  <div className="flex flex-1 items-center justify-center px-5 py-10">
    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <FaUserSlash size={20} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#17231a]">
        No assistant assigned yet
      </h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">
        Your career assistant unlocks once your subscription is active. We
        usually assign within 24 hours of payment.
      </p>

      <div className="mt-6 space-y-2.5">
        <button
          onClick={() => (window.location.href = "/checkout")}
          className="w-full rounded-xl bg-[#17231a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263d2a]"
        >
          View subscription plans
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Check again
        </button>
      </div>
    </div>
  </div>
);

// --------------------------------------------------
// Main Inbox
// --------------------------------------------------

const Inbox: React.FC = () => {
  const [conversations, setConversations] = useState<MessageData[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<MessageData | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [isPolling] = useState(true);

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

  const getAssistantDetails = (userData: UserData) => {
    if (!userData.assistant) {
      return {
        assistantName: "Unassigned Assistant",
        assistantAvatar:
          "https://ui-avatars.com/api/?name=Assistant&background=e5e7eb&color=6b7280",
        isAssistantOnline: false,
      };
    }
    return {
      assistantName: `${userData.assistant.firstname} ${userData.assistant.lastname}`,
      assistantAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        userData.assistant.firstname + "+" + userData.assistant.lastname,
      )}&background=4eaa3c&color=fff`,
      isAssistantOnline: userData.assistant.status === "online",
    };
  };

  const enhanceMessageData = (
    message: MessageData,
    userData: UserData,
  ): MessageData => ({
    ...message,
    ...getAssistantDetails(userData),
  });

  const fetchUserData = async () => {
    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        console.error("Session expired or token missing. Please log in.");
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = response.data;
      setUserData(user);
      userDataRef.current = user;

      if (user.assistant && user.messages && user.messages.length > 0) {
        const transformed = user.messages.map((m) =>
          enhanceMessageData(m, user),
        );

        if (
          JSON.stringify(transformed) !==
          JSON.stringify(conversationsRef.current)
        ) {
          setConversations(transformed);
          conversationsRef.current = transformed;

          if (selectedConversationRef.current) {
            const updated = transformed.find(
              (conv) => conv._id === selectedConversationRef.current?._id,
            );
            if (updated) {
              setSelectedConversation(updated);
              selectedConversationRef.current = updated;
            }
          } else if (transformed.length > 0) {
            setSelectedConversation(transformed[0]);
            selectedConversationRef.current = transformed[0];
          }
        }
      } else if (user.assistant) {
        const tempConversation: MessageData = {
          _id: `temp-${Date.now()}`,
          userId: user._id,
          assistantId: user.assistant._id,
          conversation: [],
          title: "New Conversation",
          lastActivityAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...getAssistantDetails(user),
        };
        setConversations([tempConversation]);
        conversationsRef.current = [tempConversation];
        setSelectedConversation(tempConversation);
        selectedConversationRef.current = tempConversation;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      if (loadingUser) toast.error("Failed to load messages.");
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!isPolling || !userData?.assistant) return;
    const id = setInterval(() => {
      if (isPollingRef.current && userData?.assistant) fetchUserData();
    }, 2000);
    return () => clearInterval(id);
  }, [isPolling, userData?.assistant]);

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

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.conversation?.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedConversation || !userData) {
      if (!userData?.assistant) toast.error("No assistant assigned.");
      return;
    }
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

    const updatedConversation = {
      ...selectedConversation,
      conversation: [...selectedConversation.conversation, newEntry],
    };
    setSelectedConversation(updatedConversation);
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === updatedConversation._id ? updatedConversation : conv,
      ),
    );
    setTimeout(scrollToBottom, 0);

    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Session expired.");
        return;
      }

      let conversationId = selectedConversation._id;

      if (selectedConversation._id.startsWith("temp-")) {
        const createResponse = await axios.post<{ conversation: MessageData }>(
          CREATE_CONVERSATION_ENDPOINT,
          { assistantId: userData.assistant._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        conversationId = createResponse.data.conversation._id;
      }

      await axios.post(
        SEND_MESSAGE_ENDPOINT,
        {
          messageId: conversationId,
          role: newEntry.role,
          content: newEntry.content,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      fetchUserData();
    } catch (err) {
      console.error("Message send failed:", err);
      toast.error("Failed to send message.");
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              conversation: prev.conversation.filter(
                (msg) => !msg._id.startsWith("temp-"),
              ),
            }
          : null,
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === selectedConversation._id ? selectedConversation : conv,
        ),
      );
    }
  };

  const fetchOrCreateConversation = async () => {
    if (!userData) return toast.error("User data not loaded.");
    if (!userData.assistant)
      return toast.error("No assistant assigned to your account.");

    setLoadingConversation(true);
    try {
      const token = await localforage.getItem("authToken");
      if (!token) return toast.error("Authentication required.");

      let conversation: MessageData | null = null;

      if (userData.messages && userData.messages.length > 0) {
        conversation = userData.messages[0];
      } else {
        const createResponse = await axios.post<{
          message: string;
          conversation: MessageData;
        }>(
          CREATE_CONVERSATION_ENDPOINT,
          { assistantId: userData.assistant._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        conversation = createResponse.data.conversation;
      }

      const enhanced = enhanceMessageData(conversation, userData);
      setConversations([enhanced]);
      setSelectedConversation(enhanced);
      fetchUserData();
    } catch (err) {
      console.error("Conversation fetch/create failed:", err);
      toast.error("Failed to load conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  const hasNoAssistant = !loadingUser && userData && !userData.assistant;
  const hasAssistant = !loadingUser && userData && userData.assistant;
  const showStartConversation =
    hasAssistant && !selectedConversation && !loadingConversation;

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loadingUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Loading your inbox...</p>
      </div>
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="w-full max-w-[1500px] mx-auto">
      {/* ── Main chat surface ── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex h-[calc(100vh-220px)] min-h-[520px] relative">
          {/* Sidebar */}
          {hasAssistant && (
            <aside
              className={`fixed lg:static top-0 left-0 h-full lg:h-auto bg-white border-r border-gray-100 w-72 flex flex-col transition-transform duration-300 z-30
                ${
                  sidebarOpen
                    ? "translate-x-0"
                    : "-translate-x-full lg:translate-x-0"
                }`}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-[#17231a]">
                    Conversations
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {conversations.length}{" "}
                    {conversations.length === 1
                      ? "conversation"
                      : "conversations"}
                  </p>
                </div>
                <button
                  className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="p-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <FaSearch className="text-xs text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations…"
                    className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No conversations yet
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Start one to reach your assistant.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const active = selectedConversation?._id === conv._id;
                    return (
                      <button
                        key={conv._id}
                        onClick={() => {
                          setSelectedConversation(conv);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition border-l-2 ${
                          active
                            ? "bg-emerald-50/60 border-[#4eaa3c]"
                            : "border-transparent hover:bg-gray-50"
                        }`}
                      >
                        <img
                          src={conv.assistantAvatar}
                          alt={conv.assistantName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold text-[#17231a]">
                              {conv.assistantName}
                            </h3>
                            {conv.isAssistantOnline && (
                              <FaCircle
                                className="text-[6px] text-[#4eaa3c] shrink-0"
                                aria-label="Online"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {conv.conversation[conv.conversation.length - 1]
                              ?.content || "Start a conversation…"}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                            {conv.conversation.length}{" "}
                            {conv.conversation.length === 1
                              ? "message"
                              : "messages"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}

                {loadingConversation && (
                  <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-gray-200" />
                      <div className="h-2 w-1/2 rounded bg-gray-200" />
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Backdrop for mobile sidebar */}
          {sidebarOpen && hasAssistant && (
            <div
              className="fixed inset-0 bg-[#10251a]/40 backdrop-blur-[2px] z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Chat panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {hasNoAssistant ? (
              <NoAssistantFallback />
            ) : selectedConversation ? (
              <>
                {/* Chat header — matches profile/dashboard identity strips */}
                <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Open sidebar"
                    >
                      <FaBars size={16} />
                    </button>
                    <img
                      src={selectedConversation.assistantAvatar}
                      alt={selectedConversation.assistantName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-[#17231a]">
                        {selectedConversation.assistantName}
                      </h2>
                      <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                        <FaCircle
                          className={`text-[6px] ${
                            selectedConversation.isAssistantOnline
                              ? "text-[#4eaa3c]"
                              : "text-gray-300"
                          }`}
                        />
                        {selectedConversation.isAssistantOnline
                          ? "Online now"
                          : "Offline"}
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4eaa3c]">
                    Career assistant
                  </span>
                </header>

                {/* Messages */}
                <div
                  ref={chatBodyRef}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-[#f9faf8]"
                >
                  {selectedConversation.conversation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#4eaa3c] flex items-center justify-center">
                        <FaPaperPlane size={18} />
                      </div>
                      <p className="mt-4 text-sm font-bold text-[#17231a]">
                        No messages yet
                      </p>
                      <p className="mt-1 text-xs text-gray-500 max-w-xs">
                        Say hi — your assistant is ready to help with anything
                        career-related.
                      </p>
                    </div>
                  ) : (
                    selectedConversation.conversation.map((msg) => {
                      const isUser = msg.role === "user";
                      return (
                        <div
                          key={msg._id}
                          className={`flex items-end gap-2 ${
                            isUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isUser && (
                            <img
                              src={selectedConversation.assistantAvatar}
                              alt={selectedConversation.assistantName}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          )}

                          <div
                            className={`max-w-[80%] sm:max-w-[65%] px-4 py-2.5 text-sm shadow-sm ${
                              isUser
                                ? "bg-[#17231a] text-white rounded-2xl rounded-br-md"
                                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-line leading-relaxed">
                              {msg.content}
                            </p>
                            <div
                              className={`mt-1 text-[10px] font-medium ${
                                isUser
                                  ? "text-green-100/70 text-right"
                                  : "text-gray-400"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>

                          {isUser && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: PRIMARY_GREEN }}
                            >
                              {getUserInitials(userData)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 px-4 sm:px-6 py-3 border-t border-gray-100 bg-white"
                >
                  <input
                    type="text"
                    placeholder={`Message ${selectedConversation.assistantName}…`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4eaa3c] focus:bg-white focus:ring-4 focus:ring-green-50"
                  />
                  <button
                    type="submit"
                    disabled={newMessage.trim() === ""}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4eaa3c] text-white transition hover:bg-[#3f9330] disabled:cursor-not-allowed disabled:bg-gray-300"
                    aria-label="Send message"
                  >
                    <FaPaperPlane size={14} />
                  </button>
                </form>
              </>
            ) : showStartConversation ? (
              <div className="flex flex-1 items-center justify-center px-5">
                <div className="text-center max-w-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#4eaa3c]">
                    <FaPaperPlane size={18} />
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#17231a]">
                    Start a conversation
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Your assistant is ready when you are.
                  </p>
                  <button
                    onClick={fetchOrCreateConversation}
                    disabled={loadingConversation}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#17231a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263d2a] disabled:opacity-50"
                  >
                    {loadingConversation ? "Starting…" : "Start conversation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">
                    Setting up your inbox…
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inbox;
