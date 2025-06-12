import { ref } from "vue"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan, ApiExecutionResult } from "../agent-api"
import apiSummary from "../../api-summary-condensed.txt?raw"

// Enhanced memory system for API learning
interface ApiCallPattern {
  endpoint: string
  method: string
  successfulParams?: Record<string, any>
  successfulBody?: Record<string, any>
  commonErrors: Array<{
    error: string
    solution: string
    frequency: number
  }>
  successCount: number
  lastUpdated: number
}

interface ApiMemory {
  patterns: Record<string, ApiCallPattern>
  globalLearnings: Array<{
    insight: string
    examples: string[]
    confidence: number
  }>
  version: number
}

interface ErrorStrategy {
  type: "validation" | "authentication" | "not_found" | "network" | "server"
  adaptations: string[]
  maxRetries: number
  progressiveSimplification: boolean
}

interface ValidationResult {
  isValid: boolean
  suggestions: string[]
  confidence: number
  similarSuccessfulCalls: ApiCallPattern[]
}

class ApiMemoryManager {
  private memory: ApiMemory
  private storageKey = "api-agent-memory"

  constructor() {
    this.memory = this.loadMemory()
  }

  private loadMemory(): ApiMemory {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.warn("Failed to load API memory:", e)
    }

    return {
      patterns: {},
      globalLearnings: [],
      version: 1,
    }
  }

  private saveMemory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory))
    } catch (e) {
      console.warn("Failed to save API memory:", e)
    }
  }

  recordSuccess(plan: ApiCallPlan, _result: ApiExecutionResult): void {
    const key = `${plan.method}:${plan.endpoint}`

    if (!this.memory.patterns[key]) {
      this.memory.patterns[key] = {
        endpoint: plan.endpoint,
        method: plan.method,
        commonErrors: [],
        successCount: 0,
        lastUpdated: Date.now(),
      }
    }

    const pattern = this.memory.patterns[key]
    pattern.successfulParams = plan.params
    pattern.successfulBody = plan.body
    pattern.successCount++
    pattern.lastUpdated = Date.now()

    this.saveMemory()
  }

  recordFailure(plan: ApiCallPlan, result: ApiExecutionResult, attempted_solution?: string): void {
    const key = `${plan.method}:${plan.endpoint}`

    if (!this.memory.patterns[key]) {
      this.memory.patterns[key] = {
        endpoint: plan.endpoint,
        method: plan.method,
        commonErrors: [],
        successCount: 0,
        lastUpdated: Date.now(),
      }
    }

    const pattern = this.memory.patterns[key]
    const error = result.error || `HTTP ${result.httpStatus}`

    // Find existing error or create new one
    let errorEntry = pattern.commonErrors.find((e) => e.error === error)
    if (!errorEntry) {
      errorEntry = { error, solution: "", frequency: 0 }
      pattern.commonErrors.push(errorEntry)
    }

    errorEntry.frequency++
    if (attempted_solution) {
      errorEntry.solution = attempted_solution
    }

    pattern.lastUpdated = Date.now()
    this.saveMemory()
  }

  getRelevantPatterns(plan: ApiCallPlan): ApiCallPattern[] {
    const exactMatch = this.memory.patterns[`${plan.method}:${plan.endpoint}`]
    const endpointMatches = Object.values(this.memory.patterns)
      .filter(
        (p) => p.endpoint.includes(plan.endpoint.split("/")[2]) || plan.endpoint.includes(p.endpoint.split("/")[2])
      )
      .sort((a, b) => b.successCount - a.successCount)

    return exactMatch ? [exactMatch, ...endpointMatches] : endpointMatches
  }

  getMemoryInsights(): string {
    const patterns = Object.values(this.memory.patterns)
    const totalCalls = patterns.reduce((sum, p) => sum + p.successCount, 0)
    const topErrors = patterns
      .flatMap((p) => p.commonErrors)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)

    let insights = `\n**API MEMORY INSIGHTS** (${totalCalls} successful calls learned):\n`

    if (topErrors.length > 0) {
      insights += "\nMost common errors and solutions:\n"
      topErrors.forEach((error, i) => {
        insights += `${i + 1}. "${error.error}" (${error.frequency}x) - ${
          error.solution || "No solution learned yet"
        }\n`
      })
    }

    const successfulPatterns = patterns
      .filter((p) => p.successCount > 0)
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 3)

    if (successfulPatterns.length > 0) {
      insights += "\nMost reliable API patterns:\n"
      successfulPatterns.forEach((pattern, i) => {
        insights += `${i + 1}. ${pattern.method} ${pattern.endpoint} (${pattern.successCount} successes)\n`
        if (pattern.successfulParams) {
          insights += `   Last successful params: ${JSON.stringify(pattern.successfulParams)}\n`
        }
        if (pattern.successfulBody) {
          insights += `   Last successful body: ${JSON.stringify(pattern.successfulBody)}\n`
        }
      })
    }

    return insights
  }

  validateApiCall(plan: ApiCallPlan): ValidationResult {
    const relevantPatterns = this.getRelevantPatterns(plan)
    const suggestions: string[] = []
    let confidence = 0.5 // Base confidence

    if (relevantPatterns.length > 0) {
      const mostSuccessful = relevantPatterns[0]
      confidence = Math.min(0.9, 0.5 + mostSuccessful.successCount * 0.1)

      // Check for common errors
      const commonErrors = mostSuccessful.commonErrors
        .filter((e) => e.frequency > 1)
        .sort((a, b) => b.frequency - a.frequency)

      if (commonErrors.length > 0) {
        suggestions.push(`Common issues with this endpoint: ${commonErrors.map((e) => e.error).join(", ")}`)
        commonErrors.forEach((error) => {
          if (error.solution) {
            suggestions.push(`For "${error.error}": ${error.solution}`)
          }
        })
      }

      // Suggest successful patterns
      if (mostSuccessful.successfulParams && !plan.params) {
        suggestions.push(`Consider adding params like: ${JSON.stringify(mostSuccessful.successfulParams)}`)
      }
      if (mostSuccessful.successfulBody && !plan.body) {
        suggestions.push(`Consider body format like: ${JSON.stringify(mostSuccessful.successfulBody)}`)
      }
    }

    return {
      isValid: confidence > 0.6,
      suggestions,
      confidence,
      similarSuccessfulCalls: relevantPatterns.slice(0, 3),
    }
  }

  addGlobalLearning(insight: string, examples: string[] = []): void {
    this.memory.globalLearnings.push({
      insight,
      examples,
      confidence: 1.0,
    })
    this.saveMemory()
  }

  getGlobalLearnings(): string {
    if (this.memory.globalLearnings.length === 0) return ""

    return (
      "\n**LEARNED INSIGHTS**:\n" +
      this.memory.globalLearnings
        .sort((a, b) => b.confidence - a.confidence)
        .map((learning, i) => `${i + 1}. ${learning.insight}`)
        .join("\n")
    )
  }
}

