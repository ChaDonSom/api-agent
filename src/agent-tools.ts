// This file defines the available API endpoints (tools) for the agent
// and their expected parameters and response shapes.

export type ApiTool = {
  name: string
  description: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  params?: Record<string, string>
  example?: string
}

export const apiTools: ApiTool[] = [
  {
    name: "List Users",
    description: "Get a list of all users",
    endpoint: "/users",
    method: "GET",
    example: "GET /users",
  },
  {
    name: "List Jobs",
    description: "Get a list of all jobs",
    endpoint: "/jobs",
    method: "GET",
    example: "GET /jobs",
  },
  {
    name: "List Tasks",
    description: "Get a list of all tasks, optionally filtered by job_id",
    endpoint: "/tasks",
    method: "GET",
    params: { job_id: "number (optional)" },
    example: "GET /tasks?job_id=1",
  },
  {
    name: "List Time Entries",
    description: "Get a list of all time entries, optionally filtered by user_id, job_id, or task_id",
    endpoint: "/time-entries",
    method: "GET",
    params: { user_id: "number (optional)", job_id: "number (optional)", task_id: "number (optional)" },
    example: "GET /time-entries?user_id=1",
  },
  // Add more as needed for POST/PUT/DELETE
]
