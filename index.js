import express from "express";
import fetch from "node-fetch";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";

const app = express();
const httpServer = createServer(app);

// Serve static files (overlay.html lives in /public)
app.use(express.static("public"));

// ---- Serve the overlay at root ----
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/overlay.html");
});

// ---- Beamstream constants ----
const BEAM = "https://beamstream.gg";
const SLUG = "givesaminute";

// Optional: expose channel metadata
app.get("/api/channel", async (_req, res) => {
  try {
    const r = await fetch(`${BEAM}/channel?slug=${SLUG}`);
    res.json(await r.json());
  } catch (err) {
    console.error("Channel fetch error:", err);
    res.status(500).json({ error: "Failed to fetch channel" });
  }
});

// ---- Socket.IO server for overlay clients ----
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ---- Connect to Beamstream WebSocket ----
const beamSocket = ClientIO(`${BEAM}/socket`, {
  transports: ["websocket"],
  path: "/socket/",
  withCredentials: false
});

beamSocket.on("connect", () => {
  console.log("Connected to Beamstream WebSocket");
});

beamSocket.onAny((event, data) => {
  // Relay all Beamstream events to overlay clients
  io.emit("chat", { event, data });
});

beamSocket.on("disconnect", () => {
  console.log("Disconnected from Beamstream WebSocket");
});

// ---- Start server ----
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  console.log(`Overlay running on port ${port}`);
});