// Enhanced error analysis
function analyzeError(result: ApiExecutionResult): ErrorStrategy {
  const status = result.httpStatus
  const error = result.error?.toLowerCase() || ""

  if (status === 422 || status === 400) {
    return {
      type: "validation",
      adaptations: [
        "Check required fields in request body",
        "Verify data types match API schema",
        "Simplify request by removing optional fields",
        "Check field naming conventions (snake_case vs camelCase)",
      ],
      maxRetries: 4,
      progressiveSimplification: true,
    }
  }

  if (status === 404) {
    return {
      type: "not_found",
      adaptations: [
        "Verify endpoint path is correct",
        "Check if resource ID exists",
        "Try alternative endpoints",
        "Use search endpoints instead of direct access",
      ],
      maxRetries: 3,
      progressiveSimplification: false,
    }
  }

  if (status === 401 || status === 403) {
    return {
      type: "authentication",
      adaptations: ["Check authentication headers", "Verify user permissions", "Try with different user context"],
      maxRetries: 2,
      progressiveSimplification: false,
    }
  }

  if (result.networkError || error.includes("network") || error.includes("connection")) {
    return {
      type: "network",
      adaptations: ["Retry with exponential backoff", "Check network connectivity"],
      maxRetries: 3,
      progressiveSimplification: false,
    }
  }

  return {
    type: "server",
    adaptations: ["Retry after brief delay", "Try simpler request format", "Check server status"],
    maxRetries: 2,
    progressiveSimplification: true,
  }
}

