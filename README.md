# MCP Apps Starter Kit

I built these 5 mini apps for my own daily use inside Claude Desktop — budgeting, comparing products, planning trips, tracking workouts, and making decisions. They turned out to be genuinely useful, so I'm putting them out here for anyone to explore, remix, or use as a starting point for their own MCP Apps.

Each app renders as a real interactive UI right inside Claude's chat — not just text, but React components with charts, forms, progress tracking, and two-way communication with Claude. If you've ever wished Claude could show you something visual instead of just describing it, this is what that looks like.

Built with the [MCP Apps SDK](https://github.com/anthropics/model-context-protocol).

---

## The 5 Apps

### Workout Tracker
> *"Give me a 4-week strength training plan"*

This is the app I've spent the most time on — it's the most feature-rich and thoroughly tested of the five. It demonstrates what's really possible with MCP Apps:

- **Dark theme** with a clean zinc + blue palette
- **Expandable exercise cards** with form cues, sets/reps, and muscle group indicators
- **Progress tracking** — check off exercises, log actual weights/reps, save to disk
- **Persistent history** — saved to `~/.claude-workout-log.json`, with automatic dedup
- **Video references** — auto-fetches YouTube form guides and opens them via `app.openLink()`
- **Batch modifications** — tweak multiple exercises, send all changes to Claude at once
- **Bidirectional chat** — the app talks back to Claude to modify plans, request videos, or regenerate

<!-- ![Workout Tracker in Claude Desktop](screenshots/workout.png) -->

### Trip Planner
> *"I'm in Mumbai and want a 5-day vacation with a ₹50,000 budget — show me some options"*

A two-phase trip planning experience. **Phase 1 (Trip Explorer)** shows 3-5 destination options side by side with:

- **Distance + travel modes** — km away, with flight/train/drive durations from your city
- **Weather** — expected temperature range and conditions
- **Budget fit** — color-coded against your budget (green/yellow/red)
- **Adjustable sliders** — change budget or trip duration, hit "Refresh options" to regenerate
- **Multi-select** — pick up to 2 destinations to compare detailed itineraries side by side
- **Currency support** — INR, USD, EUR, etc. with proper formatting

**Phase 2 (Itinerary)** renders a day-by-day plan where you can:

- **Swap or remove** individual activities with one tap
- **Comment** on any activity with specific feedback
- **Adjust trip style** — quick chips like "More relaxed", "Foodie focus", or type your own
- **Queue changes** and send them all to Claude at once to regenerate

<!-- ![Trip Explorer in Claude Desktop](screenshots/trip-explorer.png) -->
<!-- ![Trip Planner in Claude Desktop](screenshots/trip.png) -->

---

*The following 3 apps are work-in-progress — they render and are functional, but haven't been as heavily tested or polished. Feel free to try them out and iterate on them.*

### Budget Planner (WIP)
> *"Help me plan a $5K monthly budget"*

Pie chart + bar chart breakdown of spending categories with surplus/deficit tracking. I use this whenever I want to sanity-check how I'm allocating money across categories.

<!-- ![Budget Planner in Claude Desktop](screenshots/budget.png) -->

### Product Comparison (WIP)
> *"Compare MacBook Air M3 vs ThinkPad X1 Carbon"*

Side-by-side cards with pros/cons, star ratings, and a "Best Pick" badge. Great for any time you're weighing two or more options — laptops, tools, services, whatever.

<!-- ![Product Comparison in Claude Desktop](screenshots/comparison.png) -->

### Decision Matrix (WIP)
> *"Help me decide between 3 apartments"*

Weighted criteria table with heatmap-style scoring and automatic rankings. I use this for any multi-factor decision — it forces you to think about what actually matters.

<!-- ![Decision Matrix in Claude Desktop](screenshots/decision.png) -->

---

## Screenshots

*Coming soon — I'll add screenshots showing each app running inside Claude Desktop so you can see what these look like in practice before you install them.*

To add your own screenshots:
1. Take a screenshot of each app in Claude Desktop
2. Save them in a `screenshots/` folder
3. Uncomment the image lines in this README

---

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

## How It Works

```
You type a prompt → Claude calls a render_* tool → MCP server returns structured data + UI
                                                          ↓
                                                 Claude Desktop loads the HTML view
                                                          ↓
                                                 React app renders in a sandboxed iframe
                                                          ↓
                                                 You interact → app talks back to Claude
```

Each view is a self-contained React app bundled into a single HTML file via Vite + `vite-plugin-singlefile`. The MCP server registers both a **tool** (to receive structured data from Claude) and a **resource** (to serve the HTML view to Claude Desktop).

### Key SDK Patterns

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
    server.ts                          # MCP server — 6 tools + 6 resources + 2 utility tools
    views/
      shared/styles.ts                 # Inline style helpers
      BudgetView.tsx                   # Pie + bar charts (Recharts)
      ComparisonView.tsx               # Side-by-side comparison grid
      TripExplorerView.tsx             # Destination comparison + selection (Phase 1)
      TripPlannerView.tsx              # Interactive day-by-day itinerary (Phase 2)
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
