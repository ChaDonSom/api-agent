<script setup lang="ts">
import { useChatAgent } from "./chat-agent"

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""
const { messages, input, isLoading, handleSubmit, handleMic } = useChatAgent(OPENAI_API_KEY)
</script>

<template>
  <div class="flex flex-col h-screen max-w-5xl p-4 mx-auto">
    <div class="flex-1 pr-2 mb-4 space-y-4 overflow-y-auto">
      <div v-for="(msg, i) in messages" :key="i" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
        <div
          :class="
            msg.role === 'user'
              ? 'bg-blue-500 dark:bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          "
          class="inline-block rounded-lg px-4 py-2 max-w-[80%] shadow-sm"
        >
          {{ msg.content }}
        </div>
      </div>
      <div v-if="isLoading" class="text-center text-gray-400 dark:text-gray-500">
        <div class="inline-flex items-center">
          <svg
            class="w-5 h-5 mr-3 -ml-1 text-gray-400 animate-spin dark:text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Thinking...
        </div>
      </div>
    </div>
    <form class="flex gap-2 mt-auto" @submit.prevent="handleSubmit">
      <button
        type="button"
        @click="handleMic"
        class="px-3 py-2 text-white transition-colors duration-200 bg-green-500 rounded-lg dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading"
        title="Use microphone"
      >
        🎤
      </button>
      <input
        v-model="input"
        class="flex-1 px-3 py-2 text-gray-900 placeholder-gray-500 transition-colors duration-200 bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
        placeholder="Type your message or use the mic..."
        :disabled="isLoading"
      />
      <button
        type="submit"
        class="px-4 py-2 text-white transition-colors duration-200 bg-blue-600 rounded-lg dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading || !input.trim()"
      >
        {{ isLoading ? "Sending..." : "Send" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
/* Custom scrollbar for light mode */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Custom scrollbar for dark mode */
.dark ::-webkit-scrollbar-thumb {
  background: #4a5568;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #2d3748;
}

/* Firefox scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 transparent;
}

.dark * {
  scrollbar-color: #4a5568 transparent;
}
</style>
