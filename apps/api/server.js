import http from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStore } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DIST_DIR = path.resolve(here, "..", "web", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function serveStatic(res, pathname, distDir) {
  const indexFile = path.join(distDir, "index.html");
  if (!existsSync(indexFile)) {
    sendText(
      res,
      503,
      "Build nao encontrado. Rode `yarn build` (ou `yarn start`, que compila antes).",
    );
    return;
  }

  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }

  const relative = path.normalize(decoded).replace(/^[/\\]+/, "");
  const root = path.resolve(distDir);
  let target =
    relative === "" || relative === "." || relative === ".."
      ? indexFile
      : path.resolve(root, relative);

  if (target !== root && !target.startsWith(root + path.sep)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  let data;
  try {
    data = await readFile(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try {
      data = await readFile(indexFile);
      target = indexFile;
    } catch {
      sendText(res, 503, "Build nao encontrado. Rode `yarn build`.");
      return;
    }
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
  });
  res.end(data);
}

export function createServer({
  store = createStore(),
  distDir = DIST_DIR,
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

      if (url.pathname === "/api/habits") {
        if (req.method === "GET") {
          sendJson(res, 200, await store.read());
          return;
        }
        if (req.method === "PUT") {
          let raw;
          try {
            raw = await readBody(req);
          } catch {
            sendJson(res, 413, { error: "payload too large" });
            return;
          }
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            sendJson(res, 400, { error: "invalid JSON" });
            return;
          }
          try {
            sendJson(res, 200, await store.write(parsed));
          } catch (error) {
            sendJson(res, 400, { error: error.message });
          }
          return;
        }
        res.writeHead(405, {
          Allow: "GET, PUT",
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ error: "method not allowed" }));
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        sendJson(res, 404, { error: "not found" });
        return;
      }

      await serveStatic(res, url.pathname, distDir);
    } catch {
      sendJson(res, 500, { error: "internal error" });
    }
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  createServer().listen(port, () => {
    console.log(`Rastreador de habitos em http://localhost:${port}`);
  });
}
