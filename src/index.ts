import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadEnv } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { registerJwt, authenticate } from "./services/jwt.service.js";
import { authRoutes, userRoutes, watchHistoryRoutes, commentRoutes, movieViewLogRoutes, adminRoutes, feedbackRoutes, watchSessionRoutes, leaderboardRoutes, watchCalendarRoutes } from "./routes/index.js";

const env = loadEnv();

const app = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

async function build(): Promise<typeof app> {
  await app.register(cors, {
    origin: JSON.parse(env.FRONTEND_URL || "[]"),
    credentials: true,
  });

  await registerJwt(app);

  app.decorate("authenticate", authenticate);

  // ========== ROUTES ==========

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(watchHistoryRoutes, { prefix: "/api/v1/watch-history" });
  await app.register(commentRoutes, { prefix: "/api/v1/comments" });
  await app.register(movieViewLogRoutes, { prefix: "/api/v1/view-logs" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });
  await app.register(feedbackRoutes, { prefix: "/api/v1/feedback" });
  await app.register(watchSessionRoutes, { prefix: "/api/v1/watch-sessions" });
  await app.register(leaderboardRoutes, { prefix: "/api/v1/leaderboard" });
  await app.register(watchCalendarRoutes, { prefix: "/api/v1/watch-calendar" });

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/", async () => {
    return {
      name: "Movie Backend API",
      version: "1.0.0",
      endpoints: {
        auth: "/api/v1/auth",
        users: "/api/v1/users",
        watchHistory: "/api/v1/watch-history",
        comments: "/api/v1/comments",
        viewLogs: "/api/v1/view-logs",
        admin: "/api/v1/admin",
        feedback: "/api/v1/feedback",
        watchSessions: "/api/v1/watch-sessions",
        leaderboard: "/api/v1/leaderboard",
        watchCalendar: "/api/v1/watch-calendar",
        health: "/health",
      },
    };
  });

  return app;
}

async function start(): Promise<void> {
  try {
    await connectDatabase();
    const server = await build();

    await server.listen({ port: parseInt(env.PORT), host: "0.0.0.0" });
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
}

export { app, build };

start();
