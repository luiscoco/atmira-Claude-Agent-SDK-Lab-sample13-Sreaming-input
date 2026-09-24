# Streaming input

This file describes the **steps followed** to add Concept 12 (**Streaming input mode**) to the Claude Agent SDK Lab:
what was read, what was decided, how it was tested, and what the tests changed.
To learn the concept itself (what an async iterable `prompt` does and how to use the tab), read
[Tab12-Streaming-input.md](Tab12-Streaming-input.md).

| Concept | Topic | Routes | Explanation |
|---|---|---|---|
| 12 | Streaming input: one live session, queue, `priority`, images, `setModel()`, `setPermissionMode()`, `getContextUsage()` | `/api/c12/session`, `/send`, `/model`, `/permission-mode`, `/context`, `/end`, `/script` | [Tab12-Streaming-input.md](Tab12-Streaming-input.md) |

## How to run it

```powershell
npm run dev        # server on http://localhost:3001, web on the Vite port
```

`node_modules` was copied from sample11, so `npm install` is not needed. Open the **12. Streaming input** tab. Put
`ANTHROPIC_API_KEY` in `.env` (see `.env.example`), or leave it empty to use your Claude Code login.

> **Only one sample can run at a time.** Every sample's server uses port **3001**. If another sample is still running,
> sample12's server can't start, Vite moves to port 5174, and its proxy sends `/api/c12/...` to the *other* sample's
> server. That server answers **404** (see Step 9). Stop the other `npm run dev` first.

## Step 1: Choose the feature

The request asked to "implement the following feature" but no feature text came through, and `sample12/` was empty.
The earlier samples were searched for a roadmap of Concept 12; there was none. Tabs 1 to 11 already covered `query()` →
Skills.

A quick `grep` over sample11's server showed which SDK features were still unused: external MCP servers
(`type: "stdio" | "http"`), `setModel()`, `setPermissionMode()`, `mcpServerStatus()`, `total_cost_usd` tracking.
Three topics were offered: **external MCP servers**, **streaming input mode** and **cost & usage tracking**.
**Streaming input mode** was chosen.

## Step 2: Read the existing samples

Each sample is the previous one plus one tab, so sample11 was read to make the new concept look like the others:

| Read | To learn |
|---|---|
| `src/App.tsx`, `server/index.ts` | The tab list (`concepts` array) and one router per concept on `/api/cN` |
| `server/sse.ts`, `src/lib/sse.ts` | `openSse()` / `pipe()` on the server, `streamPost()` in the browser |
| `server/concepts/10-structured-interrupt.ts` | **Important:** Concept 10 Part B already had an input queue, a `Map` of open runs and control routes (`/interrupt`, `/send`, `/end`) |
| `src/concepts/Concept10StructuredInterrupt.tsx` | The `Timeline` built from `text_delta` stream events and `control` SSE events |
| `src/styles.css`, `src/components/MessageLog.tsx` | CSS classes to reuse, the raw message log |
| `Tab10-…md`, `Tab11-Skills.md`, `Tab1-query().md` | The explanation format and the table of concepts |

Because Concept 10 had already shown the queue *as a tool for `interrupt()`*, Concept 12 had to go further: the live
session itself is the topic.

## Step 3: Check the SDK types

The type file of the installed SDK (`0.3.281`, `sdk.d.ts`) was read, not guessed:

| Type / method | What it gave the design |
|---|---|
| `query({ prompt: string \| AsyncIterable<SDKUserMessage> })` | The two modes to compare in Part C |
| `SDKUserMessage.message` (`MessageParam`) | Content can be an array of blocks → image messages |
| `SDKUserMessage.priority?: 'now' \| 'next' \| 'later'` | Sending while busy, with a priority |
| `Query.setModel()`, `setPermissionMode()` | "Only available in streaming input mode" → Part B |
| `Query.supportedModels()`, `getContextUsage({ detail })` | Filling the model list, drawing the context bar |
| `Query.streamInput()` | Described as "used internally"; mentioned in the doc, not used |
| `PermissionMode` | `default`, `acceptEdits`, `bypassPermissions`, `plan`, `dontAsk`, `auto` |

