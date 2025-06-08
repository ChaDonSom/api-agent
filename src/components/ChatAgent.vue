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

  return `You are an AI agent that can plan and execute API calls to a mock backend.\n\nAvailable tools (API endpoints):\n${toolsList}\n\nWhen you need to answer a user, you may plan a sequence of API calls, specifying endpoints, parameters, and order.\n\nIMPORTANT: When you want to make an API call, always output the call in a code block, e.g.:\n\`\`\`\nGET /users\n\`\`\`\nIf you need to include query parameters, include them in the URL.\nAfter the code block, explain your reasoning and then wait for the API result before continuing.`
}

// Try to extract a plan from the agent's response (robust: look for code blocks or lines)
function extractApiPlan(text: string): ApiCallPlan | null {
  // Look for code block with API call
  const codeBlockMatch = text.match(/```[\s\S]*?(GET|POST|PUT|DELETE)\s+(\/\S+)[\s\S]*?```/i)
  if (codeBlockMatch) {
    const method = codeBlockMatch[1].toUpperCase() as ApiCallPlan["method"]
    let endpoint = codeBlockMatch[2]
    let params: Record<string, any> | undefined
    if (endpoint.includes("?")) {
      const [path, query] = endpoint.split("?")
      endpoint = path
      params = Object.fromEntries(new URLSearchParams(query))
    }
    return { endpoint, method, params }
  }
  // Fallback: look for single line
  const match = text.match(/(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
  if (match) {
    const method = match[1].toUpperCase() as ApiCallPlan["method"]
    let endpoint = match[2]
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

  const systemPrompt = getSystemPrompt()
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.value.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: chatMessages,
      }),
    })
    const data = await res.json()
    let aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not respond."

    // Try to extract and execute an API plan
    const plan = extractApiPlan(aiMsg)
    let apiResult: any = null
    if (plan) {
      // Only show the user a message about the plan, not the result yet
      messages.value.push({ role: "assistant", content: aiMsg })
      // Execute the API call
      apiResult = await executeApiPlan(plan)
      // Now, ask the agent to summarize/answer using the API result
      const summaryPrompt = `You just made this API call: ${plan?.method} ${plan?.endpoint} and got this result: ${JSON.stringify(apiResult)}.\n\nBased on the user's original question: "${userMsg}", provide a clear, concise answer using the API result. Do not just paste the result, but explain or summarize as needed. Only output your answer to the user, not your internal reasoning or the API call details.`
      const summaryRes = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: summaryPrompt }],
        }),
      })
      const summaryData = await summaryRes.json()
      const summary = summaryData.choices?.[0]?.message?.content
      if (summary) {
        messages.value.push({ role: "assistant", content: summary })
        speak(summary)
      }
    } else {
      // No API plan, just respond as usual
      messages.value.push({ role: "assistant", content: aiMsg })
      speak(aiMsg)
    }
  } catch (e) {
    messages.value.push({ role: "assistant", content: "Error contacting OpenAI." })
  } finally {
    isLoading.value = false
  }
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
