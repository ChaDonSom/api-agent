# AI API Agent

An intelligent chat agent that can interact with complex APIs using natural language. Built with Vue 3, TypeScript, and Vite.

## Features

### 🤖 AI-Powered API Interaction

- Natural language queries to API endpoints
- Automatic API call planning and execution
- Support for complex workflows and multi-step operations

### 🔍 Advanced API Capabilities

- **Search & Filtering**: Advanced search with filters, sorting, and pagination
- **Relationships**: Load related data with `include` parameters
- **Aggregations**: Calculate sums, averages, counts, min/max values
- **Batch Operations**: Create, update, or delete multiple records in one request
- **Soft Deletes**: Support for soft delete and restore operations
- **Complex Queries**: Support for all SQL-like operators (=, !=, >, <, like, in, between, etc.)

### 💬 Interactive Features

- Text-based chat interface
- Speech recognition and text-to-speech (optional)
- Real-time API call execution and results
- Persistent conversation history

## API Capabilities

The agent supports a full range of API operations on these resources:

- Users, Crews, Equipment, Jobs, Tasks
- Time Entries, Events, Notes, Companies, Customers
- And more...

### Example Queries You Can Ask:

- "Show me all active jobs with their total hours"
- "Find users who haven't logged time this week"
- "Get equipment that needs maintenance"
- "Create a batch of new tasks for project X"
- "Show me the top 5 customers by revenue"

### Advanced Features:

- **Search**: `POST /api/v2/{resource}/search` with complex filters
- **Includes**: Load related data (e.g., jobs with customers and tasks)
- **Aggregations**: Get sums, averages, counts automatically
- **Batch Operations**: Handle multiple records efficiently
- **Soft Deletes**: Restore deleted records when needed

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment:**
   Create a `.env` file with your API configuration:

   ```
   VITE_API_BASE_URL=https://your-api-base-url.com
   VITE_API_KEY=your-api-key
   VITE_OPENAI_API_KEY=your-openai-key
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to `http://localhost:5173` and start chatting with the AI agent!

## Usage

Simply type natural language queries about your data:

- "Show me all users with their crew assignments"
- "Find jobs created this month with more than 40 hours logged"
- "Create 5 new tasks for the Johnson project"
- "Which equipment has the most usage hours?"

The AI will automatically determine the best API calls to make and provide you with the results.

## API Documentation

See [API_FEATURES.md](./API_FEATURES.md) for complete documentation of available API features and capabilities.

## Technology Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **AI**: OpenAI GPT-3.5/4 for natural language processing
- **API**: RESTful API with advanced search and filtering
- **Speech**: Web Speech API for voice interaction (optional)

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
