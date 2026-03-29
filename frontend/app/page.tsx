"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const streamBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, messages: newMessages } : chat,
      ),
    );
  };

  const updateActiveChatMessages = (newMessages: Message[]) => {
    if (!activeChatId) return;
    updateChatMessages(activeChatId, newMessages);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    const saved = localStorage.getItem("ai_chats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Chat[];
        setChats(parsed);
        if (parsed.length > 0) {
          setActiveChatId(parsed[0].id);
        }
        return;
      } catch {
        // fall through to create a new chat
      }
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
    if (chats.length > 0) {
      localStorage.setItem("ai_chats", JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || isUploading) return;

    let chatId = activeChatId;
    let currentMessages = messages;
    if (!chatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
      };
      chatId = newChat.id;
      currentMessages = newChat.messages;
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
    }

    const userMessage: Message = { role: "user", content: input };

    streamBufferRef.current = "";
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const userInput = input;
    const nextMessages: Message[] = [
      ...currentMessages,
      userMessage,
      { role: "assistant", content: "Thinking..." },
    ];

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        const title =
          chat.title === "New Chat" && currentMessages.length === 0
            ? userInput.slice(0, 30) || "New Chat"
            : chat.title;
        return { ...chat, title, messages: nextMessages };
      }),
    );
    setInput("");
    setIsStreaming(true);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${apiBase}/query-stream?question=${encodeURIComponent(input)}`,
      );

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const raw = line.replace("data: ", "").trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const data = JSON.parse(raw);

            // ✅ HANDLE TOKEN STREAM
            if (data.type === "token") {
              fullText += data.content;
              streamBufferRef.current += data.content;

              if (!rafIdRef.current) {
                rafIdRef.current = requestAnimationFrame(() => {
                  setChats((prev) =>
                    prev.map((chat) => {
                      if (chat.id !== chatId) return chat;
                      if (chat.messages.length === 0) return chat;
                      const updated = [...chat.messages];
                      updated[updated.length - 1] = {
                        role: "assistant",
                        content: streamBufferRef.current,
                      };
                      return { ...chat, messages: updated };
                    }),
                  );

                  rafIdRef.current = null;
                });
              }
            }

            // ✅ HANDLE SOURCES
            if (data.type === "sources") {
              setChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== chatId) return chat;
                  if (chat.messages.length === 0) return chat;
                  const updated = [...chat.messages];
                  const last = updated[updated.length - 1];
                  if (last?.role !== "assistant") return chat;
                  updated[updated.length - 1] = {
                    ...last,
                    sources: Array.isArray(data.data) ? data.data : [],
                  };
                  return { ...chat, messages: updated };
                }),
              );
            }
          } catch (err) {
            console.error("Parse error:", err, raw);
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          if (chat.messages.length === 0) {
            return {
              ...chat,
              messages: [
                {
                  role: "assistant",
                  content: "⚠️ Something went wrong. Please try again.",
                },
              ],
            };
          }
          const updated = [...chat.messages];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "⚠️ Something went wrong. Please try again.",
          };
          return { ...chat, messages: updated };
        }),
      );
    } finally {
      setIsStreaming(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0f19] text-white">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0a0e17] border-r border-gray-800 flex flex-col">
        {/* New Chat */}
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
            + New Chat
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("ai_chats");
              setChats([]);
              createNewChat();
            }}
            className="w-full mt-2 text-xs text-gray-400 hover:text-white"
          >
            Clear All Chats
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`p-3 rounded-lg cursor-pointer text-sm truncate ${
                activeChatId === chat.id ? "bg-gray-800" : "hover:bg-gray-800"
              }`}
            >
              {chat.title}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 text-center font-semibold">
          AI Knowledge Engine
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20 space-y-4">
              <div className="text-lg">What can I help with?</div>

              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Summarize my document",
                  "Key insights?",
                  "Explain simply",
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-full text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`group relative max-w-[75%] px-5 py-4 rounded-2xl text-sm leading-relaxed transition ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-[#111827] border border-gray-700 hover:border-gray-600"
                }`}
              >
                {msg.role === "assistant" && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute top-2 right-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition hover:text-white"
                  >
                    Copy
                  </button>
                )}

                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const isBlock = Boolean(className);

                        return isBlock ? (
                          <pre className="bg-black p-3 rounded-lg overflow-x-auto text-sm mt-3">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code
                            className="bg-gray-700 px-1 py-0.5 rounded text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {isStreaming &&
                    msg.role === "assistant" &&
                    msg.content === "Thinking..." && (
                      <div className="text-xs text-gray-400 mt-2 animate-pulse">
                        AI is thinking...
                      </div>
                    )}
                </div>

                {msg.content.includes("⚠️") && (
                  <div className="text-red-400 text-xs mt-2">
                    Please try again or check connection.
                  </div>
                )}

                {isStreaming && i === messages.length - 1 && (
                  <div className="text-xs text-gray-400 mt-2 animate-pulse">
                    Generating response...
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-gray-700 space-y-2">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      Sources
                    </div>

                    {msg.sources.map((s: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs hover:border-gray-600 transition"
                      >
                        <div className="font-medium text-gray-200">
                          📄 {s.source}
                        </div>

                        {s.page && (
                          <div className="text-gray-400">Page {s.page}</div>
                        )}

                        {s.snippet && (
                          <div className="mt-1 text-gray-500 line-clamp-3">
                            {s.snippet}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          <div className="max-w-3xl mx-auto mb-3 flex items-center justify-between gap-3">
            <input
              type="file"
              accept=".pdf"
              disabled={isUploading || isStreaming}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setIsUploading(true);
                try {
                  const apiBase =
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                  const formData = new FormData();
                  formData.append("file", file);

                  const res = await fetch(`${apiBase}/upload`, {
                    method: "POST",
                    body: formData,
                  });

                  if (!res.ok) {
                    throw new Error("Upload failed");
                  }

                  alert("File uploaded!");
                } catch (err) {
                  console.error(err);
                  alert("Upload failed. Please try again.");
                } finally {
                  setIsUploading(false);
                  e.currentTarget.value = "";
                }
              }}
              className="text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-xs file:text-gray-200 hover:file:bg-gray-700 disabled:opacity-60"
            />

            {isUploading && (
              <div className="text-xs text-gray-400 animate-pulse">
                Uploading and indexing…
              </div>
            )}
          </div>
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              className="flex-1 bg-[#111827] border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              onClick={sendMessage}
              disabled={isStreaming || isUploading}
              className={`px-5 py-3 rounded-xl text-sm font-medium transition ${
                isStreaming || isUploading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
