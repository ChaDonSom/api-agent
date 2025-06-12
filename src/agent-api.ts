// Utility for the agent to execute API plans and return results
// This will be used to let the agent actually call the mock API endpoints
import { API_BASE_URL, API_KEY } from "./api-config"

export type ApiCallPlan = {
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  params?: Record<string, any>
  body?: Record<string, any>
}

export type ApiExecutionResult = {
  success: boolean
  data?: any
  error?: string
  httpStatus?: number
  httpStatusText?: string
  executionTime?: number
  requestUrl?: string
  networkError?: boolean
  planExecuted?: ApiCallPlan
}

export async function executeApiPlan(plan: ApiCallPlan): Promise<ApiExecutionResult> {
  const startTime = Date.now()
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
    const executionTime = Date.now() - startTime
    const contentType = res.headers.get("content-type")

    // Check for HTTP error status codes
    if (!res.ok) {
      let errorData: any = null
      try {
        if (contentType && contentType.includes("application/json")) {
          errorData = await res.json()
        } else {
          errorData = await res.text()
        }
      } catch (parseError) {
        errorData = `Failed to parse error response: ${parseError}`
      }

      return {
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
        httpStatus: res.status,
        httpStatusText: res.statusText,
        data: errorData,
        executionTime,
        requestUrl: url,
        networkError: false,
        planExecuted: plan,
      }
    }

    // Successfully got response, parse it
    let responseData: any
    try {
      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json()
      } else {
        responseData = await res.text()
      }
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse response: ${parseError}`,
        httpStatus: res.status,
        httpStatusText: res.statusText,
        executionTime,
        requestUrl: url,
        networkError: false,
        planExecuted: plan,
      }
    }

    return {
      success: true,
      data: responseData,
      httpStatus: res.status,
      httpStatusText: res.statusText,
      executionTime,
      requestUrl: url,
      networkError: false,
      planExecuted: plan,
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      httpStatus: 0,
      executionTime,
      requestUrl: url,
      networkError: true,
      planExecuted: plan,
    }
  }
}
