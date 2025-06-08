// Utility for the agent to execute API plans and return results
// This will be used to let the agent actually call the mock API endpoints

export type ApiCallPlan = {
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  params?: Record<string, any>
}

export async function executeApiPlan(plan: ApiCallPlan): Promise<any> {
  let url = `http://localhost:8000${plan.endpoint}`
  let options: RequestInit = { method: plan.method }

  if (plan.method === "GET" && plan.params) {
    const query = new URLSearchParams(plan.params).toString()
    if (query) url += `?${query}`
  } else if (plan.method !== "GET" && plan.params) {
    options.body = JSON.stringify(plan.params)
    options.headers = { "Content-Type": "application/json" }
  }

  const res = await fetch(url, options)
  return res.json()
}
