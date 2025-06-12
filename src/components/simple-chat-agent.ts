import { ref } from "vue"
import { executeApiPlan } from "../agent-api"
import type { ApiCallPlan, ApiExecutionResult } from "../agent-api"
import apiSummary from "../../api-summary-condensed.txt?raw"

export function getSimpleSystemPrompt(): string {
  return `You are an AI agent that makes API calls. 

When you want to make an API call, you MUST output it in this EXACT format - nothing else works:

\`\`\`
GET /api/v2/users
\`\`\`

For POST requests with data:

\`\`\`
POST /api/v2/users
Body: {"name": "John"}
\`\`\`

**CRITICAL RULE: NEVER just say "I will make an API call". You MUST immediately output the \`\`\` code block.**

**EXAMPLES:**

Wrong: "I will fetch the users"
Correct: "I will fetch the users.\n\n\`\`\`\nGET /api/v2/users\n\`\`\`"

Wrong: "Let me get the user list"  
Correct: "Let me get the user list.\n\n\`\`\`\nGET /api/v2/users\n\`\`\`"

Available endpoints:
${apiSummary}

**REMEMBER: Always provide the \`\`\` code block immediately when you mention making any API call.**`
}

export function extractSimpleApiPlan(text: string): ApiCallPlan | null {
  console.log("🔍 Extracting API plan from:", text)

  const codeBlocks = text.match(/```[\s\S]*?```/g)
  console.log("📝 Found code blocks:", codeBlocks)

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

          if (endpoint.includes("?")) {
            const [path, query] = endpoint.split("?")
            endpoint = path
            params = Object.fromEntries(new URLSearchParams(query))
          }

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
          console.log("✅ Extracted API plan:", plan)
          return plan
        }
      }
    }
  }

  console.log("❌ No valid API plan found")
  return null
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

export function useSimpleChatAgent(OPENAI_API_KEY: string) {
  const messages = ref<ChatMessage[]>([])
  const input = ref("")
  const isLoading = ref(false)

  async function sendMessage() {
    if (!input.value.trim()) return

    const userMsg = input.value.trim()
    messages.value.push({ role: "user", content: userMsg })
    input.value = ""
    isLoading.value = true

    let continueLoop = true
    let maxTurns = 5
    let turn = 0

    let loopMessages = [
      { role: "system", content: getSimpleSystemPrompt() },
      ...messages.value.map((m) => ({ role: m.role, content: m.content })),
    ]

    let lastApiResult: ApiExecutionResult | null = null
    let lastPlan: ApiCallPlan | null = null

    while (continueLoop && turn < maxTurns) {
      turn++
      console.log(`🔄 Turn ${turn}/${maxTurns}`)

      // Add API result context
      if (lastApiResult && lastPlan) {
        let resultMessage = ""
        if (lastApiResult.success) {
          resultMessage = `✅ API SUCCESS: ${lastPlan.method} ${lastPlan.endpoint}\nData: ${JSON.stringify(
            lastApiResult.data
          )}`
        } else {
          resultMessage = `❌ API FAILED: ${lastPlan.method} ${lastPlan.endpoint}\nError: ${lastApiResult.error}`
        }
        loopMessages.push({ role: "system", content: resultMessage })
        lastApiResult = null
        lastPlan = null
      }

      // Get AI response
      console.log("🤖 Sending request to OpenAI...")
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: loopMessages,
          temperature: 0.1,
        }),
      })

      const data = await res.json()
      let aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not respond."
      console.log("🤖 AI Response:", aiMsg)

      // Try to extract API plan
      const plan = extractSimpleApiPlan(aiMsg)

      if (plan) {
        console.log("🚀 Executing API call:", plan)
        const currentApiResult = await executeApiPlan(plan)
        console.log("📊 API Result:", currentApiResult)

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
        /I\s+(will|ll)\s+(make|call|fetch|get|execute)/i.test(aiMsg) ||
        /let\s+me\s+(fetch|get|call)/i.test(aiMsg) ||
        /fetch.*users/i.test(aiMsg) ||
        /get.*users/i.test(aiMsg)

      if (mentionsApiCall && !plan) {
        console.log("⚠️ AI mentioned API call but no valid format detected")
        loopMessages.push({ role: "assistant", content: aiMsg })
        loopMessages.push({
          role: "system",
          content: `❌ CRITICAL: You mentioned making an API call but did NOT provide the required format.

You MUST use this EXACT format:

\`\`\`
GET /api/v2/users
\`\`\`

Do NOT just say "I will fetch" - provide the actual code block NOW.`,
        })
        continue
      }

      loopMessages.push({ role: "assistant", content: aiMsg })

      // Simple confidence check
      if (aiMsg.toLowerCase().includes("user") && !mentionsApiCall) {
        console.log("✅ AI seems confident, ending loop")
        messages.value.push({ role: "assistant", content: aiMsg })
        continueLoop = false
      }
    }

    if (continueLoop) {
      messages.value.push({
        role: "assistant",
        content: `Reached max turns (${maxTurns}). Unable to complete the request.`,
      })
    }

    isLoading.value = false
  }

  return {
    messages,
    input,
    isLoading,
    sendMessage,
  }
}
