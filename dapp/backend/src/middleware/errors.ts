import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.ts";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `route ${req.method} ${req.path} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "validation failed", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    return;
  }
  logger.error({ err, path: req.path }, "unhandled error");
  res.status(500).json({ error: "internal server error" }); // never leak internals to clients
};
