"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  createdAt: number;
  from_docs?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const question = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
        createdAt: Date.now(),
      },
      {
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ]);

    setInput("");
    setIsStreaming(true);
    startStream(question);
  };

  const startStream = (question: string) => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/query-stream?question=${encodeURIComponent(
        question,
      )}`,
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // 🔥 STREAM TOKENS (NO DUPLICATION)
      if (data.type === "token") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          updated[lastIndex] = {
            ...updated[lastIndex],
            content: updated[lastIndex].content + data.content,
          };

          return updated;
        });
      }

      // 🔥 FINAL SOURCES + FLAG
      if (data.type === "sources") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          updated[lastIndex] = {
            ...updated[lastIndex],
            sources: data.from_docs ? data.data : null,
            from_docs: data.from_docs,
          };

          return updated;
        });

        eventSource.close();
        setIsStreaming(false);
      }
    };

    eventSource.onerror = async () => {
      console.log("SSE failed, falling back to /query");

      eventSource.close();
      setIsStreaming(false);

      // 🔁 FALLBACK CALL
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question,
          }),
        });

        const data = await res.json();

        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          updated[lastIndex] = {
            ...updated[lastIndex],
            content: data.answer,
            sources: data.sources,
            from_docs: data.sources?.length > 0,
          };

          return updated;
        });
      } catch (err) {
        console.error("Fallback failed:", err);
      }
    };
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 py-3 text-center">
        <h1 className="text-lg font-semibold tracking-wide text-cyan-400">
          ⚡ AI Knowledge Engine
        </h1>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";

            return (
              <div key={i} className="w-full">
                <div
                  className={`flex w-full ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-md backdrop-blur-md
                    max-w-[85%] break-words
                    ${
                      isUser
                        ? "bg-cyan-600/20 border border-cyan-500 ml-auto"
                        : "bg-white/5 border border-white/10 mr-auto"
                    }`}
                  >
                    {/* 🔥 Badge */}
                    {!isUser && msg.from_docs !== undefined && (
                      <div className="mb-2">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            msg.from_docs
                              ? "bg-green-500/10 text-green-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {msg.from_docs
                            ? "Answer from Documents"
                            : "General Knowledge"}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    {isUser ? (
                      <p>{msg.content}</p>
                    ) : msg.content.length === 0 ? (
                      <p className="text-gray-400 italic">Thinking...</p>
                    ) : (
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Sources */}
                    {msg.sources && (
                      <div className="mt-3 text-xs text-gray-400 border-t border-white/10 pt-2">
                        <p className="font-semibold text-cyan-400 mb-2">
                          Sources
                        </p>

                        <ul className="space-y-2">
                          {msg.sources.map((src: any, idx: number) => {
                            const file =
                              src.source?.split("/").pop()?.split("\\").pop() ||
                              "Unknown";

                            const page = src.page ?? "N/A";

                            return (
                              <li key={idx}>
                                <a
                                  href={`${process.env.NEXT_PUBLIC_API_URL}/docs/${file}#page=${page}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block hover:text-cyan-300 underline"
                                >
                                  [{idx + 1}] {file} — Page {page}
                                </a>

                                {src.snippet && (
                                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                    {src.snippet}...
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div
                  className={`text-xs text-gray-500 mt-1 ${
                    isUser ? "text-right" : "text-left"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-cyan-400 transition resize-none"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something intelligent..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-semibold transition"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
