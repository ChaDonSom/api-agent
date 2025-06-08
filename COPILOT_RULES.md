// COPILOT RULES: All Vue components in this project must be less than 150 lines (excluding blank lines and comments). Keep logic concise and modular. If a component grows too large, refactor or extract logic/components.

// CODE STYLE RULES:

- Always put certain primitives at the top: env constants, props, and similar config.

- Place primitives (e.g., refs, state) after higher-level functions that use them, unless they must be hoisted (then use var).

- Order declarations in chronological order of use (e.g., index, create, show, update, delete; for UI, fetch/render logic before submit/side-effect logic).

- Extracted logic should be in a file named the same as the Vue component but in kebab-case (e.g., ChatAgent.vue → chat-agent.ts).

- Logic shared by multiple components should be extracted to the nearest shared directory.

- Vue component files are limited to 150 lines (excluding blank lines and comments). If a component exceeds this, extract logic or template into separate files.
