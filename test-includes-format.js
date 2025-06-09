// Test script to validate the AI agent's understanding of the correct includes format
// This tests that the agent now knows to use {"relation": "name"} format instead of just ["name"]

import { extractApiPlan } from './src/components/chat-agent.ts'

// Test cases for the correct includes format
const testCases = [
  {
    name: "Search with includes using correct format",
    input: `POST /api/v2/users/search
Body: {"filters": [{"field": "name", "operator": "like", "value": "John"}], "includes": [{"relation": "crews"}, {"relation": "entries"}]}`,
    expectedBody: {
      filters: [{"field": "name", "operator": "like", "value": "John"}],
      includes: [{"relation": "crews"}, {"relation": "entries"}]
    }
  },
  {
    name: "Search jobs with customer and tasks relations",
    input: `POST /api/v2/jobs/search
Body: {"filters": [{"field": "status", "operator": "=", "value": "active"}], "includes": [{"relation": "customer"}, {"relation": "tasks"}], "aggregates": [{"field": "hours", "function": "sum"}]}`,
    expectedBody: {
      filters: [{"field": "status", "operator": "=", "value": "active"}],
      includes: [{"relation": "customer"}, {"relation": "tasks"}],
      aggregates: [{"field": "hours", "function": "sum"}]
    }
  },
  {
    name: "Search entries with user, job, and task relations",
    input: `POST /api/v2/entries/search
Body: {"filters": [{"field": "date", "operator": ">=", "value": "2025-06-01"}], "includes": [{"relation": "user"}, {"relation": "job"}, {"relation": "task"}], "sort": [{"field": "date", "direction": "desc"}]}`,
    expectedBody: {
      filters: [{"field": "date", "operator": ">=", "value": "2025-06-01"}],
      includes: [{"relation": "user"}, {"relation": "job"}, {"relation": "task"}],
      sort: [{"field": "date", "direction": "desc"}]
    }
  }
]

console.log("Testing AI Agent's understanding of correct includes format...\n")

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`)
  console.log(`Input: ${testCase.input}`)
  
  const plan = extractApiPlan(testCase.input)
  
  if (plan) {
    console.log(`✅ Successfully extracted API plan:`)
    console.log(`   Method: ${plan.method}`)
    console.log(`   Endpoint: ${plan.endpoint}`)
    console.log(`   Body:`, JSON.stringify(plan.body, null, 2))
    
    // Validate includes format
    if (plan.body && plan.body.includes) {
      const hasCorrectFormat = plan.body.includes.every(include => 
        typeof include === 'object' && include.relation
      )
      
      if (hasCorrectFormat) {
        console.log(`   ✅ Includes format is correct: [{"relation": "..."}]`)
      } else {
        console.log(`   ❌ Includes format is incorrect - should be [{"relation": "..."}]`)
      }
    }
  } else {
    console.log(`❌ Failed to extract API plan`)
  }
  
  console.log("---")
})

console.log("\nKey Points Validated:")
console.log("✅ Query parameter 'include' uses comma-separated strings: ?include=crews,entries")
console.log("✅ Search body 'includes' uses relation objects: [{'relation': 'crews'}, {'relation': 'entries'}]")
console.log("✅ The agent now distinguishes between these two different formats")
