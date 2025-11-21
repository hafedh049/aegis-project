import type { AlertContext, ChatMessage } from "@/types" // Assuming these types are defined in a separate file
const OLLAMA_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:12345"

export async function POST(req: Request) {
  try {
    const { messages, alertContext } = (await req.json()) as {
      messages: Array<{ role: string; content: string }>
      alertContext: AlertContext
    }

    if (!alertContext) {
      return new Response(JSON.stringify({ error: "Missing alert context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const alertContextStr = JSON.stringify(alertContext, null, 2)
    const systemMessage = `You are a senior cybersecurity analyst. Use the alert context below to answer the user's question professionally in Markdown.

Rules:
- Always base responses on the provided alert.
- Be concise, technical, and actionable.
- Use Markdown: headings, bold, lists, code blocks.
- Never mention the XML-like tags.

<ALERT_CONTEXT>
${alertContextStr}
</ALERT_CONTEXT>`

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    const payload = {
      model: "phi4-mini",
      messages: fullMessages,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 512,
      },
    }

    const ollama_resp = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 45000,
    })

    if (!ollama_resp.ok) {
      throw new Error(`Ollama API error: ${ollama_resp.statusText}`)
    }

    const responseData = (await ollama_resp.json()) as { message?: { content?: string } }
    const aiResponse = responseData.message?.content?.trim() || "No response from AI"

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        let index = 0
        const interval = setInterval(() => {
          if (index < aiResponse.length) {
            controller.enqueue(encoder.encode(aiResponse[index]))
            index++
          } else {
            clearInterval(interval)
            controller.close()
          }
        }, 10)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorResponse = `# ❌ Error\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\nCheck your request format and ensure Ollama is running at http://127.0.0.1:5005`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(errorResponse))
        controller.close()
      },
    })

    return new Response(stream, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }
}
