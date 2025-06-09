import { ref } from "vue"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan } from "../agent-api"
import apiSummary from "../../api-summary-condensed.txt?raw"

export function getSystemPrompt() {
  return `You are an AI agent that can plan and execute API calls to a real backend.

Available tools (API endpoints):
${apiSummary}

**IMPORTANT: To make an API call, you MUST output the exact format:**
\`\`\`
GET /api/endpoint
\`\`\`
or without backticks:
GET /api/endpoint

Examples of CORRECT formats:
- \`\`\`GET /api/users\`\`\`
- \`\`\`GET /api/v2/jobs\`\`\`
- GET /api/crews
- \`\`\`POST /api/v2/customers\`\`\`

You may use each turn to either:
1. Make an API call (by outputting the call in the exact format above)
2. Think and reason about information you already have

Before making an API call, check if you already have the needed information in the chat history. If you do, use it directly. Only make an API call if you need new or updated data.

After each turn, wait for the user or system to provide new information before continuing.

If you have enough information to answer the user's question, do so clearly and concisely.`
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
          voice: "onyx",
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

export function useChatAgent(OPENAI_API_KEY: string) {
  const messages = ref<{ role: "user" | "assistant"; content: string }[]>([])
  const input = ref("")
  const isLoading = ref(false)
  const speechMode = ref(false)
  const { startListening, speak } = useSpeechHelpers(OPENAI_API_KEY)

  function handleSubmit() {
    speechMode.value = false
    sendMessage()
  }
  function handleMic() {
    speechMode.value = true
    startListening(input, sendMessage)
  }

  async function sendMessage() {
    if (!input.value.trim()) return
    const userMsg = input.value.trim()
    messages.value.push({ role: "user", content: userMsg })
    input.value = ""
    isLoading.value = true

    let continueLoop = true
    let loopMessages = [
      { role: "system", content: getSystemPrompt() },
      ...messages.value.map((m) => ({ role: m.role, content: m.content })),
    ]
    let lastApiResult: any = null
    let lastPlan: ApiCallPlan | null = null
    let maxTurns = 5
    let turn = 0

    while (continueLoop && turn < maxTurns) {
      turn++
      if (lastApiResult && lastPlan) {
        loopMessages.push({
          role: "system",
          content: `API call result for ${lastPlan.method} ${lastPlan.endpoint}: ${JSON.stringify(lastApiResult)}`,
        })
        lastApiResult = null
        lastPlan = null
      }
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: loopMessages,
        }),
      })
      const data = await res.json()
      let aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not respond."
      const plan = extractApiPlan(aiMsg)
      if (plan) {
        messages.value.push({ role: "assistant", content: aiMsg })
        lastApiResult = await executeApiPlan(plan)
        lastPlan = plan
        loopMessages.push({ role: "assistant", content: aiMsg })
        continue
      }
      loopMessages.push({ role: "assistant", content: aiMsg })
      const confidencePrompt = `Based on the chat so far, have you done all you reasonably can to answer the user's question, given the available data and tools? Reply with CONFIDENT if you have done all you can, or NOT CONFIDENT if you believe there is still something you can try. Explain briefly.`
      const confidenceRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            ...loopMessages,
            { role: "assistant", content: aiMsg },
            { role: "system", content: confidencePrompt },
          ],
        }),
      })
      const confidenceData = await confidenceRes.json()
      const confidenceMsg = confidenceData.choices?.[0]?.message?.content || "NOT CONFIDENT"
      if (!/NOT CONFIDENT/i.test(confidenceMsg)) {
        const summaryPrompt = `You have completed your reasoning and are confident in your answer. Please provide a clear, concise final answer to the user's original question: "${userMsg}" using all information and results from the chat so far. Only output your answer to the user, not your internal reasoning or API call details.`
        const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              ...loopMessages,
              { role: "assistant", content: aiMsg },
              { role: "system", content: summaryPrompt },
            ],
          }),
        })
        const summaryData = await summaryRes.json()
        const summary = summaryData.choices?.[0]?.message?.content
        if (summary) {
          messages.value.push({ role: "assistant", content: summary })
          if (speechMode.value) speak(summary)
        }
        continueLoop = false
      } else {
        loopMessages.push({ role: "assistant", content: confidenceMsg })
      }
    }
    if (continueLoop) {
      const explainPrompt = `You have reached the maximum number of reasoning turns and are still NOT CONFIDENT. Please explain to the user, in clear and concise language, why a complete answer is not possible, using all information and results from the chat so far. Be transparent about any limitations (such as the data being from a mock API, or missing information). Only output your explanation to the user.`
      const explainRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [...loopMessages, { role: "system", content: explainPrompt }],
        }),
      })
      const explainData = await explainRes.json()
      const explanation = explainData.choices?.[0]?.message?.content
      if (explanation) {
        messages.value.push({ role: "assistant", content: explanation })
        if (speechMode.value) speak(explanation)
      }
    }
    isLoading.value = false
  }

  return {
    messages,
    input,
    isLoading,
    speechMode,
    handleSubmit,
    handleMic,
    sendMessage,
  }
}
