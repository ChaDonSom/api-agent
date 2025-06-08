<script setup lang="ts">
import { ref } from "vue"
import { apiTools } from "../agent-tools"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan } from "../agent-api"

// Message type for chat history
interface Message {
  role: "user" | "assistant"
  content: string
}

const messages = ref<Message[]>([])
const input = ref("")
const isLoading = ref(false)

// Placeholder: Replace with your OpenAI API key or use a proxy endpoint
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Use 'any' for SpeechRecognitionClass and recognition to avoid TS errors
const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
const recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null
const synth = window.speechSynthesis

function startListening() {
  if (!recognition) return
  recognition.lang = "en-US"
  recognition.start()
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript
    input.value = transcript
  }
  recognition.onend = () => {
    // Auto-submit when user stops speaking and input is not empty
    if (input.value.trim()) {
      sendMessage()
    }
  }
}

function speak(text: string) {
  if (!synth) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = "en-US"
  synth.speak(utter)
}

// Add a system prompt to inform the agent about available tools
function getSystemPrompt() {
  const toolsList = apiTools
    .map((tool) => `- ${tool.name}: ${tool.description} (\`${tool.method} ${tool.endpoint}\`)`)
    .join("\n")

  return `You are an AI agent that can plan and execute API calls to a mock backend.\n\nAvailable tools (API endpoints):\n${toolsList}\n\nYou may use each turn to either:\n- Make an API call (by outputting the call in a code block, e.g. \`\`\`GET /users\`\`\`), or\n- Think and reason about the information you already have (by outputting your reasoning in plain text).\n\nBefore making an API call, always check if you already have the needed information in the chat history. If you do, use it directly and explain your reasoning. Only make an API call if you do not already have the answer or if the data is likely to have changed.\n\nAfter each turn, wait for the user or system to provide new information or results before continuing.\n\nIf you have enough information to answer the user's question, do so clearly and concisely.`
}

// Try to extract a plan from the agent's response (robust: look for code blocks or lines)
function extractApiPlan(text: string): ApiCallPlan | null {
  // Look for all code blocks and extract the first valid API call
  const codeBlocks = text.match(/```[\s\S]*?```/g)
  if (codeBlocks) {
    for (const block of codeBlocks) {
      // Remove backticks and whitespace
      const lines = block.replace(/```/g, '').split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        const match = line.match(/^(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
        if (match) {
          const method = match[1].toUpperCase() as ApiCallPlan["method"]
          let endpoint = match[2].replace(/[`\s]+$/g, '') // Remove trailing backticks/whitespace
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
  // Fallback: look for single line
  const match = text.match(/(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
  if (match) {
    const method = match[1].toUpperCase() as ApiCallPlan["method"]
    let endpoint = match[2].replace(/[`\s]+$/g, '')
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
  let maxTurns = 5 // prevent infinite loops
  let turn = 0
  let lastConfidenceMsg = null

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
    const res = await fetch(OPENAI_API_URL, {
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
    // Only show API call plans and final answers to the user
    const plan = extractApiPlan(aiMsg)
    if (plan) {
      messages.value.push({ role: "assistant", content: aiMsg })
      lastApiResult = await executeApiPlan(plan)
      lastPlan = plan
      loopMessages.push({ role: "assistant", content: aiMsg })
      continue
    }
    // Don't show intermediate reasoning steps to the user
    loopMessages.push({ role: "assistant", content: aiMsg })
    // Ask the agent directly if it has done all it can to answer the user's question
    const confidencePrompt = `Based on the chat so far, have you done all you reasonably can to answer the user's question, given the available data and tools? Reply with CONFIDENT if you have done all you can, or NOT CONFIDENT if you believe there is still something you can try. Explain briefly.`
    const confidenceRes = await fetch(OPENAI_API_URL, {
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
    lastConfidenceMsg = confidenceMsg
    if (!/NOT CONFIDENT/i.test(confidenceMsg)) {
      // Agent is confident, so ask for a final summary/answer
      const summaryPrompt = `You have completed your reasoning and are confident in your answer. Please provide a clear, concise final answer to the user's original question: "${userMsg}" using all information and results from the chat so far. Only output your answer to the user, not your internal reasoning or API call details.`
      const summaryRes = await fetch(OPENAI_API_URL, {
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
        speak(summary)
      }
      continueLoop = false
    } else {
      // Internal: do not show NOT CONFIDENT messages or intermediate reasoning to the user
      loopMessages.push({ role: "assistant", content: confidenceMsg })
    }
  }
  // If we exit the loop without confidence, ask the agent to explain why a complete answer is not possible
  if (continueLoop) {
    const explainPrompt = `You have reached the maximum number of reasoning turns and are still NOT CONFIDENT. Please explain to the user, in clear and concise language, why a complete answer is not possible, using all information and results from the chat so far. Be transparent about any limitations (such as the data being from a mock API, or missing information). Only output your explanation to the user.`
    const explainRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          ...loopMessages,
          { role: "system", content: explainPrompt },
        ],
      }),
    })
    const explainData = await explainRes.json()
    const explanation = explainData.choices?.[0]?.message?.content
    if (explanation) {
      messages.value.push({ role: "assistant", content: explanation })
      speak(explanation)
    }
  }
  isLoading.value = false
}
</script>

<template>
  <div class="flex flex-col h-screen max-w-xl mx-auto p-4">
    <div class="flex-1 overflow-y-auto space-y-4 mb-4">
      <div v-for="(msg, i) in messages" :key="i" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
        <div
          :class="msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'"
          class="inline-block rounded-lg px-4 py-2 max-w-[80%]"
        >
          {{ msg.content }}
        </div>
      </div>
      <div v-if="isLoading" class="text-center text-gray-400">Thinking...</div>
    </div>
    <form class="flex gap-2" @submit.prevent="sendMessage">
      <button type="button" @click="startListening" class="bg-green-500 text-white px-3 py-2 rounded">🎤</button>
      <input
        v-model="input"
        class="flex-1 border rounded px-3 py-2"
        placeholder="Type your message or use the mic..."
      />
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded" :disabled="isLoading">Send</button>
    </form>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  display: none;
}
</style>
