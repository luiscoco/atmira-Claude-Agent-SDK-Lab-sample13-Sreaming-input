# External MCP servers

This file describes the **steps followed** to add Concept 13 (**External MCP servers**) to the Claude Agent SDK Lab:
what was read, what was decided, how it was tested, and what the tests changed.
To learn the concept itself, read [Tab13-MCP-servers.md](Tab13-MCP-servers.md).

| Concept | Topic | Routes | Explanation |
|---|---|---|---|
| 13 | External MCP servers: `stdio`, `http`, status, `toggleMcpServer()`, `reconnectMcpServer()`, `setMcpServers()` | `/api/c13/query`, `/session`, `/send`, `/status`, `/toggle`, `/reconnect`, `/set-servers`, `/end`, `/mcp` | [Tab13-MCP-servers.md](Tab13-MCP-servers.md) |

## How to run it

```powershell
npm run dev        # server on http://localhost:3001, web on the Vite port
```

`node_modules` was copied from sample12, so `npm install` is not needed. Open the **13. MCP servers** tab.

> **Only one sample can run at a time.** Every sample's server uses port **3001**, and this concept's http MCP server
> and stdio log URL point at `http://localhost:3001` too. Stop the other samples' `npm run dev` first.

## Step 1: Choose the feature

The request again said "implement the following feature" with no feature text. `sample13/` was a copy of sample12.
The three topics offered were **External MCP servers** (left over from the sample12 shortlist), **Cost & usage
tracking** and **Plugins**. **External MCP servers** was chosen.

## Step 2: Read the existing samples

| Read | To learn |
|---|---|
| `server/concepts/05-custom-tools.ts`, `Concept05CustomTools.tsx`, `Tab5-Custom-tools.md` | The in-process (`sdk`) servers this concept is compared with; the tool-call and `system/init` cards |
| `server/concepts/12-streaming-input.ts`, `Tab12-Streaming-input.md` | The input queue, the sessions `Map` and the `control()` wrapper, reused for Part B |
| `server/index.ts`, `server/sse.ts`, `src/App.tsx`, `src/styles.css` | Mounting a router, SSE, the tab list, CSS to reuse |

## Step 3: Check the types

- `sdk.d.ts` (`0.3.281`): `McpStdioServerConfig`, `McpHttpServerConfig`, `McpSSEServerConfig`, `McpServerStatus`
  (five statuses, `source`, `error`, `tools`, `config`), and on `Query`: `mcpServerStatus()`, `toggleMcpServer()`,
  `reconnectMcpServer()`, `setMcpServers()`.
- `@modelcontextprotocol/sdk` `1.30.1` was already in `node_modules` (a dependency of the Agent SDK), with
  `McpServer.registerTool()`, `StdioServerTransport` and `StreamableHTTPServerTransport`, and zod 4 support. It was
  added to `package.json` as a direct dependency, because the lab now imports it.

## Step 4: Design the concept

- **Real servers, written in the lab**, so nothing depends on the internet or on `npx` downloads:
  `mcp-servers/notes-server.ts` (stdio, a separate program) and `/api/c13/mcp` (Streamable HTTP, stateless,
  bearer token).
- **Two servers for the failure cases**: `broken` (a command that doesn't exist) and the inventory server with a
  wrong or missing token.
- **`clock` (sdk)** in the same picker, to compare with Concept 5.
- **Make the servers visible.** Their activity doesn't appear in the SDK message stream, so they report it: the notes
  process POSTs to `/api/c13/log` (its URL arrives through `env`), the http route logs every JSON-RPC method and
  status, and an `EventEmitter` forwards both as `mcp_log` SSE events.
- **Part B on the Concept 12 session pattern**, with one route per control method.
- **The same safety setup as before**: `cwd: sandbox/`, `settingSources: []`, `strictMcpConfig: true`, `tools: []`,
  Haiku.

## Step 5: Implement it

| File | What was done |
|---|---|
| `mcp-servers/notes-server.ts` | New: `list_notes`, `search_notes`, `server_process`; logs to `LAB_LOG_URL`; stderr only |
| `server/concepts/13-mcp-servers.ts` | New: inventory server + `/mcp`, `/log`, `/stock`, `serverConfig()`, `/query`, the session and control routes |
| `server/index.ts` | Mounted on `/api/c13` |
| `src/concepts/Concept13McpServers.tsx` | New: `OneQuery` (Part A), `LiveServers` + `Timeline` (Part B) |
| `src/App.tsx`, `src/styles.css` | The tab; transport tags and status badges |
| `tsconfig.json`, `package.json` | `mcp-servers/` type-checked; `@modelcontextprotocol/sdk` declared |

`npx tsc --noEmit -p .` passed, and `npx vite build` succeeded.

## Step 6: Test against the real SDK

Only the Concept 13 router was mounted in a scratch server on port **3013** (`LAB_PORT=3013`) and driven by small
Node scripts, like the browser does. Three problems with the *scratch* server (not the lab) were fixed on the way:
a `.ts` file outside the package became CommonJS (renamed to `.mts`), and absolute Windows paths need `file://` URLs
in ESM (`pathToFileURL`).

**Part A** worked the first time. What the runs showed, and what it changed:

| Finding | Effect |
|---|---|
| Claude Code sends `server/discover` first (400 from this server), then `initialize` | Shown in the timeline; explained in the Tab |
| The stdio child's cwd is `options.cwd`, and its parent is the Claude Code process | `server_process` returns both; scenario 1 asks for them |
| `env` is **merged** with the inherited environment (`ANTHROPIC_API_KEY: true`) | A warning in the Tab: only run stdio servers you trust |
| `source: "dynamic"` for configs, `"sdk"` for in-process | Shown in the status badges |
| 401 → `failed` (not `needs-auth`), and the run still ends in `result/success` | Scenario 3's hint; the "check `mcp_servers` yourself" lesson |
| An external tool outside `allowedTools` → `permission_denied` | Scenario 5 |

**Part B** (one live session, every control in order): `pending` right after start, `failed` with
`error: "Connection closed"` for `broken`, `disabled` after toggling, a new http handshake when re-enabled, a new pid
after `reconnectMcpServer("notes")`, and `reconnectMcpServer("broken")` throwing.

**`setMcpServers()`**: a separate script called it five times. The result disproved the first code comment
("replaces the SDK-given set"). Servers from `options.mcpServers` stay until a call names them, and after that they
belong to the managed set. The comment and the Tab were corrected.

Costs with Haiku: $0.0024 to $0.0076 per Part A run, $0.0289 for the whole Part B session.

## Step 7: Run it in the real app

The real app (`npm run dev`) served scenario 4 through the Vite proxy: `notes` connected, `broken` failed,
`list_notes` ran. Port 5173 was taken by another process, so Vite used 5174; the proxy still reached this sample's
server on 3001. The dev processes were stopped afterwards.

## Files added or changed

| File | Change |
|---|---|
| `mcp-servers/notes-server.ts` | New: the stdio MCP server |
| `server/concepts/13-mcp-servers.ts` | New: the http MCP server, configs, Part A and Part B routes |
| `server/index.ts` | Mounts `/api/c13` |
| `src/concepts/Concept13McpServers.tsx` | New: the MCP servers tab |
| `src/App.tsx`, `src/styles.css` | Tab, transport tags, status badges |
| `package.json`, `tsconfig.json` | MCP SDK dependency, `mcp-servers/` in the type check |
| `Tab1-query().md` | Adds Concept 13 to the table |
| `Tab13-MCP-servers.md` | Explanation of the concept |
| `Build-steps.md` | This file |
| `readme.md` | Same content as `Tab13-MCP-servers.md` |
