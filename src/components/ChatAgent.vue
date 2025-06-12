<script setup lang="ts">
import { ref } from "vue"
import { useEnhancedChatAgent } from "./enhanced-chat-agent"

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""
const { messages, input, isLoading, sendMessage, memoryManager } = useEnhancedChatAgent(OPENAI_API_KEY)

// Track which API call details are expanded
const expandedApiCalls = ref<Set<number>>(new Set())

function handleSubmit() {
  sendMessage()
}

function handleMic() {
  // Note: Speech functionality not yet implemented in enhanced version
  // Could be added back if needed
  console.log("Microphone functionality not yet implemented in enhanced version")
}

function toggleApiCall(messageIndex: number) {
  if (expandedApiCalls.value.has(messageIndex)) {
    expandedApiCalls.value.delete(messageIndex)
  } else {
    expandedApiCalls.value.add(messageIndex)
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function getStatusColor(result: any): string {
  if (result.success) return "text-green-600 dark:text-green-400"
  if (result.networkError) return "text-red-600 dark:text-red-400"
  if (result.httpStatus === 422 || result.httpStatus === 400) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

function getStatusIcon(result: any): string {
  if (result.success) return "✅"
  if (result.networkError) return "🔌"
  if (result.httpStatus === 422 || result.httpStatus === 400) return "⚠️"
  return "❌"
}

function showMemoryStats() {
  console.log("Memory insights:", memoryManager.getMemoryInsights())
  console.log("Global learnings:", memoryManager.getGlobalLearnings())
}
</script>

<template>
  <div class="flex flex-col h-screen max-w-5xl p-4 mx-auto">
    <!-- Memory Stats Button (for debugging) -->
    <div class="mb-2">
      <button
        @click="showMemoryStats"
        class="px-3 py-1 text-xs text-white transition-colors bg-purple-500 rounded-lg hover:bg-purple-600"
        title="Show memory stats in console"
      >
        🧠 Memory Stats
      </button>
    </div>
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

        <!-- API Call Details (collapsible) -->
        <div v-if="msg.apiCall && msg.role === 'assistant'" class="mt-2 max-w-[80%]">
          <button
            @click="toggleApiCall(i)"
            class="flex items-center gap-2 px-3 py-2 text-sm transition-colors bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-800 hover:bg-gray-150 dark:hover:bg-gray-750 dark:border-gray-600"
          >
            <span class="text-lg">🔧</span>
            <span class="font-medium">API Call</span>
            <span :class="getStatusColor(msg.apiCall.result)">{{ getStatusIcon(msg.apiCall.result) }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ msg.apiCall.plan.method }} {{ msg.apiCall.plan.endpoint }}
            </span>
            <span class="text-xs">{{ expandedApiCalls.has(i) ? "▼" : "▶" }}</span>
          </button>

          <div
            v-if="expandedApiCalls.has(i)"
            class="p-3 mt-2 text-sm border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="space-y-2">
              <!-- Request Details -->
              <div>
                <span class="font-semibold text-gray-700 dark:text-gray-300">Request:</span>
                <div class="p-2 mt-1 font-mono text-xs bg-gray-100 rounded dark:bg-gray-900">
                  {{ msg.apiCall.plan.method }} {{ msg.apiCall.plan.endpoint }}
                  <div v-if="msg.apiCall.plan.params" class="mt-1 text-gray-600 dark:text-gray-400">
                    Params: {{ JSON.stringify(msg.apiCall.plan.params, null, 2) }}
                  </div>
                  <div v-if="msg.apiCall.plan.body" class="mt-1 text-gray-600 dark:text-gray-400">
                    Body: {{ JSON.stringify(msg.apiCall.plan.body, null, 2) }}
                  </div>
                </div>
              </div>

              <!-- Response Details -->
              <div>
                <span class="font-semibold text-gray-700 dark:text-gray-300">Response:</span>
                <div class="mt-1">
                  <div class="flex items-center gap-2 text-xs">
                    <span :class="getStatusColor(msg.apiCall.result)">
                      {{ msg.apiCall.result.success ? "Success" : "Failed" }}
                    </span>
                    <span class="text-gray-500 dark:text-gray-400">•</span>
                    <span class="text-gray-600 dark:text-gray-400">
                      HTTP {{ msg.apiCall.result.httpStatus || "N/A" }}
                    </span>
                    <span class="text-gray-500 dark:text-gray-400">•</span>
                    <span class="text-gray-600 dark:text-gray-400">
                      {{ formatDuration(msg.apiCall.result.executionTime || 0) }}
                    </span>
                  </div>

                  <div v-if="msg.apiCall.result.error" class="mt-1 text-xs text-red-600 dark:text-red-400">
                    Error: {{ msg.apiCall.result.error }}
                  </div>

                  <div
                    v-if="msg.apiCall.result.data"
                    class="p-2 mt-2 overflow-y-auto font-mono text-xs bg-gray-100 rounded dark:bg-gray-900 max-h-32"
                  >
                    {{ JSON.stringify(msg.apiCall.result.data, null, 2) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
