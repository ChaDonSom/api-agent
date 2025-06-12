/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      animation: {
        spin: "spin 1s linear infinite",
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      // Add a custom 'light' variant that works similarly to dark mode
      addVariant("light", ":is(.light &)")
    },
  ],
}
