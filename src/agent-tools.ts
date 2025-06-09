// This file defines the available API endpoints (tools) for the agent
// and their expected parameters and response shapes.

export type ApiTool = {
  name: string
  description: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  params?: Record<string, string>
  example?: string
  bodyParams?: Record<string, string>
}

// Query parameter helpers for advanced API features
export const QueryParams = {
  // Relationships and includes
  include: "Comma-separated list of relationships to include (e.g., 'user,job,tasks')",

  // Aggregations
  with_count: "Count related records (e.g., 'tasks,entries')",
  with_exists: "Check existence of related records (e.g., 'tasks')",
  with_avg: "Average of numeric fields (e.g., 'entries.hours')",
  with_sum: "Sum of numeric fields (e.g., 'entries.hours')",
  with_min: "Minimum of numeric fields (e.g., 'entries.hours')",
  with_max: "Maximum of numeric fields (e.g., 'entries.hours')",

  // Soft deletes
  with_trashed: "Include soft-deleted records (boolean)",
  only_trashed: "Only show soft-deleted records (boolean)",

  // Forcing operations
  force: "Force delete (permanently delete, boolean)",
}

// Search request body structure
export const SearchBodyStructure = {
  filters: "Array of filter objects: [{field: 'name', operator: 'like', value: 'John'}]",
  search: "Global search object: {value: 'search term', fields: ['name', 'email']}",
  sort: "Array of sort objects: [{field: 'created_at', direction: 'desc'}]",
  includes: "Array of relation objects: [{'relation': 'user'}, {'relation': 'job'}]",
  aggregates: "Array of aggregation objects: [{field: 'hours', function: 'sum'}]",
}

