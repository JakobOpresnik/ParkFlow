import "dotenv/config";

import { createApp } from "./app.js";
import { freeOrphanedReservedSpots } from "./routes/bookings.js";

const PORT = process.env.PORT ?? 3001;

const app = createApp();

app.listen(PORT, async () => {
  console.log(`ParkFlow backend listening on http://localhost:${PORT}`);

  try {
    await freeOrphanedReservedSpots();
  } catch (err) {
    console.error("[startup] Failed to clean up orphaned reserved spots:", err);
  }
});