## Step 4: Design the concept

- **Part A: one `query()`, many turns.** A push queue as `prompt`; a `Map` of open sessions; `POST /send` pushes a
  message, even while a turn is running; optional `priority` and image.
- **Part B: change the live session.** One route per control request (`/model`, `/permission-mode`, `/context`), plus
  `supportedModels()` right after start.
- **Part C: generator vs. string.** A scripted `async function*` of three messages compared with a string prompt.
- **The same safety setup as earlier concepts:** `cwd: sandbox/`, `settingSources: []`, `strictMcpConfig: true`,
  Haiku as the default model.
- **A permission demo that needs no UI prompt:** `tools: ["Read","Write","Glob"]` but `allowedTools` without `Write`,
  and no `canUseTool`. Whether `Write` works then depends only on the permission mode.

## Step 5: Test the SDK behavior *before* writing the tab

The UI text makes claims ("the message waits", "`now` interrupts", "string mode can't be controlled"). Instead of
writing them from the docs, two scratch scripts ran against the real SDK with Haiku.

**Experiment 1: a message pushed 1.5 s into a long answer, then `setModel()`** (run three times: no priority,
`"now"`, `"later"`):

| Finding | Effect on the design |
|---|---|
| No priority / `"later"`: the message waited and ran as its own turn afterwards | The UI allows **Send while busy** and shows "n waiting in the queue" |
| `"now"`: the running turn ended in ~10 ms with `result/error_during_execution`, then a new turn started | Added a **Redirect** preset. With "Now just say BANANA" the model went back to counting, so the preset says "**Stop. Instead,** just say BANANA." |
| One `system/init` **per turn**, same `session_id` | The session card counts inits and explains it |
| `setModel()` echoes a `user` message `<local-command-stdout>Set model to …</local-command-stdout>` | The timeline shows it as "Echo from the CLI" |
| A message **already queued** when `setModel()` was called still ran on the old model | Documented in the Tab |
| `total_cost_usd` grew turn after turn: it is a **session total** | The timeline shows "this turn" (the difference) and "session total" |

**Experiment 2: string mode, permission modes, image, context usage:**

| Finding | Effect on the design |
|---|---|
| String prompt: `setModel()` *before* the loop resolved without error, but the turn still ran on Haiku | Documented as "not enforced, just no effect" |
| String prompt: `setModel()` *after* the loop threw `Query closed before response received` | Part C calls `setModel()` after the loop to show this error |
| `default` mode: `Write` → `system/permission_denied` + `permission_denials` | The *Create a file* scenario |
| `setPermissionMode("acceptEdits")` → `system/status` with `permissionMode`, then `Write` succeeded | The timeline shows `system/status`; the Tab explains the before/after |
| `plan` mode: no edit, but a plan file written to `~/.claude/plans/` | Documented as a warning (it writes outside the sandbox) |
| An image block (the sample1 diagram) was described correctly | The image picker |
| `getContextUsage({ detail: "summary" })` returns categories, `totalTokens`, `maxTokens`, `percentage` and a big UI grid | The route keeps only the numbers the tab draws |
| `supportedModels()` returns aliases (`default`, `opus[1m]`, …) | The model `<select>` uses them, after two full model IDs |

## Step 6: Implement it

sample11 was copied into sample12 (with `robocopy`, including `node_modules`), then:

| File | What was done |
|---|---|
| `server/concepts/12-streaming-input.ts` | New router: `userMessage()` (text + optional image + priority), the input queue, the sessions `Map`, a `control()` wrapper (find session → run → `409` on error), the Part A/B routes and `POST /script` |
| `server/index.ts` | Mounted the router on `/api/c12`, and changed `express.json()` to `express.json({ limit: "10mb" })` because base64 images exceed the 100 KB default |
| `src/concepts/Concept12StreamingInput.tsx` | New tab: `LiveSession` (Parts A and B), `PromptStyles` (Part C), a `Timeline` and a `ContextUsage` bar |
| `src/App.tsx` | Added `{ id: 12, title: "Streaming input" }` |
| `src/styles.css` | `.thumb`, `.meter`, `.delegation.warn` |

