---
name: graphify
description: Turn any folder of code, SQL schemas, docs, papers, images, or videos into a queryable knowledge graph. Maps your entire project into a graph you can query instead of grepping through files.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: architecture-analysis
---

## What I do

- Map your entire project (code, docs, PDFs, images, videos) into a knowledge graph
- Generate three files: `graph.html` (interactive visualization), `GRAPH_REPORT.md` (highlights), and `graph.json` (full graph data)
- Extract surprising connections, god nodes, and suggested questions
- Support 31+ programming languages via tree-sitter AST parsing
- Cluster and analyze code relationships with community detection

## When to use me

Use this when you need to:
- Understand a large or unfamiliar codebase quickly
- Find hidden connections between modules or components
- Generate architecture documentation automatically
- Query the codebase semantically instead of searching files

## How to use

1. Install graphify: `uv tool install graphifyy` or `pip install graphifyy`
2. Run: `graphify .` to build a graph for the current folder
3. View output in `graphify-out/` directory:
   - `graph.html` - Open in browser for interactive exploration
   - `GRAPH_REPORT.md` - Read the highlights and key insights
   - `graph.json` - Query programmatically

## Common commands

```
graphify .                        # Build graph for current folder
graphify ./docs --update          # Re-extract only changed files
graphify . --no-viz               # Skip HTML, just report + JSON
graphify query "what connects auth to database?"  # Query the graph
graphify path "UserService" "DatabasePool"        # Find connections
graphify explain "RateLimiter"                     # Explain a concept
```

## Team setup

Commit `graphify-out/` to git so everyone on the team starts with a map. Add to `.gitignore`:
- `graphify-out/manifest.json` (mtime-based)
- `graphify-out/cost.json` (local only)

## Privacy

- Code files processed locally via tree-sitter - nothing leaves your machine
- Docs/PDFs sent to your AI assistant for semantic extraction
- No telemetry, no usage tracking, no analytics
