// Utility for the agent to execute API plans and return results
// This will be used to let the agent actually call the mock API endpoints
import { API_BASE_URL, API_KEY } from "./api-config"

export type ApiCallPlan = {
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  params?: Record<string, any>
}

export async function executeApiPlan(plan: ApiCallPlan): Promise<any> {
  let url = `${API_BASE_URL}${plan.endpoint}`
  let headers: Record<string, string> = { Authorization: `Bearer ${API_KEY}` }
  let options: RequestInit = { method: plan.method, headers }

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
