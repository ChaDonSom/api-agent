// API config for environment variables
// Usage: import { API_BASE_URL, API_KEY } from './api-config'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://blacklabsconsole.com/api/v2"
export const API_KEY = import.meta.env.VITE_API_KEY
