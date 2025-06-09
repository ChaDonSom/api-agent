# API Features & Capabilities

This AI agent now supports the full range of advanced API features available in the backend. Here's what you can do:

## Basic CRUD Operations

### Standard Operations

- **GET** `/api/v2/{resource}` - List all records
- **POST** `/api/v2/{resource}` - Create a new record
- **GET** `/api/v2/{resource}/{id}` - Get a specific record
- **PATCH** `/api/v2/{resource}/{id}` - Update a specific record
- **DELETE** `/api/v2/{resource}/{id}` - Delete a record

### Available Resources

- users, crews, equipment, default-tasks, jobs, tasks, entries, entry-details
- clock-entries, events, notes, companies, customers

## Advanced Search & Filtering

### Search Endpoints

Use `POST /api/v2/{resource}/search` for complex queries:

```json
{
  "filters": [
    { "field": "name", "operator": "like", "value": "John" },
    { "field": "created_at", "operator": ">=", "value": "2025-01-01" },
    { "field": "status", "operator": "in", "value": ["active", "pending"] }
  ],
  "search": {
    "value": "search term",
    "fields": ["name", "email", "description"]
  },
  "sort": [
    { "field": "created_at", "direction": "desc" },
    { "field": "name", "direction": "asc" }
  ],
  "includes": [{"relation": "user"}, {"relation": "job"}, {"relation": "tasks"}],
  "aggregates": [
    { "field": "hours", "function": "sum" },
    { "field": "entries", "function": "count" }
  ]
}
```

### Filter Operators

- `=`, `!=` - Exact match/not match
- `>`, `<`, `>=`, `<=` - Comparisons
- `like` - Text contains (use % for wildcards)
- `in`, `not_in` - Value in/not in array
- `between` - Value between two values
- `is_null`, `is_not_null` - Null checks

## Query Parameters & Relationships

### Including Related Data

- `?include=user,job,tasks` - Load related records
- `?include=user.crews,job.customer` - Nested relationships

### Aggregations

- `?with_count=tasks,entries` - Count related records
- `?with_sum=entries.hours` - Sum numeric fields
- `?with_avg=entries.hours` - Average values
- `?with_min=entries.hours` - Minimum values
- `?with_max=entries.hours` - Maximum values

### Soft Deletes

- `?with_trashed=true` - Include soft-deleted records
- `?only_trashed=true` - Only show soft-deleted records
- `?force=true` - Permanently delete (use with DELETE)

## Batch Operations

### Create Multiple Records

```
POST /api/v2/{resource}/batch
Body: {"resources": [{"name": "Item 1"}, {"name": "Item 2"}]}
```

### Update Multiple Records

```
PATCH /api/v2/{resource}/batch
Body: {"resources": {"1": {"name": "New Name"}, "2": {"status": "active"}}}
```

### Delete Multiple Records

```
DELETE /api/v2/{resource}/batch
Body: {"resources": [1, 2, 3]}
```

## Restore Operations

### Restore Single Record

```
POST /api/v2/{resource}/{id}/restore
```

### Restore Multiple Records

```
POST /api/v2/{resource}/batch/restore
Body: {"resources": [1, 2, 3]}
```

## Common Examples

### Find Active Jobs with Total Hours

```
POST /api/v2/jobs/search
Body: {
  "filters": [{"field": "status", "operator": "=", "value": "active"}],
  "includes": [{"relation": "customer"}, {"relation": "tasks"}],
  "aggregates": [{"field": "entries.hours", "function": "sum"}],
  "sort": [{"field": "created_at", "direction": "desc"}]
}
```

### Get Users with Entry Counts

```
GET /api/v2/users?include=crews&with_count=entries&with_sum=entries.hours
```

### Search Equipment by Type

```
POST /api/v2/equipment/search
Body: {
  "filters": [{"field": "type", "operator": "=", "value": "truck"}],
  "includes": [{"relation": "assignments"}],
  "sort": [{"field": "model", "direction": "asc"}]
}
```

### Find Recent Time Entries

```
POST /api/v2/entries/search
Body: {
  "filters": [
    {"field": "date", "operator": ">=", "value": "2025-06-01"},
    {"field": "hours", "operator": ">", "value": 0}
  ],
  "includes": [{"relation": "user"}, {"relation": "job"}, {"relation": "task"}],
  "sort": [{"field": "date", "direction": "desc"}],
  "aggregates": [{"field": "hours", "function": "sum"}]
}
```

## Tips for Users

1. **Use Search for Complex Queries**: Instead of basic GET requests, use the search endpoints when you need filtering, sorting, or aggregations.

2. **Load Related Data**: Use `include` parameters to get related data in a single request rather than making multiple calls.

3. **Batch Operations**: When working with multiple records, use batch endpoints for better performance.

4. **Aggregations**: Let the API calculate sums, averages, and counts rather than doing it client-side.

5. **Soft Deletes**: Most resources support soft deletes - use `with_trashed=true` to see deleted records and restore operations to bring them back.

Ask the AI agent for any of these capabilities by describing what you want to do in natural language!
