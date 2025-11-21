"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"

interface Alert {
  id: string
  timestamp: string
  alert_name: string
  alert_description: string
  source_ip: string
  should_block: boolean
  block_reason: string
  is_attack: boolean
  confidence: number
  attack_type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
  logs: string[] // assuming logs are text lines; use `any` if they can vary
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  alert: Alert
}

export default function ChatPanel({ alert }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!hasInitialized && alert) {
      setHasInitialized(true)
      setMessages([])
      const initialMessage: Message = {
        id: "0",
        role: "assistant",
        content: `I'm analyzing the alert: **${alert.alert_name}**\n\n**Severity:** ${alert.severity.toUpperCase()}\n\n**Description:** ${alert.alert_description}\n\nI'm here to help you understand and respond to this security alert. Feel free to ask me questions about the threat, recommended actions, or any other concerns.`,
        timestamp: new Date(),
      }
      setMessages([initialMessage])
    }
  }, [alert, hasInitialized])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          alert: {
            id: alert.id,
            timestamp: alert.timestamp,
            alert_name:alert.alert_name,
            alert_description: alert.alert_description,
            source_ip: alert.source_ip,
            should_block: alert.should_block,
            block_reason: alert.block_reason,
            is_attack: alert.is_attack,
            confidence: alert.confidence,
            attack_type: alert.attack_type,
            severity: alert.severity,
            recommendation: alert.recommendation,
            logs: alert.logs
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let assistantContent = ""

      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantContent += chunk

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg)),
        )
      }
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isLoading) {
      handleSendMessage(e as any)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setHasInitialized(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border/30 px-6 py-4 flex items-center justify-between bg-transparent">
        <div>
          <h2 className="font-semibold text-sm">{alert.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Severity: <span className="text-orange-400">{alert.severity.toUpperCase()}</span>
          </p>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-transparent">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} slide-in-animation`}
          >
            <div
              className={`max-w-sm lg:max-w-xl px-4 py-3 rounded-lg transition-smooth ${
                message.role === "user"
                  ? "bg-purple-500/20 border border-purple-400/30 text-primary-foreground"
                  : "bg-white/10 border border-white/20"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="text-sm prose prose-invert prose-sm break-words whitespace-pre-wrap">
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2 break-words" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1 break-words" {...props} />,
                      p: ({ node, ...props }) => <p className="text-sm mb-2 break-words" {...props} />,
                      ul: ({ node, ...props }) => <ul className="text-sm list-disc list-inside mb-2 break-words" {...props} />,
                      ol: ({ node, ...props }) => <ol className="text-sm list-decimal list-inside mb-2 break-words" {...props} />,
                      li: ({ node, ...props }) => <li className="text-sm mb-1 break-words" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold break-words" {...props} />,
                      em: ({ node, ...props }) => <em className="italic break-words" {...props} />,
                      code: ({ node, ...props }) => (
                        <code className="bg-[rgb(33,33,33)]/30 px-1 py-0.5 rounded text-xs break-words" {...props} />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
              <p className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start slide-in-animation">
            <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/20">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/30 p-4 bg-transparent">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask about this alert... (Ctrl+Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="bg-input border-border transition-smooth"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground transition-smooth disabled:opacity-50"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
