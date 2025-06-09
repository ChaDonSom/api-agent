// Test script to verify API call extraction and execution

// Copy the extractApiPlan function directly for testing
function extractApiPlan(text) {
  const codeBlocks = text.match(/```[\s\S]*?```/g)
  if (codeBlocks) {
    for (const block of codeBlocks) {
      const lines = block
        .replace(/```/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of lines) {
        const match = line.match(/^(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
        if (match) {
          const method = match[1].toUpperCase()
          let endpoint = match[2].replace(/[`\s]+$/g, "")
          let params
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
  const match = text.match(/(GET|POST|PUT|DELETE)\s+(\/\S+)/i)
  if (match) {
    const method = match[1].toUpperCase()
    let endpoint = match[2].replace(/[`\s]+$/g, "")
    let params
    if (endpoint.includes("?")) {
      const [path, query] = endpoint.split("?")
      endpoint = path
      params = Object.fromEntries(new URLSearchParams(query))
    }
    return { endpoint, method, params }
  }
  return null
}

// Test cases for extractApiPlan
const testCases = [
  // Standard code block format
  "I'll fetch the users for you:\n```\nGET /api/v1/users\n```",

  // Code block with language specification
  "Let me get the users:\n```http\nGET /api/v1/users\n```",

  // Multiple lines in code block
  "```\nGET /api/v1/users\nThis should get all users\n```",

  // Inline format without code blocks
  "I'll use GET /api/v1/users to fetch the data",

  // With query parameters
  "```\nGET /api/v1/users?page=1&limit=10\n```",

  // POST with data mentioned
  "```\nPOST /api/v1/users\n```",

  // Mixed content
  "First, let me check the users. ```GET /api/v1/users``` This will show us all users.",
]

console.log("Testing API call extraction...\n")

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`)
  console.log(`Input: ${testCase}`)
  const plan = extractApiPlan(testCase)
  console.log(`Extracted plan:`, plan)
  console.log("---")
})

// Test actual API call execution function
async function executeApiPlan(plan) {
  const API_BASE_URL = "https://blacklabsconsole.com/api"
  const API_KEY = "18156|ApLx3il93F9YHQvh8I7lsX55FLrZVoTQASLveIUxb6ca3c01"

  let url = `${API_BASE_URL}${plan.endpoint}`
  let headers = { Authorization: `Bearer ${API_KEY}` }
  let options = { method: plan.method, headers }

  if (plan.method === "GET" && plan.params) {
    const query = new URLSearchParams(plan.params).toString()
    if (query) url += `?${query}`
  } else if (plan.method !== "GET" && plan.params) {
    options.body = JSON.stringify(plan.params)
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, options)
  return res.json()
}

// Test actual API call (if extraction works)
async function runApiTest() {
  console.log("\nTesting actual API execution...")
  const testPlan = { endpoint: "/api/v1/users", method: "GET" }
  console.log("Testing plan:", testPlan)

  try {
    const result = await executeApiPlan(testPlan)
    console.log("API call successful:", result)
  } catch (error) {
    console.log("API call failed:", error.message)
  }
}

// Run the API test
runApiTest()
