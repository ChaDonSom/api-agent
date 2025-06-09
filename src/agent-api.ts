// Utility for the agent to execute API plans and return results
// This will be used to let the agent actually call the mock API endpoints
import { API_BASE_URL, API_KEY } from "./api-config"

export type ApiCallPlan = {
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  params?: Record<string, any>
  body?: Record<string, any>
}

export async function executeApiPlan(plan: ApiCallPlan): Promise<any> {
  let url = `${API_BASE_URL}${plan.endpoint}`
  let headers: Record<string, string> = { Authorization: `Bearer ${API_KEY}` }
  let options: RequestInit = { method: plan.method, headers }

  // Handle query parameters for GET requests
  if (plan.method === "GET" && plan.params) {
    const query = new URLSearchParams()
    Object.entries(plan.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value))
      }
    })
    if (query.toString()) url += `?${query.toString()}`
  }
  // Handle request body for POST/PUT/PATCH/DELETE requests
  else if (plan.method !== "GET") {
    if (plan.body) {
      options.body = JSON.stringify(plan.body)
      headers["Content-Type"] = "application/json"
    } else if (plan.params) {
      options.body = JSON.stringify(plan.params)
      headers["Content-Type"] = "application/json"
    }
  }

  try {
    const res = await fetch(url, options)
    const contentType = res.headers.get("content-type")

    if (contentType && contentType.includes("application/json")) {
      return await res.json()
    } else {
      const text = await res.text()
      return { status: res.status, statusText: res.statusText, body: text }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), status: 0 }
  }
}
