# MCP Apps Starter Kit

5 interactive UI components for Claude Desktop, built with the [MCP Apps SDK](https://github.com/anthropics/model-context-protocol). Each tool renders a rich, interactive view inside Claude's chat — not just text, but real React UIs with charts, forms, and bidirectional communication.

## The 5 Apps

| Tool | What it renders | Try it |
|------|----------------|--------|
| `render_budget` | Pie chart + bar chart of spending categories with surplus/deficit tracking | *"Help me plan a $5K monthly budget"* |
| `render_comparison` | Side-by-side cards with pros/cons, ratings, and "Best Pick" badge | *"Compare MacBook Air M3 vs ThinkPad X1 Carbon"* |
| `render_trip` | Day-by-day itinerary with time slots, costs, and budget tracker | *"Plan a 4-day trip to Lisbon on a $2K budget"* |
| `render_workout` | Interactive workout plan with progress tracking, video links, and history | *"Give me a 4-week strength training plan"* |
| `render_decision_matrix` | Weighted criteria table with heatmap scoring and rankings | *"Help me decide between 3 apartments"* |

## Workout Plan — Deep Dive

The workout component demonstrates advanced MCP Apps patterns:

- **Dark theme** with monochromatic zinc palette + blue accent
- **Expandable exercise cards** with form cues, sets/reps tracking, and muscle group indicators
- **Progress tracking** — check off exercises, log weights/reps, save sessions to disk via `save_workout_log` MCP tool
- **History** — persisted across sessions in `~/.claude-workout-log.json`, with upsert (no duplicates)
- **Batch modifications** — stage multiple exercise tweaks, send all at once to Claude via `app.sendMessage()`
- **Video links** — auto-requests YouTube form guides on first load, opens via `app.openLink()`
- **Bidirectional chat** — the widget talks back to Claude: modify exercises, request videos, regenerate plans

## Quick Start

```bash
# Clone
git clone https://github.com/rushildharhakim/mcp-apps-starter-kit.git
cd mcp-apps-starter-kit

# Install & build
npm install --legacy-peer-deps
npm run build

# Add to Claude Desktop
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
```

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "starter-kit": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-apps-starter-kit/dist/server.js"]
    }
  }
}
```

Restart Claude Desktop. Try any of the example prompts above.

## Architecture

```
User prompt → Claude → calls render_* tool → MCP server returns structuredContent
                                                    ↓
                                           Claude Desktop loads HTML resource
                                                    ↓
                                           React view renders in sandboxed iframe
                                                    ↓
                                           View receives data via ontoolresult
                                                    ↓
                                           User interacts → app.sendMessage() → Claude
```

Each view is a self-contained React app bundled into a single HTML file via Vite + `vite-plugin-singlefile`. The MCP server registers both a **tool** (to receive structured data) and a **resource** (to serve the HTML view).

### Key SDK APIs Used

| API | What it does |
|-----|-------------|
| `registerAppTool()` | Registers a tool that returns `structuredContent` + links to a UI resource |
| `registerAppResource()` | Serves the HTML view file to Claude Desktop |
| `useApp()` + `ontoolresult` | React hook to receive tool result data in the iframe |
| `app.callServerTool()` | Calls MCP server tools from the iframe (e.g., save workout log) |
| `app.sendMessage()` | Injects a message into Claude's conversation from the iframe |
| `app.openLink()` | Opens external URLs in the default browser (bypasses iframe sandbox) |

## File Structure

```
mcp-apps-starter-kit/
  src/
    server.ts                          # MCP server — 5 tools + 5 resources + 2 utility tools
    views/
      shared/styles.ts                 # Inline style helpers
      BudgetView.tsx                   # Pie + bar charts (Recharts)
      ComparisonView.tsx               # Side-by-side comparison grid
      TripPlannerView.tsx              # Day-by-day itinerary cards
      WorkoutPlanView.tsx              # Interactive workout tracker
      DecisionMatrixView.tsx           # Weighted decision matrix + heatmap
      *.html                           # Entry points for each view
  package.json
  tsconfig.json
  vite.config.ts
```

## Tech Stack

- **MCP SDK**: `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`
- **React 19** with inline styles (no CSS framework needed in sandboxed iframes)
- **Recharts** for pie/bar/line charts
- **Vite** + `vite-plugin-singlefile` for bundling views into self-contained HTML
- **TypeScript** for the server, JSX for views

## License

MIT
