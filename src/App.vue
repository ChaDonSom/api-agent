<script setup lang="ts">
import ChatAgent from "./components/ChatAgent.vue"
import DarkModeToggle from "./components/DarkModeToggle.vue"
</script>

<template>
  <div
    class="min-h-screen text-gray-900 transition-colors duration-200 bg-gray-50 light:bg-white dark:bg-gray-900 light:text-gray-900 dark:text-gray-100"
  >
    <DarkModeToggle />
    <ChatAgent />
  </div>
</template>

<style>
/* Simple styles without @apply - the main CSS file handles the dark mode */
body {
  margin: 0;
  padding: 0;
}
</style>
