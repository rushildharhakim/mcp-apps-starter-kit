import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = join(__dirname, "..", "dist-views");
const WORKOUT_LOG_PATH = join(homedir(), ".claude-workout-log.json");

function loadView(filename: string): string {
  return readFileSync(join(VIEWS_DIR, filename), "utf-8");
}

const server = new McpServer({
  name: "mcp-apps-starter-kit",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// 1. Budget Tracker
// ---------------------------------------------------------------------------
const BUDGET_URI = "ui://starter-kit/budget.html";

registerAppTool(
  server,
  "render_budget",
  {
    title: "Budget Tracker",
    description:
      "Render a visual budget breakdown with pie chart of spending categories, bar chart of budget vs actual, and surplus/deficit indicator. Pass categories as a JSON array of objects with name, budgeted, and actual fields.",
    inputSchema: {
      categories: z
        .string()
        .describe(
          'JSON array: [{"name":"Rent","budgeted":1500,"actual":1500}, ...]'
        ),
      total_budget: z.number().describe("Total monthly budget amount"),
      title: z.string().optional().describe("Dashboard title"),
    },
    _meta: { ui: { resourceUri: BUDGET_URI } },
  },
  async ({ categories, total_budget, title }) => {
    const parsed = JSON.parse(categories);
    const result = {
      component: "Budget",
      title: title || "Monthly Budget",
      total_budget,
      categories: parsed,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Budget View",
  BUDGET_URI,
  { description: "Interactive budget tracker with charts" },
  async () => ({
    contents: [
      { uri: BUDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("budget.html") },
    ],
  })
);

// ---------------------------------------------------------------------------
// 2. Product/Option Comparison
// ---------------------------------------------------------------------------
const COMPARISON_URI = "ui://starter-kit/comparison.html";

registerAppTool(
  server,
  "render_comparison",
  {
    title: "Product Comparison",
    description:
      "Render a side-by-side comparison of products or options with pros, cons, ratings, and prices. Pass options as a JSON array.",
    inputSchema: {
      options: z
        .string()
        .describe(
          'JSON array: [{"name":"Option A","pros":["Fast","Cheap"],"cons":["Limited"],"rating":4.5,"price":"$999"}, ...]'
        ),
      title: z.string().optional().describe("Comparison title"),
    },
    _meta: { ui: { resourceUri: COMPARISON_URI } },
  },
  async ({ options, title }) => {
    const parsed = JSON.parse(options);
    const result = {
      component: "Comparison",
      title: title || "Comparison",
      options: parsed,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Comparison View",
  COMPARISON_URI,
  { description: "Side-by-side product/option comparison" },
  async () => ({
    contents: [
      { uri: COMPARISON_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("comparison.html") },
    ],
  })
);

// ---------------------------------------------------------------------------
// 3a. Trip Explorer (Phase 1 — destination comparison)
// ---------------------------------------------------------------------------
const TRIP_EXPLORER_URI = "ui://starter-kit/trip-explorer.html";

registerAppTool(
  server,
  "render_trip_explorer",
  {
    title: "Trip Explorer",
    description:
      "Render an interactive destination comparison view where the user can explore 3-5 trip options side by side before committing to a detailed itinerary. Each destination MUST include: name, country, tagline, budget_estimate (low/high in the specified currency), distance_km (from source city), travel_options (object with mode keys like flight/train/drive/bus and duration string values e.g. {\"flight\":\"2h 30m\",\"train\":\"6h\",\"drive\":\"8h\"}), best_months, highlights, travel_style tags, and image_emoji. Use this tool FIRST when a user asks about vacation/trip planning — let them compare destinations before calling render_trip for the detailed itinerary.",
    inputSchema: {
      destinations: z
        .string()
        .describe(
          'JSON array: [{"name":"Goa","country":"India","tagline":"Sun, sand & seafood","budget_estimate":{"low":15000,"high":35000},"distance_km":590,"travel_options":{"flight":"1h 30m","train":"12h","drive":"10h"},"best_months":["Nov","Dec","Jan","Feb"],"highlights":["Baga Beach","Old Goa churches","Dudhsagar Falls","Spice plantations"],"travel_style":["beach","food","nightlife"],"image_emoji":"🏖️"}, ...]'
        ),
      trip_days: z.number().optional().describe("Number of days for the trip"),
      budget: z.number().optional().describe("User's total budget in the specified currency"),
      currency: z.string().optional().describe("Currency code, e.g. INR, USD, EUR. Defaults to USD. Use the currency the user mentions or infer from their location."),
      source: z.string().optional().describe("The user's starting city/location, e.g. 'Mumbai' or 'San Francisco'"),
      title: z.string().optional().describe("Explorer title, e.g. 'Where should you go?'"),
    },
    _meta: { ui: { resourceUri: TRIP_EXPLORER_URI } },
  },
  async ({ destinations, trip_days, budget, currency, source, title }) => {
    const parsed = JSON.parse(destinations);
    const result = {
      component: "TripExplorer",
      title: title || "Where should you go?",
      destinations: parsed,
      trip_days,
      budget,
      currency: currency || "USD",
      source,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Trip Explorer View",
  TRIP_EXPLORER_URI,
  { description: "Interactive destination comparison for trip planning" },
  async () => ({
    contents: [
      { uri: TRIP_EXPLORER_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("trip-explorer.html") },
    ],
  })
);

// ---------------------------------------------------------------------------
// 3b. Trip Planner (Phase 2 — detailed itinerary)
// ---------------------------------------------------------------------------
const TRIP_URI = "ui://starter-kit/trip-planner.html";

registerAppTool(
  server,
  "render_trip",
  {
    title: "Trip Planner",
    description:
      "Render a day-by-day trip itinerary with time slots, locations, costs, and a budget tracker. Pass itinerary as a JSON array of day objects.",
    inputSchema: {
      itinerary: z
        .string()
        .describe(
          'JSON array: [{"day":"Day 1 - Arrival","activities":[{"time":"9:00 AM","activity":"Visit museum","location":"Downtown","cost":25,"notes":"Book online"}]}, ...]'
        ),
      total_budget: z.number().optional().describe("Total trip budget"),
      title: z.string().optional().describe("Trip title"),
    },
    _meta: { ui: { resourceUri: TRIP_URI } },
  },
  async ({ itinerary, total_budget, title }) => {
    const parsed = JSON.parse(itinerary);
    const result = {
      component: "TripPlanner",
      title: title || "Trip Itinerary",
      total_budget,
      itinerary: parsed,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Trip Planner View",
  TRIP_URI,
  { description: "Day-by-day trip itinerary with budget" },
  async () => ({
    contents: [
      { uri: TRIP_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("trip-planner.html") },
    ],
  })
);

// ---------------------------------------------------------------------------
// 4. Workout Plan
// ---------------------------------------------------------------------------
const WORKOUT_URI = "ui://starter-kit/workout-plan.html";

registerAppTool(
  server,
  "render_workout",
  {
    title: "Workout Plan",
    description:
      "Render an interactive workout plan with dark theme, summary metrics, expandable exercise cards with tips and video links, progress tracking, and history. Pass plan as a JSON array of week objects. IMPORTANT: Each exercise MUST include video_url with a real YouTube link to a proper form demonstration video. Also include estimated_calories, duration_minutes, and tips (array of form cue strings).",
    inputSchema: {
      plan: z
        .string()
        .describe(
          'JSON array: [{"week":"Week 1","days":[{"day":"Monday","focus":"Upper Body","exercises":[{"name":"Bench Press","sets":3,"reps":"10","rest":"90s","muscle_group":"chest","estimated_calories":80,"duration_minutes":8,"tips":["Keep elbows at 45 degrees","Drive feet into floor"],"video_url":"https://youtube.com/..."}]}]}]'
        ),
      title: z.string().optional().describe("Plan title"),
      estimated_total_calories: z.number().optional().describe("Estimated total calories for the full program"),
      estimated_total_duration: z.number().optional().describe("Estimated total duration in minutes"),
    },
    _meta: { ui: { resourceUri: WORKOUT_URI } },
  },
  async ({ plan, title, estimated_total_calories, estimated_total_duration }) => {
    const parsed = JSON.parse(plan);
    const result = {
      component: "WorkoutPlan",
      title: title || "Workout Plan",
      plan: parsed,
      estimated_total_calories,
      estimated_total_duration,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Workout Plan View",
  WORKOUT_URI,
  { description: "Weekly workout calendar with exercise details" },
  async () => ({
    contents: [
      { uri: WORKOUT_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("workout-plan.html") },
    ],
  })
);

// Workout progress tracking tools (called from iframe via app.callServerTool)
server.tool(
  "save_workout_log",
  "Save a completed workout session to the log file",
  {
    date: z.string().describe("ISO date string"),
    week: z.string().describe("Week label"),
    day: z.string().describe("Day label"),
    exercises: z.string().describe("JSON array of completed exercises with actual weights/reps"),
    notes: z.string().optional().describe("Optional session notes"),
  },
  async ({ date, week, day, exercises, notes }) => {
    let log: any[] = [];
    if (existsSync(WORKOUT_LOG_PATH)) {
      try { log = JSON.parse(readFileSync(WORKOUT_LOG_PATH, "utf-8")); } catch { log = []; }
    }
    // Upsert: replace existing entry for same week+day, or append if new
    const existingIdx = log.findIndex((e: any) => e.week === week && e.day === day);
    const entry = { date, week, day, exercises: JSON.parse(exercises), notes, timestamp: new Date().toISOString() };
    if (existingIdx >= 0) {
      log[existingIdx] = entry;
    } else {
      log.push(entry);
    }
    writeFileSync(WORKOUT_LOG_PATH, JSON.stringify(log, null, 2));
    return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, totalSessions: log.length }) }] };
  }
);

server.tool(
  "get_workout_log",
  "Retrieve workout history from the log file",
  {},
  async () => {
    let log: any[] = [];
    if (existsSync(WORKOUT_LOG_PATH)) {
      try { log = JSON.parse(readFileSync(WORKOUT_LOG_PATH, "utf-8")); } catch { log = []; }
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(log) }] };
  }
);

// ---------------------------------------------------------------------------
// 5. Decision Matrix
// ---------------------------------------------------------------------------
const DECISION_URI = "ui://starter-kit/decision-matrix.html";

registerAppTool(
  server,
  "render_decision_matrix",
  {
    title: "Decision Matrix",
    description:
      "Render a weighted decision matrix comparing options across criteria with scores, heatmap coloring, and a best-pick recommendation. Pass options and criteria as JSON arrays.",
    inputSchema: {
      options: z
        .string()
        .describe(
          'JSON array: [{"name":"Option A","scores":{"Price":8,"Location":7,"Space":9}}, ...]'
        ),
      criteria: z
        .string()
        .describe(
          'JSON array: [{"name":"Price","weight":3},{"name":"Location","weight":2}, ...]'
        ),
      title: z.string().optional().describe("Decision title"),
    },
    _meta: { ui: { resourceUri: DECISION_URI } },
  },
  async ({ options, criteria, title }) => {
    const parsedOptions = JSON.parse(options);
    const parsedCriteria = JSON.parse(criteria);
    const result = {
      component: "DecisionMatrix",
      title: title || "Decision Matrix",
      options: parsedOptions,
      criteria: parsedCriteria,
    };
    return {
      structuredContent: result,
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

registerAppResource(
  server,
  "Decision Matrix View",
  DECISION_URI,
  { description: "Weighted decision matrix with heatmap and rankings" },
  async () => ({
    contents: [
      { uri: DECISION_URI, mimeType: RESOURCE_MIME_TYPE, text: loadView("decision-matrix.html") },
    ],
  })
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Apps Starter Kit server running on stdio");
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

main().catch(console.error);
