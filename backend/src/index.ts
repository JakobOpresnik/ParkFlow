import "dotenv/config";

import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { startTimesheetWs } from "./lib/timesheetWs.js";
import { freeOrphanedReservedSpots } from "./routes/bookings.js";

const PORT = process.env.PORT ?? 3001;

const app = createApp();

app.listen(PORT, async () => {
  console.log(`ParkFlow backend listening on http://localhost:${PORT}`);

  try {
    // Run database migrations on startup
    await runMigrations();

    await freeOrphanedReservedSpots();

    // Connect to Abelium timesheet WebSocket for real-time parking-availability updates
    startTimesheetWs();
  } catch (err) {
    console.error("[startup] initialization failed:", err);
  }
});
