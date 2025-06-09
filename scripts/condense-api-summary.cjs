// Node.js script to condense the API summary for LLM use
// Run with: node scripts/condense-api-summary.cjs

const fs = require("fs")
const path = require("path")

const summaryFile = path.join(__dirname, "../api-summary.txt")
const summary = fs.readFileSync(summaryFile, "utf8")

// Parse endpoints and group by resource base path
const endpointRegex = /^- (GET|POST|PUT|PATCH|DELETE) (\/api\/v1\/[^\s:]+)(?:[^\n]*)/gm
const resourceOps = {}
const endpointLines = summary.split("\n").filter((l) => l.startsWith("- "))

for (const line of endpointLines) {
  const match = line.match(/^- (GET|POST|PUT|PATCH|DELETE) (\/api\/v1\/[^\s/{:]+)(?:[/{][^\s]*)?/)
  if (match) {
    const method = match[1]
    const base = match[2]
    if (!resourceOps[base]) resourceOps[base] = new Set()
    resourceOps[base].add(method)
  }
}

// Count operation frequencies
const opCounts = {}
for (const ops of Object.values(resourceOps)) {
  for (const op of ops) opCounts[op] = (opCounts[op] || 0) + 1
}

// Find the most common set of operations
const allOps = Object.keys(opCounts)
const mostCommonOps = allOps.filter((op) => opCounts[op] >= Object.keys(resourceOps).length * 0.8) // present in 80%+

// Build condensed summary
let output = []
output.push(`# Condensed API Endpoint Summary (generated ${new Date().toISOString()})\n`)
output.push(
  `Unless otherwise specified, every resource listed below supports: ${mostCommonOps.join(
    ", "
  )}.\n`
)
output.push("Resources:")
for (const base of Object.keys(resourceOps)) {
  output.push(`- ${base}`)
}
output.push("\nExceptions and special endpoints:")
for (const [base, ops] of Object.entries(resourceOps)) {
  const missing = mostCommonOps.filter((op) => !ops.has(op))
  if (missing.length > 0) {
    output.push(`- ${base} is missing: ${missing.join(", ")}`)
  }
  const extra = [...ops].filter((op) => !mostCommonOps.includes(op))
  if (extra.length > 0) {
    output.push(`- ${base} has extra: ${extra.join(", ")}`)
  }
}
output.push("\nFor full details, see the original api-summary.txt.")

fs.writeFileSync(path.join(__dirname, "../api-summary-condensed.txt"), output.join("\n"))
console.log("Condensed API summary written to api-summary-condensed.txt")
