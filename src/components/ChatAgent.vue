<script setup lang="ts">
import { useChatAgent } from "./chat-agent"

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""
const { messages, input, isLoading, speechMode, handleSubmit, handleMic } = useChatAgent(OPENAI_API_KEY)
</script>

<template>
  <div class="flex flex-col h-screen max-w-5xl p-4">
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
    <form class="flex gap-2" @submit.prevent="handleSubmit">
      <button type="button" @click="handleMic" class="bg-green-500 text-white px-3 py-2 rounded">🎤</button>
      <input
        v-model="input"
        class="flex-1 border rounded px-3 py-2 flex-grow flex-1"
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
