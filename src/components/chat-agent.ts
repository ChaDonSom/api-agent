// Logic extracted from ChatAgent.vue for agent planning, API plan extraction, and speech helpers.
import { apiTools } from "../agent-tools"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan } from "../agent-api"

export function getSystemPrompt() {
  return `You are an AI agent that can plan and execute API calls to a mock backend.\n\nAvailable tools (API endpoints):\n${apiTools
    .map((tool) => `- ${tool.name}: ${tool.description} (\`${tool.method} ${tool.endpoint}\`)`)
    .join(
      "\n"
    )}\n\nYou may use each turn to either:\n- Make an API call (by outputting the call in a code block, e.g. \`\`\`GET /users\`\`\`), or\n- Think and reason about the information you already have (by outputting your reasoning in plain text).\n\nBefore making an API call, always check if you already have the needed information in the chat history. If you do, use it directly and explain your reasoning. Only make an API call if you do not already have the answer or if the data is likely to have changed.\n\nAfter each turn, wait for the user or system to provide new information or results before continuing.\n\nIf you have enough information to answer the user's question, do so clearly and concisely.`
}

export function extractApiPlan(text: string): ApiCallPlan | null {
  const codeBlocks = text.match(/```[\s\S]*?```/g)
  if (codeBlocks) {
    for (const block of codeBlocks) {
      const lines = block
        .replace(/```/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of lines) {
        const match = line.match(/^(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
        if (match) {
          const method = match[1].toUpperCase() as ApiCallPlan["method"]
          let endpoint = match[2].replace(/[`\s]+$/g, "")
          let params: Record<string, any> | undefined
          if (endpoint.includes("?")) {
            const [path, query] = endpoint.split("?")
            endpoint = path
            params = Object.fromEntries(new URLSearchParams(query))
          }
          return { endpoint, method, params }
        }
      }
    }
  }
  const match = text.match(/(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
  if (match) {
    const method = match[1].toUpperCase() as ApiCallPlan["method"]
    let endpoint = match[2].replace(/[`\s]+$/g, "")
    let params: Record<string, any> | undefined
    if (endpoint.includes("?")) {
      const [path, query] = endpoint.split("?")
      endpoint = path
      params = Object.fromEntries(new URLSearchParams(query))
    }
    return { endpoint, method, params }
  }
  return null
}

export function useSpeechHelpers(OPENAI_API_KEY: string) {
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null
  const synth = window.speechSynthesis

  function startListening(inputRef: { value: string }, sendMessage: () => void) {
    if (!recognition) return
    recognition.lang = "en-US"
    recognition.start()
    recognition.onresult = (event: any) => {
      inputRef.value = event.results[0][0].transcript
    }
    recognition.onend = () => {
      if (inputRef.value.trim()) sendMessage()
    }
  }

  async function speak(text: string) {
    try {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy",
        }),
      })
      if (!ttsRes.ok) throw new Error("OpenAI TTS failed")
      const audioBlob = await ttsRes.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      await audio.play()
      return
    } catch (e) {
      if (!synth) return
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = "en-US"
      synth.speak(utter)
    }
  }

  return { startListening, speak }
}