export function getEnhancedSystemPrompt(memoryInsights: string): string {
  return `You are an AI agent that can execute API calls. When you need to make an API call, you MUST output it in this EXACT format:

\`\`\`
GET /api/v2/users
\`\`\`

or with a body:

\`\`\`
POST /api/v2/users
Body: {"name": "John", "email": "john@example.com"}
\`\`\`

**CRITICAL: If you say you will make an API call, you MUST immediately output the format above. Do not just say "I will make an API call" - actually output the code block.**

${memoryInsights}

Available API endpoints:
${apiSummary}

**API CALL RULES:**
1. ALWAYS use the exact format: \`\`\`METHOD /api/endpoint\`\`\` 
2. For POST/PUT/PATCH with data, add: Body: {json}
3. For GET with query params, use: GET /api/endpoint?param=value
4. DO NOT just say you will make a call - OUTPUT the actual call format

**EXAMPLES OF CORRECT API CALLS:**

Simple GET:
\`\`\`
GET /api/v2/users
\`\`\`

GET with parameters:
\`\`\`
GET /api/v2/users?include=crews&with_count=entries
\`\`\`

POST with body:
\`\`\`
POST /api/v2/users
Body: {"name": "John Doe", "email": "john@example.com"}
\`\`\`

Search with filters:
\`\`\`
POST /api/v2/users/search
Body: {"filters": [{"field": "name", "operator": "like", "value": "John"}], "includes": [{"relation": "crews"}]}
\`\`\`

**IMPORTANT:** Never say "I will make an API call" without immediately providing the code block format. If you mention making an API call, the very next thing must be the \`\`\` code block.`
}

// Enhanced API call extraction with better validation
export function extractApiPlanEnhanced(
  text: string,
  memoryManager: ApiMemoryManager
): { plan: ApiCallPlan | null; validation: ValidationResult | null } {
  const codeBlocks = text.match(/```[\s\S]*?```/g)

  if (codeBlocks) {
    for (const block of codeBlocks) {
      const content = block.replace(/```/g, "").trim()
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length > 0) {
        const firstLine = lines[0]
        const match = firstLine.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\/\S+)/i)
        if (match) {
          const method = match[1].toUpperCase() as ApiCallPlan["method"]
          let endpoint = match[2].replace(/[`\s]+$/g, "")
          let params: Record<string, any> | undefined
          let body: Record<string, any> | undefined

          // Handle query parameters for GET requests
          if (endpoint.includes("?")) {
            const [path, query] = endpoint.split("?")
            endpoint = path
            params = Object.fromEntries(new URLSearchParams(query))
          }

          // Handle request body (look for "Body:" line)
          const bodyLineIndex = lines.findIndex((line) => line.toLowerCase().startsWith("body:"))
          if (bodyLineIndex !== -1) {
            const bodyContent = lines.slice(bodyLineIndex).join("\n")
            const bodyJson = bodyContent.replace(/^body:\s*/i, "").trim()
            try {
              body = JSON.parse(bodyJson)
            } catch (e) {
              console.warn("Failed to parse request body:", bodyJson)
            }
          }

          const plan = { endpoint, method, params, body }
          const validation = memoryManager.validateApiCall(plan)

          return { plan, validation }
        }
      }
    }
  }

  return { plan: null, validation: null }
}

