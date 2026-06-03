import express from "express";
import fetch from "node-fetch";
import { Server } from "socket.io";
import { createServer } from "http";
import { io as ClientIO } from "socket.io-client";

const app = express();
const httpServer = createServer(app);

app.use(express.static("public")); // serve overlay.html

// ---- Beamstream endpoints ----
const BEAM = "https://beamstream.gg";
const SLUG = "givesaminute";

// Fetch channel metadata (optional)
app.get("/api/channel", async (_req, res) => {
  const r = await fetch(`${BEAM}/channel?slug=${SLUG}`);
  res.json(await r.json());
});

// Serve overlay
app.get("/", (_req, res) => {
  res.sendFile(process.cwd() + "/public/overlay.html");
});

// ---- Socket.IO bridge ----
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Connect to Beamstream socket
const beamSocket = ClientIO(`${BEAM}/socket`, {
  transports: ["websocket"],
  path: "/socket/",
  withCredentials: false
});

// Relay Beamstream messages to overlay clients
beamSocket.on("connect", () => {
  console.log("Connected to Beamstream socket");
});

beamSocket.onAny((event, data) => {
  io.emit("chat", { event, data });
});

beamSocket.on("disconnect", () => {
  console.log("Disconnected from Beamstream");
});

// Start server
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  console.log("Overlay running on port", port);
});
