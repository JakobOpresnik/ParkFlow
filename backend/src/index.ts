import "dotenv/config";

import { createApp } from "./app.js";

const PORT = process.env.PORT ?? 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`ParkFlow backend listening on http://localhost:${PORT}`);
});
