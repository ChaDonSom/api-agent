// Simple API test to see the actual response
import fetch from "node-fetch"

async function testApiResponse() {
  const API_BASE_URL = "https://blacklabsconsole.com/api"
  const API_KEY = "18156|ApLx3il93F9YHQvh8I7lsX55FLrZVoTQASLveIUxb6ca3c01"

  // Test different endpoint versions
  const testUrls = [
    `${API_BASE_URL}/users`, // No version (should default to latest)
    `${API_BASE_URL}/v1/users`, // Version 1 (as shown in OpenAPI spec)
    `${API_BASE_URL}/v2/users`, // Version 2 (as requested)
  ]

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  for (const url of testUrls) {
    console.log("Testing URL:", url)
    console.log("Headers:", headers)

    try {
      const res = await fetch(url, { method: "GET", headers })
      console.log("Response status:", res.status)
      console.log("Response headers:", [...res.headers.entries()])

      const text = await res.text()
      console.log("Raw response (first 500 chars):", text.substring(0, 500))

      // Try to parse as JSON
      try {
        const json = JSON.parse(text)
        console.log("Parsed JSON:", json)
      } catch (e) {
        console.log("Response is not valid JSON")
      }
    } catch (error) {
      console.log("Fetch error:", error.message)
    }

    console.log("---\n")
  }
}

testApiResponse()
