// orval config for generating API client from OpenAPI spec
import { defineConfig } from "orval"

export default defineConfig({
  blacklabs: {
    input: "./openapi.yaml",
    output: {
      mode: "tags-split",
      target: "./src/api/blacklabs-api.ts",
      schemas: "./src/api/blacklabs-schemas.ts",
      client: "fetch",
      override: {
        mutator: {
          path: "./src/api/fetchWithAuth.ts",
          name: "fetchWithAuth",
        },
      },
    },
  },
})