Two problems were fixed while writing the code:

1. **The string variant lost its last event.** `pipe()` ends the SSE response, so a `send()` after `await pipe(q)`
   would never reach the browser. The control call was moved into a wrapping generator
   (`yield* q; then try setModel()`), so it runs *before* `pipe()` closes the response.
2. **Images through SSE.** Echoing the base64 image back would double the traffic. The server echoes only the file
   name; the browser keeps its own preview, keyed by a `clientId` it sends with the message.

`npx tsc --noEmit -p .` then type-checked `src/` and `server/` with no errors.

## Step 7: Test the routes against the real SDK

Ports 3001 and 5173 were busy (another sample was running), and that process was left alone. So only the Concept 12
router was mounted on port **3012** in a scratch server, and driven like the browser does.

**Part C** (`curl` + a small SSE summary script):

| Variant | Result |
|---|---|
| `generator` | 3 turns, one `session_id`; the third answer was "You're Ana, and you teach TypeScript." Total $0.0050 |
| `string` | 1 turn, then `setModel()` → `Error: Query closed before response received`. Total $0.0020 |

**Parts A and B** (a Node script that opened `/session` and called every control route in order):

| Step | Result |
|---|---|
| *Create hello.txt* in `default` | Denied: `permission_denied`, 1 permission denial |
| `setPermissionMode("acceptEdits")` + *Try again* | `Write` succeeded, `sandbox/hello.txt` = `hi` |
| *Long answer*, then *Redirect* with `priority: "now"` 2.5 s later | `error_during_execution`, then `BANANA` |
| `setModel("claude-sonnet-5")` + *Which model?* | "I'm Claude Sonnet 5.", next `system/init` showed `claude-sonnet-5` |
| Image message | The diagram was described |
| `getContextUsage()` | 6,757 / 1,000,000 tokens (1%) |
| `end`, then `send` again | Loop ended normally; `send` answered `409 No open session` |

The whole live session cost $0.0498. At the end, the scratch server was stopped and `sandbox/hello.txt` was removed
(every new session also deletes it, so the permission demo is repeatable).

## Step 8: Write the explanation

- [Tab12-Streaming-input.md](Tab12-Streaming-input.md) explains the concept in the same format as Tabs 1 to 11: types,
  Parts A/B/C in steps, the tested results, "what to take away", and things to try.
- `Tab1-query().md`: Concept 12 was added to the table of concepts.

## Step 9: The first run in the browser returned 404

The first time the tab was opened, **Start session** failed with
`Failed to load resource: 404 (Not Found) :5174/api/c12/session`.

| Clue | Meaning |
|---|---|
| The page was on port **5174**, not 5173 | sample11's Vite was still using 5173, so Vite picked the next port |
| Port 3001 belonged to a `node --watch … server/index.ts` started by another Claude Code session | sample12's server could not start (port in use) |
| `vite.config.ts` proxies `/api` to `http://localhost:3001` | sample12's page was talking to an **older sample's server**, which has no `/api/c12` routes |

**Fix:** that old server (and its `--watch` parent) was stopped, which frees port 3001. Then restart `npm run dev` in
sample12 so its own server starts. No code was changed. Lesson: stop one sample before starting the next, because they all share port 3001.

## Files added or changed

| File | Change |
|---|---|
| `server/concepts/12-streaming-input.ts` | New: live-session routes, control routes, `/script` |
| `server/index.ts` | Mounts `/api/c12`; JSON body limit 10 MB |
| `src/concepts/Concept12StreamingInput.tsx` | New: the Streaming input tab |
| `src/App.tsx` | Adds the tab |
| `src/styles.css` | Image thumbnail, context meter |
| `Tab1-query().md` | Adds Concept 12 to the table |
| `Tab12-Streaming-input.md` | Explanation of the concept |
| `Build-steps.md` | This file: the steps followed to build it |
| `readme.md` | Same content as `Tab12-Streaming-input.md` |
