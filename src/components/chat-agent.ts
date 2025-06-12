import { ref } from "vue"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan, ApiExecutionResult } from "../agent-api"
import apiSummary from "../../api-summary-condensed.txt?raw"

export function getSystemPrompt() {
  return `You are an AI agent that can plan and execute API calls to a real backend. You have enhanced self-awareness capabilities to detect and handle API failures.

Available tools (API endpoints):
${apiSummary}

**ADVANCED API FEATURES AVAILABLE:**

**Search & Filtering:**
- Use POST /api/v2/{resource}/search for advanced queries
- Search body format: {"filters": [{"field": "name", "operator": "like", "value": "John"}], "sort": [{"field": "created_at", "direction": "desc"}], "search": {"value": "search term", "fields": ["name", "email"]}}
- **IMPORTANT**: For includes in search requests, use: "includes": [{"relation": "entries"}, {"relation": "user"}]
- Available operators: =, !=, >, <, >=, <=, like, in, not_in, between, is_null, is_not_null

**Query Parameters:**
- include: Load relationships in GET requests (e.g., ?include=user,job,tasks) - comma-separated string
- with_count: Count related records (e.g., ?with_count=tasks,entries)
- with_sum: Sum numeric fields (e.g., ?with_sum=entries.hours)
- with_avg: Average numeric fields (e.g., ?with_avg=entries.hours)
- with_min/with_max: Min/max values
- with_trashed: Include soft-deleted records (?with_trashed=true)
- only_trashed: Only soft-deleted records (?only_trashed=true)

**CRITICAL: Two Different Includes Formats**
- GET requests: Use query parameter ?include=rel1,rel2,rel3 (comma-separated string)
- POST search requests: Use body "includes": [{"relation": "rel1"}, {"relation": "rel2"}] (array of objects)

**Batch Operations:**
- POST /api/v2/{resource}/batch: Create multiple records
- PATCH /api/v2/{resource}/batch: Update multiple records  
- DELETE /api/v2/{resource}/batch: Delete multiple records
- Body format: {"resources": [array_for_create_or_delete] or {id: data} for updates}

**Restore Operations:**
- POST /api/v2/{resource}/{id}/restore: Restore soft-deleted record
- POST /api/v2/{resource}/batch/restore: Restore multiple records

**IMPORTANT: To make an API call, you MUST output the exact format:**
\`\`\`
METHOD /api/endpoint
Body: {json_data}
\`\`\`

Examples of CORRECT formats:
- \`\`\`GET /api/v2/users?include=crews&with_count=entries\`\`\`
- \`\`\`POST /api/v2/users/search
Body: {"filters": [{"field": "name", "operator": "like", "value": "John"}], "sort": [{"field": "created_at", "direction": "desc"}], "includes": [{"relation": "crews"}, {"relation": "entries"}]}\`\`\`
- \`\`\`POST /api/v2/users
Body: {"name": "John Doe", "email": "john@example.com"}\`\`\`
- \`\`\`PATCH /api/v2/users/batch  
Body: {"resources": {"1": {"name": "New Name"}, "2": {"email": "new@email.com"}}}\`\`\`

**ENHANCED FAILURE DETECTION & SELF-AWARENESS:**
You now have enhanced capabilities to detect and handle failures:

1. **API Call Tracking**: The system tracks whether you actually make API calls vs. just mention them
2. **Detailed Error Reporting**: You receive detailed information about API failures including:
   - HTTP status codes and error messages
   - Network vs API errors
   - Execution time and request details
   - Response data (if any)

3. **Self-Correction**: If you mention making an API call but don't provide the correct format, you'll be notified
4. **Failure Analysis**: When API calls fail, consider these strategies:
   - Check if the endpoint exists (try alternative endpoints)
   - Verify request format (body structure, query parameters)
   - Try simpler requests (fewer filters, no includes)
   - Use different HTTP methods if appropriate
   - Check authentication/authorization issues

**WHEN API CALLS FAIL:**
- Analyze the specific error (404 = endpoint not found, 401 = auth issue, 422/400 = validation error, etc.)
- Try alternative approaches (different endpoints, simpler requests)
- If you get HTTP 404, the endpoint might not exist - try related endpoints
- If you get HTTP 422/400, check your request format and required fields - these errors usually provide detailed validation messages
- If you get HTTP 401/403, there might be authentication/authorization issues
- For network errors, acknowledge the connection problem

**SPECIAL HANDLING FOR 422/400 VALIDATION ERRORS:**
When you receive a 422 or 400 error, you get extra retry attempts because these errors usually explain exactly what's wrong:
1. Read the error response data carefully - it often contains specific field validation messages
2. Check required fields, data types, and format requirements
3. Verify the request body structure matches the expected schema
4. Try with a simpler request if the complex one fails
5. You get up to 3 additional retry attempts for validation errors

**CONFIDENCE EVALUATION:**
Be honest about your progress:
- CONFIDENT: You have sufficient data to answer the user's question
- NOT CONFIDENT: You need to try more approaches, retry failed calls, or get more data

You may use each turn to either:
1. Make an API call (by outputting the call in the exact format above)
2. Think and reason about information you already have
3. Analyze and respond to API failures with alternative approaches

Before making an API call, check if you already have the needed information in the chat history. If you do, use it directly. Only make an API call if you need new or updated data.

When users ask for complex data analysis, use the search endpoints with appropriate filters, sorting, and aggregations to get exactly what they need.

After each turn, wait for the user or system to provide new information before continuing.

If you have enough information to answer the user's question, do so clearly and concisely.`
}

