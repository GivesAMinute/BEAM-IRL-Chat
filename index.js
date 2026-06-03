import express from "express";
import fetch from "node-fetch";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const BEAM_ORIGIN = "https://beamstream.gg";
const CHANNEL_SLUG = "givesaminute";

// Simple health check
app.get("/", (_req, res) => {
  res.send("BEAM IRL Chat proxy is running");
});

// ---- HTML + CSS injection for /chat ----
app.get("/chat", async (_req, res) => {
  try {
    const url = `${BEAM_ORIGIN}/${CHANNEL_SLUG}/chat`;
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("Upstream HTML error:", upstream.status, text.slice(0, 500));
      return res.status(502).send("Failed to load Beamstream chat");
    }

    let html = await upstream.text();

    // Inject CSS just before </head>
    const injection = `
<style>
  /* Make background transparent */
  body, html {
    background: transparent !important;
  }
  #root, #__next {
    background: transparent !important;
  }
</style>
`;
    html = html.replace("</head>", `${injection}</head>`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).send("Internal proxy error");
  }
});

// ---- Proxy Beamstream APIs ----
// These paths are based on what you captured: user-beam, channel, emotes, time, socket

const apiProxy = createProxyMiddleware({
  target: BEAM_ORIGIN,
  changeOrigin: true,
  ws: true,
  logLevel: "warn",
  headers: {
    Origin: BEAM_ORIGIN,
    Referer: `${BEAM_ORIGIN}/${CHANNEL_SLUG}/chat`,
  },
});

app.use("/user-beam", apiProxy);
app.use("/channel", apiProxy);
app.use("/emotes", apiProxy);
app.use("/time", apiProxy);
app.use("/socket", apiProxy);

// ---- Static assets (JS/CSS/etc.) ----
app.use(
  "/assets",
  createProxyMiddleware({
    target: BEAM_ORIGIN,
    changeOrigin: true,
    logLevel: "warn",
    headers: {
      Origin: BEAM_ORIGIN,
      Referer: `${BEAM_ORIGIN}/${CHANNEL_SLUG}/chat`,
    },
  })
);

// Fallback: anything else → Beamstream root (safe default)
app.use(
  "/",
  createProxyMiddleware({
    target: BEAM_ORIGIN,
    changeOrigin: true,
    ws: true,
    logLevel: "warn",
  })
);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Proxy listening on port ${port}`);
});
