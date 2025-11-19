// dev-server-setup.js
// Custom middleware utilities for local development

const fs = require("fs");
const path = require("path");
const express = require("express");

/**
 * Development middleware configuration for webpack-dev-server.
 * This version has been rewritten to remove unused or environment-specific logic.
 */
function setupDevServer(config) {
  config.setupMiddlewares = (middlewares, devServer) => {
    if (!devServer) throw new Error("webpack-dev-server not defined");
    devServer.app.use(express.json());

    /**
     * Simple CORS validation for local development.
     * Allows localhost access only.
     */
    const isAllowedOrigin = (origin) => {
      if (!origin) return false;
      return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    };

    // Health check route
    devServer.app.get("/ping", (req, res) => {
      res.json({ status: "ok", time: new Date().toISOString() });
    });
    devServer.app.post("/edit-file", (req, res) => {
      const origin = req.get("Origin");
      if (origin && isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Headers", "Content-Type");
      }

      const { filePath, content } = req.body;

      if (!filePath || typeof content !== "string") {
        return res.status(400).json({ error: "Invalid file payload" });
      }

      try {
        const absolutePath = path.resolve(
          __dirname,
          "../../",
          filePath.replace(/^\/+/, "")
        );

        const projectRoot = path.resolve(__dirname, "../../");

        // Prevent escaping project folder
        if (
          !absolutePath.startsWith(projectRoot) ||
          absolutePath.includes("node_modules")
        ) {
          return res.status(403).json({ error: "Forbidden path" });
        }

        fs.writeFileSync(absolutePath, content, "utf8");

        res.json({ status: "updated", file: filePath });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // CORS preflight
    devServer.app.options("/edit-file", (req, res) => {
      const origin = req.get("Origin");
      if (origin && isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.sendStatus(200);
      } else {
        res.sendStatus(403);
      }
    });

    return middlewares;
  };
  return config;
}

module.exports = setupDevServer;
