// Final comprehensive test of the complete agent workflow
import fetch from "node-fetch"

// Copy the extractApiPlan function from chat-agent.ts
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

// Copy the executeApiPlan function from agent-api.ts
async function executeApiPlan(plan) {
  const API_BASE_URL = "https://blacklabsconsole.com"
  const API_KEY = "18156|ApLx3il93F9YHQvh8I7lsX55FLrZVoTQASLveIUxb6ca3c01"

  let url = `${API_BASE_URL}${plan.endpoint}`
  let headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  }
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

// Test the complete workflow
async function testCompleteWorkflow() {
  console.log("🧪 Testing Complete Agent Workflow")
  console.log("==================================================")

  // Test 1: Extraction with different LLM response formats
  const testResponses = [
    "I'll fetch the users for you:\n```\nGET /api/users\n```",
    "Let me get the jobs:\n```http\nGET /api/v2/jobs\n```",
    "I need to check crews: GET /api/crews",
    "```\nGET /api/v2/customers?limit=5\n```",
  ]

  console.log("\n📝 Testing API Call Extraction...")
  testResponses.forEach((response, index) => {
    const plan = extractApiPlan(response)
    console.log(`Test ${index + 1}: ${plan ? "✅" : "❌"}`)
    console.log(`  Input: ${response.replace(/\n/g, "\\n")}`)
    console.log(`  Extracted: ${JSON.stringify(plan)}`)
  })

  // Test 2: Actual API execution with working endpoints
  console.log("\n🚀 Testing API Execution...")
  const testPlans = [
    { endpoint: "/api/users", method: "GET" },
    { endpoint: "/api/v2/users", method: "GET" },
    { endpoint: "/api/crews", method: "GET" },
    { endpoint: "/api/v2/jobs", method: "GET" },
  ]

  for (const [index, plan] of testPlans.entries()) {
    console.log(`\nAPI Test ${index + 1}: ${plan.method} ${plan.endpoint}`)
    try {
      const result = await executeApiPlan(plan)
      console.log(`  ✅ Success: ${JSON.stringify(result).substring(0, 100)}...`)
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`)
    }
  }

  // Test 3: End-to-end simulation
  console.log("\n🔄 Testing End-to-End Simulation...")
  const mockLLMResponse = "I'll get the list of users for you:\n```\nGET /api/v2/users\n```"
  console.log(`Mock LLM Response: ${mockLLMResponse}`)

  const extractedPlan = extractApiPlan(mockLLMResponse)
  console.log(`Extracted Plan: ${JSON.stringify(extractedPlan)}`)

  if (extractedPlan) {
    try {
      const apiResult = await executeApiPlan(extractedPlan)
      console.log(`✅ End-to-end test successful!`)
      console.log(`API Result: ${JSON.stringify(apiResult).substring(0, 200)}...`)
    } catch (error) {
      console.log(`❌ End-to-end test failed: ${error.message}`)
    }
  }

  console.log("\n🎉 Testing Complete!")
}

testCompleteWorkflow()