export const apiTools: ApiTool[] = [
  // Basic CRUD for all resources
  {
    name: "List Users",
    description: "Get a list of all users with optional filtering and includes",
    endpoint: "/api/v2/users",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
      with_trashed: QueryParams.with_trashed,
      only_trashed: QueryParams.only_trashed,
    },
    example: "GET /api/v2/users?include=crews,entries&with_count=entries",
  },
  {
    name: "Search Users",
    description: "Advanced search for users with filters, sorting, and aggregations",
    endpoint: "/api/v2/users/search",
    method: "POST",
    params: {
      include: QueryParams.include,
      with_trashed: QueryParams.with_trashed,
      only_trashed: QueryParams.only_trashed,
    },
    bodyParams: SearchBodyStructure,
    example:
      "POST /api/v2/users/search with body: {filters: [{field: 'name', operator: 'like', value: 'John'}], sort: [{field: 'created_at', direction: 'desc'}], includes: [{'relation': 'crews'}, {'relation': 'entries'}]}",
  },
  {
    name: "Create User",
    description: "Create a new user",
    endpoint: "/api/v2/users",
    method: "POST",
    params: { include: QueryParams.include },
    example: "POST /api/v2/users with body: {name: 'John Doe', email: 'john@example.com'}",
  },
  {
    name: "Get User",
    description: "Get a specific user by ID",
    endpoint: "/api/v2/users/{id}",
    method: "GET",
    params: { include: QueryParams.include },
    example: "GET /api/v2/users/1?include=crews,entries",
  },
  {
    name: "Update User",
    description: "Update an existing user",
    endpoint: "/api/v2/users/{id}",
    method: "PATCH",
    params: { include: QueryParams.include },
    example: "PATCH /api/v2/users/1 with body: {name: 'Updated Name'}",
  },
  {
    name: "Delete User",
    description: "Delete a user (soft delete by default, use force=true for permanent)",
    endpoint: "/api/v2/users/{id}",
    method: "DELETE",
    params: { force: QueryParams.force },
    example: "DELETE /api/v2/users/1?force=true",
  },
  {
    name: "Restore User",
    description: "Restore a soft-deleted user",
    endpoint: "/api/v2/users/{id}/restore",
    method: "POST",
    params: { include: QueryParams.include },
    example: "POST /api/v2/users/1/restore",
  },
  {
    name: "Batch Create Users",
    description: "Create multiple users in a single transaction",
    endpoint: "/api/v2/users/batch",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: { resources: "Array of user objects to create" },
    example: "POST /api/v2/users/batch with body: {resources: [{name: 'User 1'}, {name: 'User 2'}]}",
  },
  {
    name: "Batch Update Users",
    description: "Update multiple users in a single transaction",
    endpoint: "/api/v2/users/batch",
    method: "PATCH",
    params: { include: QueryParams.include },
    bodyParams: { resources: "Object with user IDs as keys and update data as values" },
    example:
      "PATCH /api/v2/users/batch with body: {resources: {'1': {name: 'New Name'}, '2': {email: 'new@email.com'}}}",
  },
  {
    name: "Batch Delete Users",
    description: "Delete multiple users in a single transaction",
    endpoint: "/api/v2/users/batch",
    method: "DELETE",
    params: { force: QueryParams.force },
    bodyParams: { resources: "Array of user IDs to delete" },
    example: "DELETE /api/v2/users/batch with body: {resources: [1, 2, 3]}",
  },

  // Jobs
  {
    name: "List Jobs",
    description: "Get a list of all jobs with optional filtering and includes",
    endpoint: "/api/v2/jobs",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
      with_sum: QueryParams.with_sum,
    },
    example: "GET /api/v2/jobs?include=tasks,customer&with_count=tasks&with_sum=entries.hours",
  },
  {
    name: "Search Jobs",
    description: "Advanced search for jobs with filters, sorting, and aggregations",
    endpoint: "/api/v2/jobs/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example:
      "POST /api/v2/jobs/search with body: {filters: [{field: 'status', operator: '=', value: 'active'}], includes: [{'relation': 'customer'}, {'relation': 'tasks'}]}",
  },

  // Tasks
  {
    name: "List Tasks",
    description: "Get a list of all tasks with optional filtering and includes",
    endpoint: "/api/v2/tasks",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
    },
    example: "GET /api/v2/tasks?include=job,entries&with_count=entries",
  },
  {
    name: "Search Tasks",
    description: "Advanced search for tasks with filters, sorting, and aggregations",
    endpoint: "/api/v2/tasks/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example:
      "POST /api/v2/tasks/search with body: {filters: [{field: 'job_id', operator: '=', value: 1}], sort: [{field: 'due_date', direction: 'asc'}]}",
  },

  // Time Entries
  {
    name: "List Entries",
    description: "Get a list of all time entries with optional filtering and includes",
    endpoint: "/api/v2/entries",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_sum: QueryParams.with_sum,
      with_avg: QueryParams.with_avg,
    },
    example: "GET /api/v2/entries?include=user,job,task&with_sum=hours&with_avg=hours",
  },
  {
    name: "Search Entries",
    description: "Advanced search for time entries with filters, sorting, and aggregations",
    endpoint: "/api/v2/entries/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example:
      "POST /api/v2/entries/search with body: {filters: [{field: 'date', operator: '>=', value: '2025-01-01'}], aggregates: [{field: 'hours', function: 'sum'}]}",
  },

  // Crews
  {
    name: "List Crews",
    description: "Get a list of all crews with optional filtering and includes",
    endpoint: "/api/v2/crews",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
    },
    example: "GET /api/v2/crews?include=users&with_count=users",
  },
  {
    name: "Search Crews",
    description: "Advanced search for crews with filters, sorting, and aggregations",
    endpoint: "/api/v2/crews/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example: "POST /api/v2/crews/search with body: {filters: [{field: 'active', operator: '=', value: true}]}",
  },

  // Equipment
  {
    name: "List Equipment",
    description: "Get a list of all equipment with optional filtering and includes",
    endpoint: "/api/v2/equipment",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
    },
    example: "GET /api/v2/equipment?include=assignments&with_count=assignments",
  },
  {
    name: "Search Equipment",
    description: "Advanced search for equipment with filters, sorting, and aggregations",
    endpoint: "/api/v2/equipment/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example: "POST /api/v2/equipment/search with body: {filters: [{field: 'type', operator: '=', value: 'truck'}]}",
  },

  // Customers
  {
    name: "List Customers",
    description: "Get a list of all customers with optional filtering and includes",
    endpoint: "/api/v2/customers",
    method: "GET",
    params: {
      include: QueryParams.include,
      with_count: QueryParams.with_count,
      with_sum: QueryParams.with_sum,
    },
    example: "GET /api/v2/customers?include=jobs,companies&with_count=jobs&with_sum=jobs.total_value",
  },
  {
    name: "Search Customers",
    description: "Advanced search for customers with filters, sorting, and aggregations",
    endpoint: "/api/v2/customers/search",
    method: "POST",
    params: { include: QueryParams.include },
    bodyParams: SearchBodyStructure,
    example: "POST /api/v2/customers/search with body: {search: {value: 'company name', fields: ['name', 'company']}}",
  },
]
