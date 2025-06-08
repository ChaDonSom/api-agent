# Project Plan: API Agent Demo (Vue 3 + Typescript + Tailwind)

## Overview

A demo web app using Vue 3 (Typescript, Tailwind) that features an AI agent (OpenAI API) capable of listening/speaking or reading/writing responses. The agent interacts with a mock API (Laravel Orion-style, via json-server) for models: User, TimeEntry, Job, Task. The agent can plan and execute API calls in sequence, using results/history to reach a confidence threshold before responding.

---

## 1. Tech Stack

- Vue 3 (with Typescript)
- Vite (build tool)
- Tailwind CSS (styling)
- OpenAI API (AI agent)
- json-server (mock API)

---

## 2. Features

- **AI Agent UX**: Text and voice input/output (listen/speak, read/write)
- **API Planning**: Agent drafts a plan of API calls (endpoints, params, order)
- **API Execution**: Agent executes plan, can iterate with history until confident
- **Mock API**: REST endpoints for User, TimeEntry, Job, Task (Orion-style)
- **Seed Data**: Example data for all models

---

## 3. Mock API (json-server)

- Endpoints:
  - `/users`
  - `/jobs`
  - `/tasks` (with `job_id`)
  - `/time-entries` (with `total_time`, `took_break`, `start`, `end`, `job_id`, `task_id`)
- Seed data in `server/db.json`

---

## 4. AI Agent Logic

- Accepts user input (text/voice)
- Drafts a plan: which endpoints to call, with what params, in what order
- Executes plan, adds results to history
- Repeats as needed to reach confidence threshold
- Responds to user (text/voice)

---

## 5. UI

- Modern, clean UI with Tailwind
- Chat interface for agent/user
- Option for voice input/output (Web Speech API)
- Display API call plan and history (for demo/inspection)

---

## 6. Next Steps

- [x] Scaffold Vue 3 + Typescript + Tailwind project
- [x] Set up json-server with Orion-style endpoints and seed data (run with `npm run mock:api`)
- [ ] Implement AI agent logic (planning, execution, confidence loop)
- [ ] Build chat/voice UI
- [ ] Integrate OpenAI API
- [ ] Polish and test