export function useEnhancedChatAgent(OPENAI_API_KEY: string) {
  const messages = ref<ChatMessage[]>([])
  const input = ref("")
  const isLoading = ref(false)
  const memoryManager = new ApiMemoryManager()

  async function sendMessage() {
    if (!input.value.trim()) return
    const userMsg = input.value.trim()
    messages.value.push({ role: "user", content: userMsg })
    input.value = ""
    isLoading.value = true

    let continueLoop = true
    let maxTurns = 8 // Increased from 5
    let turn = 0
    let errorStrategies = new Map<string, { count: number; strategy: ErrorStrategy }>()

    // Get memory insights for system prompt
    const memoryInsights = memoryManager.getMemoryInsights() + memoryManager.getGlobalLearnings()

    let loopMessages = [
      { role: "system", content: getEnhancedSystemPrompt(memoryInsights) },
      ...messages.value.map((m) => ({ role: m.role, content: m.content })),
    ]

    let lastApiResult: ApiExecutionResult | null = null
    let lastPlan: ApiCallPlan | null = null

    while (continueLoop && turn < maxTurns) {
      turn++

      // Add previous API result context
      if (lastApiResult && lastPlan) {
        const strategyKey = `${lastPlan.method}:${lastPlan.endpoint}`
        const strategy = errorStrategies.get(strategyKey)

        let resultMessage = ""
        if (lastApiResult.success) {
          // Record success in memory
          memoryManager.recordSuccess(lastPlan, lastApiResult)

          resultMessage = `✅ API call SUCCEEDED: ${lastPlan.method} ${lastPlan.endpoint} (${
            lastApiResult.executionTime
          }ms)\nData: ${JSON.stringify(lastApiResult.data)}`

          // Reset error strategy for this endpoint
          errorStrategies.delete(strategyKey)
        } else {
          // Analyze error and get strategy
          const errorStrategy = analyzeError(lastApiResult)
          const currentStrategy = strategy || { count: 0, strategy: errorStrategy }
          currentStrategy.count++
          errorStrategies.set(strategyKey, currentStrategy)

          // Record failure in memory
          const attemptedSolution =
            currentStrategy.strategy.adaptations[
              Math.min(currentStrategy.count - 1, currentStrategy.strategy.adaptations.length - 1)
            ]
          memoryManager.recordFailure(lastPlan, lastApiResult, attemptedSolution)

          resultMessage = `❌ API call FAILED: ${lastPlan.method} ${lastPlan.endpoint}\nError: ${lastApiResult.error}\nHTTP: ${lastApiResult.httpStatus}`

          if (lastApiResult.data) {
            resultMessage += `\nResponse: ${JSON.stringify(lastApiResult.data)}`
          }

          // Add intelligent error guidance
          if (currentStrategy.count <= currentStrategy.strategy.maxRetries) {
            const adaptation =
              currentStrategy.strategy.adaptations[
                Math.min(currentStrategy.count - 1, currentStrategy.strategy.adaptations.length - 1)
              ]
            resultMessage += `\n\n🔧 SUGGESTED FIX (attempt ${currentStrategy.count}/${currentStrategy.strategy.maxRetries}): ${adaptation}`

            // Check memory for similar error solutions
            const relevantPatterns = memoryManager.getRelevantPatterns(lastPlan)
            const similarErrors = relevantPatterns
              .flatMap((p) => p.commonErrors)
              .filter((e) => lastApiResult && e.error.toLowerCase().includes(lastApiResult.error?.toLowerCase() || ""))
              .filter((e) => e.solution)

            if (similarErrors.length > 0) {
              resultMessage += `\n💡 LEARNED SOLUTION: ${similarErrors[0].solution}`
            }
          } else {
            resultMessage += `\n⚠️  Max retries exceeded for this error type. Consider a different approach.`
          }
        }

        loopMessages.push({ role: "system", content: resultMessage })
        lastApiResult = null
        lastPlan = null
      }

      // Get AI response
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo", // Upgraded model
          messages: loopMessages,
          temperature: 0.1, // Lower temperature for more consistent API calls
        }),
      })

      const data = await res.json()
      let aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not respond."

      // Enhanced API plan extraction with validation
      const { plan, validation } = extractApiPlanEnhanced(aiMsg, memoryManager)

      if (plan) {
        // Pre-execution validation
        if (validation && !validation.isValid && validation.suggestions.length > 0) {
          loopMessages.push({ role: "assistant", content: aiMsg })
          loopMessages.push({
            role: "system",
            content: `⚠️ API CALL VALIDATION WARNINGS (confidence: ${Math.round(
              validation.confidence * 100
            )}%):\n${validation.suggestions.join("\n")}\n\nProceed with caution or revise the API call.`,
          })
          continue
        }

        // Execute API call
        const currentApiResult = await executeApiPlan(plan)

        // Create enhanced message with validation info
        const messageWithApiCall: ChatMessage = {
          role: "assistant",
          content: aiMsg
            .replace(/```[\s\S]*?```/g, "")
            .replace(/\n+/g, " ")
            .trim(),
          apiCall: {
            plan,
            result: currentApiResult,
            timestamp: Date.now(),
          },
        }

        messages.value.push(messageWithApiCall)
        lastApiResult = currentApiResult
        lastPlan = plan
        loopMessages.push({ role: "assistant", content: aiMsg })
        continue
      }

      // Check for API call intentions without proper format
      const mentionsApiCall =
        /\b(GET|POST|PUT|DELETE|PATCH)\s+\/api/i.test(aiMsg) ||
        /I['\s]*ll\s+(make|call|fetch|get|post|update|delete)/i.test(aiMsg) ||
        /I\s+will\s+(fetch|retrieve|get|call)/i.test(aiMsg) ||
        /let\s+me\s+(fetch|get|call)/i.test(aiMsg)

      if (mentionsApiCall && !plan) {
        loopMessages.push({ role: "assistant", content: aiMsg })
        loopMessages.push({
          role: "system",
          content: `🚨 CRITICAL ERROR: You mentioned making an API call but did NOT provide the required code block format.

You MUST output the API call in this EXACT format:

\`\`\`
GET /api/v2/users
\`\`\`

or with body:

\`\`\`
POST /api/v2/users
Body: {"name": "John"}
\`\`\`

DO NOT just say "I will make an API call" - you must OUTPUT the actual code block immediately.

Try again with the correct format.`,
        })
        continue
      }

      loopMessages.push({ role: "assistant", content: aiMsg })

      // Enhanced confidence evaluation
      const confidencePrompt = `Evaluate your progress on answering: "${userMsg}"

Consider:
1. Do you have sufficient information to answer completely?
2. Are there failed API calls that should be retried with learned patterns?
3. Have you used all available memory insights effectively?

Current turn: ${turn}/${maxTurns}
Available memory insights: ${memoryInsights ? "Yes" : "No"}

Respond CONFIDENT if ready to answer, or NOT CONFIDENT if you should continue trying.`

      const confidenceRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [...loopMessages, { role: "system", content: confidencePrompt }],
        }),
      })

      const confidenceData = await confidenceRes.json()
      const confidenceMsg = confidenceData.choices?.[0]?.message?.content || "NOT CONFIDENT"

      if (!/NOT CONFIDENT/i.test(confidenceMsg)) {
        // Generate final answer
        const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [
              ...loopMessages,
              {
                role: "system",
                content: `Provide a clear, comprehensive answer to: "${userMsg}" using all information gathered. Include any relevant insights learned during this session.`,
              },
            ],
          }),
        })

        const summaryData = await summaryRes.json()
        const summary = summaryData.choices?.[0]?.message?.content
        if (summary) {
          messages.value.push({ role: "assistant", content: summary })
        }
        continueLoop = false
      }
    }

    if (continueLoop) {
      messages.value.push({
        role: "assistant",
        content: `I've reached the maximum number of attempts (${maxTurns}) but can continue to learn from this interaction. The information gathered has been saved to memory for future sessions.`,
      })
    }

    isLoading.value = false
  }

  return {
    messages,
    input,
    isLoading,
    sendMessage,
    memoryManager,
  }
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  apiCall?: {
    plan: ApiCallPlan
    result: ApiExecutionResult
    timestamp: number
  }
}
