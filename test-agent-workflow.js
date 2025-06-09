#!/usr/bin/env node

// Test script to validate the complete AI agent workflow
// This tests the agent's ability to plan and execute API calls using v2 endpoints

import { ChatAgent } from "./src/components/chat-agent.js"
import { extractApiPlan, executeApiCall } from "./src/agent-api.js"

console.log("🤖 Testing AI Agent Workflow with v2 Endpoints")
console.log("================================================\n")

// Test 1: Verify API call extraction still works
console.log("Test 1: API Call Extraction")
console.log("---------------------------")

const testResponses = [
  // Test with code block format
  {
    name: "Code block format",
    response: `I'll help you get the user data. Let me make an API call:

\`\`\`
GET /users
\`\`\`

This will retrieve all users from the system.`,
  },

  // Test with inline format
  {
    name: "Inline format",
    response: "To get user information, I need to call GET /users to retrieve the user list.",
  },

  // Test with v2 endpoint
  {
    name: "V2 endpoint format",
    response: "Let me fetch the users: `GET /api/v2/users`",
  },
]

testResponses.forEach((test, index) => {
  console.log(`${index + 1}. Testing ${test.name}:`)
  const extracted = extractApiPlan(test.response)
  console.log(`   Input: "${test.response.substring(0, 50)}..."`)
  console.log(`   Extracted: ${extracted || "No API call found"}`)
  console.log("")
})

// Test 2: Test actual API endpoint execution
console.log("Test 2: API Endpoint Execution")
console.log("------------------------------")

async function testApiEndpoint(endpoint, description) {
  try {
    console.log(`Testing ${description}: ${endpoint}`)
    const result = await executeApiCall(endpoint)

    if (result && result.data) {
      console.log(`✅ SUCCESS: ${description}`)
      console.log(`   Status: ${result.status || "Unknown"}`)
      console.log(`   Data type: ${Array.isArray(result.data) ? "Array" : typeof result.data}`)
      if (Array.isArray(result.data)) {
        console.log(`   Items count: ${result.data.length}`)
        if (result.data.length > 0) {
          console.log(`   Sample item keys: ${Object.keys(result.data[0]).join(", ")}`)
        }
      }
    } else {
      console.log(`❌ FAILED: ${description} - No data returned`)
      console.log(`   Result:`, result)
    }
  } catch (error) {
    console.log(`❌ ERROR: ${description}`)
    console.log(`   Error: ${error.message}`)
  }
  console.log("")
}

// Test different endpoint formats
await testApiEndpoint("GET /users", "Relative path (should use base URL + v2)")
await testApiEndpoint("GET /api/v2/users", "Full v2 path")

// Test 3: End-to-end workflow simulation
console.log("Test 3: End-to-End Workflow Simulation")
console.log("--------------------------------------")

// Simulate a user asking for user data
const mockLlmResponse = `I'll help you retrieve the user information. Let me fetch the users from the API:

\`\`\`
GET /users
\`\`\`

This will give you all the users in the system.`

console.log("1. Simulating LLM response about getting users...")
console.log(`   LLM Response: "${mockLlmResponse.substring(0, 100)}..."`)

console.log("2. Extracting API plan...")
const apiPlan = extractApiPlan(mockLlmResponse)
console.log(`   Extracted API call: ${apiPlan}`)

if (apiPlan) {
  console.log("3. Executing API call...")
  try {
    const result = await executeApiCall(apiPlan)
    if (result && result.data) {
      console.log("✅ End-to-end workflow SUCCESS!")
      console.log(`   Retrieved ${Array.isArray(result.data) ? result.data.length : "unknown"} user records`)
    } else {
      console.log("❌ End-to-end workflow FAILED - No data returned")
    }
  } catch (error) {
    console.log("❌ End-to-end workflow ERROR")
    console.log(`   Error: ${error.message}`)
  }
} else {
  console.log("❌ End-to-end workflow FAILED - Could not extract API plan")
}

console.log("\n🏁 Test Complete!")
console.log("================")
console.log("If all tests passed, the AI agent should be ready to use with v2 endpoints.")
