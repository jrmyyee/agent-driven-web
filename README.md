# agent-driven-web

> **Same upstream AI analysis. Two visitor classes. Two surfaces.**

A personalised **GitHub Wrapped** built on the **json-render** pattern: the model picks the composition (which cards, what order), but only from typed React components that are already shipped. JSON says what to render; the app decides how.

A human visitor of `/v/[handle]` gets a *Wrapped*-style UI — cards selected by AI based on what's most interesting in the GitHub user's public data.

An agent visitor of the same URL (via the sibling `/v/[handle]/mcp` MCP endpoint or `application/intent+json`) gets the same analysis as structured intent — the agent doesn't have to reverse-engineer cards, it consumes findings.

The contribution is the framing: the open web has a non-human visitor class, and the rendering layer should know it.

## Demo

[agent-driven-web.vercel.app/v/jrmyyee](https://agent-driven-web.vercel.app/v/jrmyyee) — or try any public GitHub handle at `/v/[handle]`.

## Agent surface

The same URL serves agents structured data directly. Send `Accept: application/intent+json`:

```bash
curl -H "Accept: application/intent+json" https://agent-driven-web.vercel.app/v/jrmyyee | jq
```

Or via the sibling MCP endpoint at `/v/[handle]/mcp` (Streamable HTTP, `mcp-handler`).

## Stack

- **Next.js 16** + **Vercel**
- **AI SDK 6** + **AI Gateway**
- **shadcn/ui** + **Tailwind 4**
- **`mcp-handler` + `@modelcontextprotocol/sdk`**

## Repo structure

- `web/` — the Next.js app (human surface + agent surfaces)
- `agent-harness/` — benchmark methodology comparing the structured-intent path against HTML-scraping for agent consumers
- `slides/` — talk deck (PDF)

## Architecture

```
GitHub handle
    │
    ▼
GitHub API fetch (server-side PAT, parallel)
    │
    ▼
Analysis layer (AI SDK 6 generateText + Output.object → typed GitHubAnalysis + renderPlan)
    │
    ├─→ Human surface: render plan chooses typed React components
    └─→ Agent surface: MCP endpoint + application/intent+json serve structured findings
```

## Quick start

```bash
cd web
npm install
cp ../.env.example .env.local && $EDITOR .env.local
npm run dev   # → http://127.0.0.1:3000
```

Without `AI_GATEWAY_API_KEY` set, the analysis falls back to a deterministic synthesiser, so the demo still renders without AI credentials.

## License

MIT.
