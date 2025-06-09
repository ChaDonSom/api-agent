# API Includes Format Guide

## Two Different Includes Formats

The API supports two different ways to include related data, and it's crucial to use the correct format for each case:

### 1. Query Parameter `include` (for GET requests)
**Format**: Comma-separated string
**Usage**: `?include=relationship1,relationship2,relationship3`

```
GET /api/v2/users?include=crews,entries,tasks
GET /api/v2/jobs?include=customer,tasks&with_count=entries
```

### 2. Request Body `includes` (for POST search requests)
**Format**: Array of objects with `relation` property
**Usage**: `"includes": [{"relation": "relationship1"}, {"relation": "relationship2"}]`

```json
POST /api/v2/users/search
Body: {
  "filters": [...],
  "includes": [
    {"relation": "crews"}, 
    {"relation": "entries"},
    {"relation": "tasks"}
  ]
}
```

## ❌ Common Mistake
**WRONG** - Using simple array of strings in search body:
```json
{
  "includes": ["crews", "entries", "tasks"]  // ❌ Incorrect
}
```

**CORRECT** - Using array of relation objects:
```json
{
  "includes": [
    {"relation": "crews"}, 
    {"relation": "entries"}, 
    {"relation": "tasks"}
  ]  // ✅ Correct
}
```

## Why Two Different Formats?

1. **Query Parameters** have limitations on complex data structures, so relationships are passed as comma-separated strings
2. **Request Bodies** can handle complex JSON structures, so relationships are specified as objects with additional metadata potential

## Examples by Endpoint Type

### GET Requests (Query Parameter)
```
GET /api/v2/users?include=crews,entries&with_count=tasks
GET /api/v2/jobs?include=customer,tasks,entries&with_sum=entries.hours
GET /api/v2/equipment?include=assignments,maintenance_records
```

### POST Search Requests (Request Body)
```json
POST /api/v2/users/search
Body: {
  "filters": [{"field": "active", "operator": "=", "value": true}],
  "includes": [{"relation": "crews"}, {"relation": "entries"}],
  "sort": [{"field": "name", "direction": "asc"}]
}

POST /api/v2/jobs/search  
Body: {
  "filters": [{"field": "status", "operator": "=", "value": "active"}],
  "includes": [{"relation": "customer"}, {"relation": "tasks"}, {"relation": "entries"}],
  "aggregates": [{"field": "entries.hours", "function": "sum"}]
}
```

## AI Agent Instructions

When the AI agent receives requests to include relationships:

1. **For GET requests**: Use `?include=rel1,rel2,rel3` format
2. **For POST search requests**: Use `"includes": [{"relation": "rel1"}, {"relation": "rel2"}]` format
3. **Always verify** which type of request is being made before choosing the format

This ensures the API calls will work correctly and return the expected related data.
