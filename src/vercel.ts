import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { connectDatabase } from "./config/database.js";

let app: ReturnType<typeof Fastify> | null = null;
let dbInitialized = false;

async function getApp() {
  if (app) return app;

  app = Fastify({ logger: false });

  await app.register(cors, {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  const { registerJwt, authenticate } =
    await import("./services/jwt.service.js");
  const { authRoutes, userRoutes, watchHistoryRoutes } =
    await import("./routes/index.js");

  await registerJwt(app);
  app.decorate("authenticate", authenticate);

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(watchHistoryRoutes, { prefix: "/api/v1/watch-history" });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  return app;
}

export default async function handler(req: any, res: any) {
  try {
    // Initialize database connection
    if (!dbInitialized) {
      try {
        await connectDatabase();
        dbInitialized = true;
      } catch (dbError) {
        console.error("Database connection failed:", dbError);
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Service Unavailable",
            message: "Database connection failed",
          }),
        );
        return;
      }
    }

    const fastify = await getApp();
    await fastify.ready();
    fastify.server.emit("request", req, res);
  } catch (error: any) {
    console.error("Handler error:", error?.message || error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Internal Server Error",
        message: error?.message,
      }),
    );
  }
}
