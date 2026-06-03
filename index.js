import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/", (req, res) => {
  res.send("BEAM IRL Chat proxy is running");
});

app.get("/chat", async (req, res) => {
  try {
    const target = "https://beamstream.gg/givesaminute/chat";

    const html = await fetch(target).then(r => r.text());

    const injectedCSS = `
      <style>
        html, body {
          background: transparent !important;
        }
        #root, .app, .container {
          background: transparent !important;
        }
      </style>
    `;

    const modified = html.replace("</head>", `${injectedCSS}</head>`);

    res.send(modified);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("BEAM IRL Chat listening on port", port);
});
