// Test the simple API call extraction directly

import { extractSimpleApiPlan } from "./src/components/simple-chat-agent.ts"

// Test cases
const testCases = [
  {
    name: "Simple GET request",
    input: "I will fetch the users.\n\n```\nGET /api/v2/users\n```",
    expected: { method: "GET", endpoint: "/api/v2/users" },
  },
  {
    name: "POST with body",
    input: 'Let me create a user:\n\n```\nPOST /api/v2/users\nBody: {"name": "John"}\n```',
    expected: { method: "POST", endpoint: "/api/v2/users", body: { name: "John" } },
  },
  {
    name: "AI response saying it will call but no code block",
    input:
      "I will now fetch the list of users from the system and determine which user has the longest name. I'll execute the API call to retrieve this information.",
    expected: null,
  },
  {
    name: "Mixed response with code block",
    input: "I will fetch the users now.\n\n```\nGET /api/v2/users\n```\n\nThis will get all users.",
    expected: { method: "GET", endpoint: "/api/v2/users" },
  },
]

console.log("🧪 Testing API call extraction...")

testCases.forEach((testCase, i) => {
  console.log(`\n${i + 1}. ${testCase.name}`)
  console.log("Input:", testCase.input)

  const result = extractSimpleApiPlan(testCase.input)
  console.log("Result:", result)
  console.log("Expected:", testCase.expected)

  if (JSON.stringify(result) === JSON.stringify(testCase.expected)) {
    console.log("✅ PASS")
  } else {
    console.log("❌ FAIL")
  }
})
