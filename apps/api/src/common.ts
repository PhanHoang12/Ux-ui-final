import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { Response } from "express";
export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : error instanceof ZodError
          ? 400
          : 500;
    const raw = error instanceof HttpException ? error.getResponse() : null;
    const body =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        error: {
          code: body?.code ?? (status === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
          message: body?.message ?? "Không thể xử lý yêu cầu.",
        },
        requestId: randomUUID(),
      });
  }
}
