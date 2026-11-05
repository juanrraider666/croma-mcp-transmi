import type { NextFunction, Request, Response } from "express";
import { CromaError } from "../domain/normalize.js";
import { MissingRoute } from "../services/transmilenio.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof MissingRoute) {
    res.status(404).json({ error: { code: "not_found", message: error.message } });
    return;
  }
  if (error instanceof CromaError) {
    const status = error.message.includes("al menos 2") || error.message.includes("no existe") || error.message.includes("válido")
      ? 400
      : 502;
    res.status(status).json({
      error: {
        code: status === 400 ? "bad_request" : "upstream",
        message: error.message,
      },
    });
    return;
  }
  res.status(500).json({
    error: { code: "internal", message: "No pudimos completar la consulta." },
  });
}
