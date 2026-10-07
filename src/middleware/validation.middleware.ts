import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

/**
 * Middleware to validate query parameters with Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const parsed = schema.parse(request.query);
      (request as any).validatedQuery = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      throw error;
    }
  };
}

/**
 * Middleware to validate request params with Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const parsed = schema.parse(request.params);
      (request as any).validatedParams = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      throw error;
    }
  };
}

/**
 * Middleware to validate request body with Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const parsed = schema.parse(request.body);
      (request as any).validatedBody = parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      throw error;
    }
  };
}
