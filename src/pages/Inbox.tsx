import React, { useState } from "react";
import {
  FaPaperclip,
  FaPaperPlane
} from "react-icons/fa";

const Inbox: React.FC = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "assistant",
      name: "Sarah (Your Assistant)",
      avatar: "https://i.pravatar.cc/40?img=5",
      text: "Hey there 👋 I’ve found three new roles that match your profile perfectly! Would you like me to shortlist them?",
      time: "09:12 AM",
    },
    {
      id: 2,
      sender: "client",
      text: "Sure, please go ahead. I’d like something related to marketing if possible.",
      time: "09:16 AM",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        sender: "client",
        text: newMessage,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setNewMessage("");
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://i.pravatar.cc/60?img=5"
            alt="Assistant"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h2 className="font-semibold text-gray-900">Sarah Johnson</h2>
            <p className="text-sm text-green-500">Online</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end ${
              msg.sender === "client" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "assistant" && (
              <img
                src={msg.avatar}
                alt={msg.name}
                className="w-8 h-8 rounded-full mr-3"
              />
            )}
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                msg.sender === "client"
                  ? "bg-[var(--color-primary)] text-white rounded-br-none"
                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
              }`}
            >
              {msg.text}
              <div
                className={`text-xs mt-1 ${
                  msg.sender === "client"
                    ? "text-gray-100 text-right"
                    : "text-gray-500"
                }`}
              >
                {msg.time}
              </div>
            </div>
            {msg.sender === "client" && (
              <div className="w-8 h-8 rounded-full ml-3 bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-semibold">
                You
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="bg-white border-t border-gray-100 px-6 py-3 text-sm text-gray-600">
          <p className="font-medium mb-1">Attachments:</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full text-xs"
              >
                📎 {file.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-100 p-4 flex items-center gap-3 sticky bottom-0">
        <label
          htmlFor="attachment"
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"
        >
          <FaPaperclip size={18} className="text-gray-600" />
        </label>
        <input
          id="attachment"
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachment}
        />

        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <button
          onClick={handleSendMessage}
          className="p-3 rounded-full bg-[var(--color-primary)] text-white hover:opacity-90 transition"
        >
          <FaPaperPlane size={16} />
        </button>
      </div>
    </div>
  );
};

export default Inbox;
