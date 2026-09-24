import { useState } from "react";
import { Concept01Query } from "./concepts/Concept01Query";
import { Concept02Options } from "./concepts/Concept02Options";
import { Concept03Tools } from "./concepts/Concept03Tools";
import { Concept04Permissions } from "./concepts/Concept04Permissions";
import { Concept05CustomTools } from "./concepts/Concept05CustomTools";
import { Concept06Sessions } from "./concepts/Concept06Sessions";
import { Concept07Hooks } from "./concepts/Concept07Hooks";
import { Concept08Subagents } from "./concepts/Concept08Subagents";
import { Concept09SystemPrompts } from "./concepts/Concept09SystemPrompts";
import { Concept10StructuredInterrupt } from "./concepts/Concept10StructuredInterrupt";
import { Concept11Skills } from "./concepts/Concept11Skills";
import { Concept12StreamingInput } from "./concepts/Concept12StreamingInput";
import { Concept13McpServers } from "./concepts/Concept13McpServers";

// Each new concept adds one entry here.
const concepts = [
  { id: 1, title: "query()", Component: Concept01Query },
  { id: 2, title: "Options", Component: Concept02Options },
  { id: 3, title: "Built-in tools", Component: Concept03Tools },
  { id: 4, title: "Permissions", Component: Concept04Permissions },
  { id: 5, title: "Custom tools", Component: Concept05CustomTools },
  { id: 6, title: "Sessions", Component: Concept06Sessions },
  { id: 7, title: "Hooks", Component: Concept07Hooks },
  { id: 8, title: "Subagents", Component: Concept08Subagents },
  { id: 9, title: "System prompts", Component: Concept09SystemPrompts },
  { id: 10, title: "Structured output & interrupt", Component: Concept10StructuredInterrupt },
  { id: 11, title: "Skills", Component: Concept11Skills },
  { id: 12, title: "Streaming input", Component: Concept12StreamingInput },
  { id: 13, title: "MCP servers", Component: Concept13McpServers },
];

export function App() {
  const [active, setActive] = useState(concepts[0].id);
  const Current = concepts.find((c) => c.id === active)!.Component;
  return (
    <main>
      <h1>Claude Agent SDK Lab</h1>
      <nav>
        {concepts.map((c) => (
          <button key={c.id} className={c.id === active ? "active" : ""} onClick={() => setActive(c.id)}>
            {c.id}. {c.title}
          </button>
        ))}
      </nav>
      <Current />
    </main>
  );
}
