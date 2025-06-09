// Test script to demonstrate the enhanced AI agent capabilities
// This shows examples of the advanced API features now available

const testQueries = [
  // Basic operations
  "Show me all users with their crew assignments",

  // Search and filtering
  "Find all active jobs created this month",

  // Aggregations
  "What are the total hours logged by each user this week?",

  // Complex relationships
  "Show me jobs with their customers and total task count",

  // Batch operations
  "Create 3 new tasks for job ID 5",

  // Advanced search with multiple filters
  "Find equipment that was used more than 40 hours and needs maintenance",

  // Soft deletes and restore
  "Show me all deleted users and restore user with ID 3",

  // Aggregation queries
  "Which customers have the highest total job value?",

  // Time-based filtering
  "Show me time entries from last week with more than 8 hours per day",

  // Complex join queries
  "Find crews with the most equipment assignments and their total usage hours",
]

// Example API calls that the agent can now make:
const apiExamples = {
  // Advanced search
  searchExample: {
    method: "POST",
    endpoint: "/api/v2/jobs/search",
    body: {
      filters: [
        { field: "status", operator: "=", value: "active" },
        { field: "created_at", operator: ">=", value: "2025-06-01" },
      ],
      includes: ["customer", "tasks"],
      aggregates: [
        { field: "entries.hours", function: "sum" },
        { field: "tasks", function: "count" },
      ],
      sort: [{ field: "created_at", direction: "desc" }],
    },
  },

  // Relationship loading
  relationshipExample: {
    method: "GET",
    endpoint: "/api/v2/users",
    params: {
      include: "crews,entries",
      with_count: "entries",
      with_sum: "entries.hours",
    },
  },

  // Batch operations
  batchCreateExample: {
    method: "POST",
    endpoint: "/api/v2/tasks/batch",
    body: {
      resources: [
        { name: "Task 1", job_id: 5, description: "First task" },
        { name: "Task 2", job_id: 5, description: "Second task" },
        { name: "Task 3", job_id: 5, description: "Third task" },
      ],
    },
  },

  // Batch update
  batchUpdateExample: {
    method: "PATCH",
    endpoint: "/api/v2/users/batch",
    body: {
      resources: {
        1: { status: "active" },
        2: { status: "inactive" },
        3: { email: "newemail@example.com" },
      },
    },
  },

  // Restore operation
  restoreExample: {
    method: "POST",
    endpoint: "/api/v2/users/3/restore",
  },

  // Complex aggregation
  aggregationExample: {
    method: "POST",
    endpoint: "/api/v2/entries/search",
    body: {
      filters: [{ field: "date", operator: "between", value: ["2025-06-01", "2025-06-07"] }],
      includes: ["user", "job"],
      aggregates: [
        { field: "hours", function: "sum" },
        { field: "hours", function: "avg" },
        { field: "id", function: "count" },
      ],
      sort: [{ field: "date", direction: "desc" }],
    },
  },
}

console.log("Enhanced AI Agent Test Queries:")
console.log("================================")
testQueries.forEach((query, index) => {
  console.log(`${index + 1}. ${query}`)
})

console.log("\nAPI Examples the agent can now execute:")
console.log("======================================")
Object.entries(apiExamples).forEach(([name, example]) => {
  console.log(`\n${name}:`)
  console.log(`${example.method} ${example.endpoint}`)
  if (example.params) {
    console.log(`Params: ${JSON.stringify(example.params, null, 2)}`)
  }
  if (example.body) {
    console.log(`Body: ${JSON.stringify(example.body, null, 2)}`)
  }
})
