import { ref, watch, onMounted, computed } from "vue"

type ThemeMode = "light" | "dark" | "system"

export function useDarkMode() {
  const mode = ref<ThemeMode>("system")

  // Check if user has a preference stored
  const getStoredPreference = (): ThemeMode => {
    const stored = localStorage.getItem("themeMode")
    return (stored as ThemeMode) || "system"
  }

  // Check system preference
  const getSystemPreference = (): boolean => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }

  // Computed property to determine if dark mode should be active
  const isDark = computed(() => {
    if (mode.value === "system") {
      return getSystemPreference()
    }
    return mode.value === "dark"
  })

  // Initialize theme mode
  const initializeTheme = () => {
    mode.value = getStoredPreference()
    updateDOM()
  } // Update DOM classes
  const updateDOM = () => {
    const shouldBeDark = isDark.value
    const htmlElement = document.documentElement

    if (shouldBeDark) {
      htmlElement.classList.add("dark")
      htmlElement.classList.remove("light")
    } else {
      htmlElement.classList.add("light")
      htmlElement.classList.remove("dark")
    }

    // Debug: Log the current classes
    console.log(`Mode: ${mode.value}, HTML classes: ${htmlElement.className}`)
  }

  // Toggle through the three modes: light → dark → system
  const toggle = () => {
    if (mode.value === "light") {
      mode.value = "dark"
    } else if (mode.value === "dark") {
      mode.value = "system"
    } else {
      mode.value = "light"
    }

    // Force immediate DOM update
    updateDOM()
  }

  // Set specific mode
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
  }

  // Watch for mode changes and update localStorage and DOM
  watch(
    mode,
    (newMode) => {
      localStorage.setItem("themeMode", newMode)
      updateDOM()
    },
    { immediate: false }
  )

  // Watch for changes in computed isDark and update DOM
  watch(
    isDark,
    () => {
      updateDOM()
    },
    { immediate: false }
  )

  // Listen for system theme changes
  onMounted(() => {
    initializeTheme()

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      // Only update DOM if we're in system mode
      if (mode.value === "system") {
        updateDOM()
      }
    }

    mediaQuery.addEventListener("change", handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  })

  return {
    mode,
    isDark,
    toggle,
    setMode,
  }
}
