// Node.js script to extract a readable summary of endpoints and key features from openapi.json
// Run with: node scripts/extract-api-summary.js

const fs = require("fs")
const path = require("path")

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, "../openapi.json"), "utf8"))
const paths = spec.paths || {}
const components = spec.components || {}

function summarizeParameters(params) {
  if (!Array.isArray(params)) return ""
  return params
    .map((p) => {
      let desc = `${p.name} (${p.in}${p.required ? ", required" : ""})`
      if (p.schema && p.schema.type) desc += `: ${p.schema.type}`
      if (p.description) desc += ` - ${p.description}`
      return desc
    })
    .join("; ")
}

function summarizeRequestBody(requestBody) {
  if (!requestBody || !requestBody.content) return ""
  const json = requestBody.content["application/json"]
  if (!json || !json.schema) return ""
  // Try to show the top-level fields
  if (json.schema.properties) {
    return (
      "Body fields: " +
      Object.keys(json.schema.properties)
        .map((k) => `${k}${json.schema.properties[k].type ? ` (${json.schema.properties[k].type})` : ""}`)
        .join(", ")
    )
  }
  return ""
}

function summarizeEndpoint(method, path, op) {
  let summary = `- ${method.toUpperCase()} ${path}`
  if (op.summary) summary += `: ${op.summary}`
  if (op.description && op.description !== op.summary) summary += `\n    ${op.description}`
  if (op.parameters) {
    const paramSummary = summarizeParameters(op.parameters)
    if (paramSummary) summary += `\n    Params: ${paramSummary}`
  }
  if (op.requestBody) {
    const bodySummary = summarizeRequestBody(op.requestBody)
    if (bodySummary) summary += `\n    ${bodySummary}`
  }
  // Add tags, sortable/searchable/filterable if present in description or extensions
  if (op.tags) summary += `\n    Tags: ${op.tags.join(", ")}`
  // Custom Orion extensions (if any)
  if (op["x-orion-sortable"]) summary += `\n    Sortable: ${op["x-orion-sortable"].join(", ")}`
  if (op["x-orion-searchable"]) summary += `\n    Searchable: ${op["x-orion-searchable"].join(", ")}`
  if (op["x-orion-filterable"]) summary += `\n    Filterable: ${op["x-orion-filterable"].join(", ")}`
  if (op["x-orion-scopes"]) summary += `\n    Scopes: ${op["x-orion-scopes"].join(", ")}`
  return summary
}

const output = []
output.push(`# API Endpoint Summary (generated ${new Date().toISOString()})\n`)
for (const [path, methods] of Object.entries(paths)) {
  for (const [method, op] of Object.entries(methods)) {
    output.push(summarizeEndpoint(method, path, op))
  }
}

fs.writeFileSync(path.join(__dirname, "../api-summary.txt"), output.join("\n\n"))
console.log("API summary written to api-summary.txt")