export function extractApiPlan(text: string): ApiCallPlan | null {
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

          return { endpoint, method, params, body }
        }
      }
    }
  }

  // Fallback to simple regex matching (without body support)
  const match = text.match(/(GET|POST|PUT|DELETE|PATCH)\s+(\/\S+)/i)
  if (match) {
    const method = match[1].toUpperCase() as ApiCallPlan["method"]
    let endpoint = match[2].replace(/[`\s]+$/g, "")
    let params: Record<string, any> | undefined
    if (endpoint.includes("?")) {
      const [path, query] = endpoint.split("?")
      endpoint = path
      params = Object.fromEntries(new URLSearchParams(query))
    }
    return { endpoint, method, params }
  }
  return null
}

export function useSpeechHelpers(OPENAI_API_KEY: string) {
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null
  const synth = window.speechSynthesis

  function startListening(inputRef: { value: string }, sendMessage: () => void) {
    if (!recognition) return
    recognition.lang = "en-US"
    recognition.start()
    recognition.onresult = (event: any) => {
      inputRef.value = event.results[0][0].transcript
    }
    recognition.onend = () => {
      if (inputRef.value.trim()) sendMessage()
    }
  }

  async function speak(text: string) {
    try {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "onyx",
        }),
      })
      if (!ttsRes.ok) throw new Error("OpenAI TTS failed")
      const audioBlob = await ttsRes.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      await audio.play()
      return
    } catch (e) {
      if (!synth) return
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = "en-US"
      synth.speak(utter)
    }
  }

  return { startListening, speak }
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

export function useChatAgent(OPENAI_API_KEY: string) {
  const messages = ref<ChatMessage[]>([])
  const input = ref("")
  const isLoading = ref(false)
  const speechMode = ref(false)
  const { startListening, speak } = useSpeechHelpers(OPENAI_API_KEY)

  function handleSubmit() {
    speechMode.value = false
    sendMessage()
  }
  function handleMic() {
    speechMode.value = true
    startListening(input, sendMessage)
  }

  async function sendMessage() {
    if (!input.value.trim()) return
    const userMsg = input.value.trim()
    messages.value.push({ role: "user", content: userMsg })
    input.value = ""
    isLoading.value = true

    let continueLoop = true
    let loopMessages = [
      { role: "system", content: getSystemPrompt() },
      ...messages.value.map((m) => ({ role: m.role, content: m.content })),
    ]
    let lastApiResult: ApiExecutionResult | null = null
    let lastPlan: ApiCallPlan | null = null
    let maxTurns = 5
    let turn = 0
    let retryCount422 = 0 // Track 422 retries specifically
    const maxRetries422 = 3 // Allow more retries for validation errors

    // Track what the agent intended vs what actually happened
    let intentionTracker = {
      intendedApiCall: false,
      actualApiCall: false,
      apiCallSuccess: false,
      apiCallErrors: [] as string[],
    }

    while (continueLoop && turn < maxTurns) {
      turn++

      // Reset intention tracker for this turn
      intentionTracker = {
        intendedApiCall: false,
        actualApiCall: false,
        apiCallSuccess: false,
        apiCallErrors: [],
      }

      // Add previous API result to context if we have one
      if (lastApiResult && lastPlan) {
        let resultMessage = ""
        if (lastApiResult.success) {
          resultMessage = `API call SUCCEEDED: ${lastPlan.method} ${lastPlan.endpoint} (${
            lastApiResult.executionTime
          }ms, HTTP ${lastApiResult.httpStatus})\nData: ${JSON.stringify(lastApiResult.data)}`
          retryCount422 = 0 // Reset retry count on success
        } else {
          const errorType = lastApiResult.networkError ? "NETWORK ERROR" : "API ERROR"
          const is422Error = lastApiResult.httpStatus === 422 || lastApiResult.httpStatus === 400

          resultMessage = `API call FAILED (${errorType}): ${lastPlan.method} ${lastPlan.endpoint} (${
            lastApiResult.executionTime
          }ms)\nError: ${lastApiResult.error}\nHTTP Status: ${lastApiResult.httpStatus || "N/A"}\nURL: ${
            lastApiResult.requestUrl
          }`

          if (lastApiResult.data) {
            resultMessage += `\nResponse Data: ${JSON.stringify(lastApiResult.data)}`
          }

          // Special handling for 422/400 errors - give more specific guidance
          if (is422Error) {
            retryCount422++
            if (retryCount422 <= maxRetries422) {
              resultMessage += `\n\nThis is a validation error (HTTP ${
                lastApiResult.httpStatus
              }). The response data usually explains what's wrong with the request format. You have ${
                maxRetries422 - retryCount422 + 1
              } more attempts to fix this. Please:
1. Carefully read the error message in the response data
2. Check the request body structure and required fields
3. Verify the endpoint path and method are correct
4. Ensure all required parameters are included
5. Try a simpler version of the request if needed`
            } else {
              resultMessage += `\n\nYou've reached the maximum retry limit for this validation error. Consider trying a different approach or a simpler request.`
            }
          }
        }

        loopMessages.push({
          role: "system",
          content: resultMessage,
        })
        lastApiResult = null
        lastPlan = null
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: loopMessages,
        }),
      })
      const data = await res.json()
      let aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not respond."

      // Check if agent intends to make an API call
      const mentionsApiCall =
        /\b(GET|POST|PUT|DELETE|PATCH)\s+\/api/i.test(aiMsg) ||
        /I['\s]*ll\s+(make|call|fetch|get|post|update|delete)/i.test(aiMsg) ||
        /let me\s+(make|call|fetch|get|post|update|delete)/i.test(aiMsg) ||
        aiMsg.includes("```")

      if (mentionsApiCall) {
        intentionTracker.intendedApiCall = true
      }

      const plan = extractApiPlan(aiMsg)
      if (plan) {
        intentionTracker.actualApiCall = true

        // For 422 errors, give more context-aware retries
        const is422Retry = retryCount422 > 0 && retryCount422 <= maxRetries422
        if (is422Retry) {
          // Don't increment turn count for 422 retries to give more chances
          turn--
        }

        const currentApiResult = await executeApiPlan(plan)

        // Create message with API call information
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
        intentionTracker.apiCallSuccess = lastApiResult.success
        if (!lastApiResult.success) {
          intentionTracker.apiCallErrors.push(lastApiResult.error || "Unknown error")
        }
        loopMessages.push({ role: "assistant", content: aiMsg })
        continue
      }

      // If agent intended to make API call but didn't, give it feedback
      if (intentionTracker.intendedApiCall && !intentionTracker.actualApiCall) {
        loopMessages.push({ role: "assistant", content: aiMsg })
        loopMessages.push({
          role: "system",
          content: `ATTENTION: You mentioned making an API call but did not provide a properly formatted API call. You need to use the exact format:
\`\`\`
METHOD /api/endpoint
Body: {json_data}
\`\`\`

Your response suggested an API call but no valid API call was extracted. Please try again with the correct format, or explain why you cannot make the call.`,
        })
        continue
      }

      loopMessages.push({ role: "assistant", content: aiMsg })

      // Enhanced confidence evaluation that considers API execution status
      let confidencePrompt = `Based on the chat so far, evaluate your progress:

1. Have you done all you reasonably can to answer the user's question?
2. Did any API calls fail that you should retry or approach differently?
3. Are you missing critical information that you could obtain?

Consider these factors:
- API call success/failure status
- Whether you intended to make API calls but didn't
- Whether you have sufficient data to answer the question
- Whether there are alternative approaches you haven't tried

Reply with CONFIDENT if you have done all you can and have sufficient information, or NOT CONFIDENT if you should continue trying. Explain your reasoning briefly.`

      // Add API execution context to confidence evaluation
      if (turn > 1) {
        const hasFailedCalls = intentionTracker.apiCallErrors.length > 0
        const hasIntentionMismatch = intentionTracker.intendedApiCall && !intentionTracker.actualApiCall
        const has422Retries = retryCount422 > 0

        if (hasFailedCalls || hasIntentionMismatch || has422Retries) {
          confidencePrompt += `\n\nIMPORTANT CONTEXT FOR THIS TURN:
- API call intention vs execution mismatch: ${hasIntentionMismatch}
- API call failures: ${hasFailedCalls}
- 422/validation error retries attempted: ${retryCount422}/${maxRetries422}
- Error details: ${intentionTracker.apiCallErrors.join(", ")}`
        }
      }

      const confidenceRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            ...loopMessages,
            { role: "assistant", content: aiMsg },
            { role: "system", content: confidencePrompt },
          ],
        }),
      })
      const confidenceData = await confidenceRes.json()
      const confidenceMsg = confidenceData.choices?.[0]?.message?.content || "NOT CONFIDENT"

      if (!/NOT CONFIDENT/i.test(confidenceMsg)) {
        const summaryPrompt = `You have completed your reasoning and are confident in your answer. Please provide a clear, concise final answer to the user's original question: "${userMsg}" using all information and results from the chat so far. Only output your answer to the user, not your internal reasoning or API call details.`
        const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              ...loopMessages,
              { role: "assistant", content: aiMsg },
              { role: "system", content: summaryPrompt },
            ],
          }),
        })
        const summaryData = await summaryRes.json()
        const summary = summaryData.choices?.[0]?.message?.content
        if (summary) {
          messages.value.push({ role: "assistant", content: summary })
          if (speechMode.value) speak(summary)
        }
        continueLoop = false
      } else {
        loopMessages.push({ role: "assistant", content: confidenceMsg })
      }
    }

    if (continueLoop) {
      const explainPrompt = `You have reached the maximum number of reasoning turns and are still NOT CONFIDENT. Please explain to the user, in clear and concise language, why a complete answer is not possible, using all information and results from the chat so far. Be transparent about any limitations (such as API failures, network issues, missing information, or data being from a test environment). Only output your explanation to the user.`
      const explainRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [...loopMessages, { role: "system", content: explainPrompt }],
        }),
      })
      const explainData = await explainRes.json()
      const explanation = explainData.choices?.[0]?.message?.content
      if (explanation) {
        messages.value.push({ role: "assistant", content: explanation })
        if (speechMode.value) speak(explanation)
      }
    }
    isLoading.value = false
  }

  return {
    messages,
    input,
    isLoading,
    speechMode,
    handleSubmit,
    handleMic,
    sendMessage,
  }
}
