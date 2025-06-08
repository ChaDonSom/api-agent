<script setup lang="ts">
// --- ENV CONSTANTS & CONFIG ---
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

import { ref } from "vue"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan } from "../agent-api"
import { getSystemPrompt, extractApiPlan, useSpeechHelpers } from "./chat-agent"

// --- PRIMITIVES (refs, state, types) ---
interface Message {
  role: "user" | "assistant"
  content: string
}
const messages = ref<Message[]>([])
const input = ref("")
const isLoading = ref(false)

// --- SPEECH/VOICE HELPERS ---
const { startListening, speak } = useSpeechHelpers(OPENAI_API_KEY)

// --- MAIN CHAT/AGENT LOOP (submit is last, fetch/render logic above) ---
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
    if (!/NOT CONFIDENT/i.test(confidenceMsg)) {
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
      loopMessages.push({ role: "assistant", content: confidenceMsg })
    }
  }
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
        messages: [...loopMessages, { role: "system", content: explainPrompt }],
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
      <button
        type="button"
        @click="() => startListening({ value: input }, sendMessage)"
        class="bg-green-500 text-white px-3 py-2 rounded"
      >
        🎤
      </button>
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
