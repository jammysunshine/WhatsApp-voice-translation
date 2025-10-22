# WhatsApp Translation Bot

This is a file created by Qwen.

After every logical step or feature implementation (e.g., after implementing a new function, or fixing a bug, or completing a set of related changes), I will automatically commit and push the changes to the GitHub repository.

For the overall project goals and requirements, refer to `prompt.md`.

---

**Important Note:** This `gemini.md` file, along with `README.md` and `prompt.md`, must be reviewed and updated automatically after any significant change to the project to ensure all documentation remains current and accurate.

**Code Maintenance:** Regularly review the code for issues, optimizations, and unused parts (imports, variables, functions, dead code) to maintain a clean, efficient, and high-quality codebase. This should be done frequently and automatically if possible.

*   **Structured Logging:** Implement `winston` for server-side logging and appropriate error handling to improve visibility and management of application events and errors.

---

**Git Configuration:**

*   **`.gitignore` Configuration:** The .gitignore file must be configured to track only source code, explicitly excluding:
    * `node_modules/` - Dependencies folder
    * `.next/` - Next.js build artifacts (if applicable)
    * `out/` - Next.js static export folder (if applicable)  
    * `build/` - General build artifacts
    * `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `.pnpm-debug.log*` - Debug logs
    * `.env*` - Environment files (except .env.example if needed as template)
    * `.vercel` - Vercel deployment files
    * `.DS_Store` - macOS system files
    * `*.pem` - Certificate files
    * `*.key` - Key files
    * `*.cert` - Certificate files
    * `*.json` - Sensitive JSON files (credentials, etc.)
    * `coverage/` - Test coverage reports
    * `.pnp`, `.pnp.*`, `.yarn/*` - Package manager specific files
    * `.aider*` - Aider tool files
    * `logs/` - Log files directory
    * `temp/` - Temporary files directory
    * Any other build artifacts, temporary files, or binary files.

---

**Commit Message Guidelines:** Commit messages should be simple, concise, and descriptive. Avoid using special characters (e.g., `!`, `@`, `#`, `%`, `^`, `&`, `*`, `(`, `)`, `[`, `]`, `{`, `}`, `;`, `:`, `'`, `\"`, `<`, `>`, `?`, `/`, `\\`, `|`, `~`, `` ` ``, `-`, `_`, `=`, `+`) in the commit message itself to ensure compatibility and readability across various Git tools and platforms.

---

**General Optimization Guidelines:** For all future updates and projects, adhere to the following best practices:

*   **Structured Logging:** Implement a dedicated logging solution (e.g., Winston for server, custom logger for client) with configurable levels. Avoid raw `console.log` in production.
*   **Centralized Configuration:** Externalize all hardcoded values (e.g., API keys, ports, timeouts, language codes, MIME types) into environment variables or a central configuration file. For local development, utilize `.env` files and a library like `dotenv` to manage these variables effectively.
*   **User-Friendly Error Handling:** Replace intrusive `alert` or raw `console.error` with proper error responses for API calls in production.
*   **Asynchronous Operations:** Avoid synchronous I/O operations (e.g., `fs.readFileSync`) in main execution paths. Perform heavy or blocking operations asynchronously, ideally during application startup or initialization.
*   **Resource Management:** Always ensure proper and timely cleanup of all allocated resources (e.g., HTTP connections, timers, event listeners) to prevent leaks and unexpected behavior.
*   **Code Readability & Maintainability:** Extract complex conditional logic into well-named variables or helper functions. Refactor repetitive code into reusable functions or components.
*   **Security:** Implement proper authentication and validation for all incoming webhook requests.
*   **Rate Limiting:** Implement appropriate rate limiting to prevent API abuse and control costs.

**WhatsApp Business API Specific Guidelines:**

*   **Webhook Validation:** Properly implement webhook validation using the provided app secret and verify tokens.
*   **Media Handling:** Efficiently download, process, and clean up media files received from WhatsApp.
*   **Message Formatting:** Format responses appropriately for WhatsApp's message structure.
*   **Error Handling:** Implement robust error handling for various WhatsApp API error scenarios.
*   **Rate Limits:** Respect WhatsApp Business API rate limits and implement retry logic where appropriate.

---

**Agent Workflow Mandates:**

*   **Self-Review Before Testing:** Always perform a thorough self-review of all implemented changes, including code, configuration, and documentation, to ensure correctness, completeness, and adherence to project standards *before* asking the user to test.
*   **Security First:** Always implement security measures as a primary concern when dealing with webhooks and API endpoints.