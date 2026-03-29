"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE } from "./lib/config";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const streamBufferRef = useRef("");

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId],
  );

  const messages = activeChat?.messages ?? [];

  // ---------------- INIT ----------------
  useEffect(() => {
    const saved = localStorage.getItem("ai_chats");

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Chat[];
        setChats(parsed);
        setActiveChatId(parsed[0]?.id || null);
        return;
      } catch {}
    }

    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };

    setChats([newChat]);
    setActiveChatId(newChat.id);
  }, []);

  useEffect(() => {
    localStorage.setItem("ai_chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- CHAT ----------------
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || isUploading) return;
    if (!activeChatId) return;

    const chatId = activeChatId;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;

        const updated: Message[] = [
          ...chat.messages,
          userMessage,
          { role: "assistant", content: "Thinking..." },
        ];

        return {
          ...chat,
          title:
            chat.title === "New Chat" && chat.messages.length === 0
              ? input.slice(0, 30)
              : chat.title,
          messages: updated,
        };
      }),
    );

    setInput("");
    setIsStreaming(true);
    streamBufferRef.current = "";

    try {
      const res = await fetch(
        `${API_BASE}/query-stream?question=${encodeURIComponent(input)}`,
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const raw = line.replace("data: ", "").trim();
          if (!raw || raw === "[DONE]") continue;

          const data = JSON.parse(raw);

          if (data.type === "token") {
            streamBufferRef.current += data.content;

            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== chatId) return chat;

                const updated = [...chat.messages];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: streamBufferRef.current,
                };

                return { ...chat, messages: updated };
              }),
            );
          }

          if (data.type === "sources") {
            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== chatId) return chat;

                const updated = [...chat.messages];
                const last = updated[updated.length - 1];

                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    sources: data.data || [],
                  };
                }

                return { ...chat, messages: updated };
              }),
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  // ---------------- FILE UPLOAD ----------------
  const handleUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();

      alert("✅ PDF uploaded. Ask questions now.");
    } catch {
      alert("❌ Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-[#0b0f19] to-black text-white">
      {/* SIDEBAR */}
      <div className="w-64 border-r border-gray-800 p-4 flex flex-col">
        <button
          onClick={createNewChat}
          className="bg-blue-600 hover:bg-blue-700 py-2 rounded-xl mb-4"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`p-3 rounded-lg cursor-pointer text-sm ${
                chat.id === activeChatId ? "bg-blue-600" : "hover:bg-gray-800"
              }`}
            >
              {chat.title}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-800 text-center font-semibold tracking-wide">
          AI Knowledge Engine ⚡
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              Ask anything from your uploaded PDFs 📄
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={`${activeChatId}-${i}-${msg.content.slice(0, 10)}`}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600"
                    : "bg-[#111827] border border-gray-700"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>

                {msg.sources && (
                  <div className="mt-3 text-xs text-gray-400">
                    Sources: {msg.sources.length}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {/* Upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="text-xs"
            />

            {isUploading && (
              <span className="text-xs text-gray-400 animate-pulse">
                Uploading...
              </span>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <input
              className="flex-1 bg-[#111827] border border-gray-700 px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              disabled={isStreaming || isUploading}
              className="bg-blue-600 hover:bg-blue-700 px-5 rounded-xl disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
