import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Import configurations
import corsOptions from "./config/corsOptions.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import counsellorRoutes from "./routes/counsellor.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";
import aiRoutes from "./routes/aiRoutes.js"; // ⭐ NEW

// Import middleware
import auth from "./middleware/auth.js";
import role from "./middleware/role.js";
import tenant from "./middleware/tenant.js";

// Import utilities
import { errorResponse } from "./utils/response.js";

import aiTranscriptionRoutes from "./routes/aiTranscriptionRoutes.js";

const app = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

const isDevelopment = process.env.NODE_ENV === "development";

// Security middleware - Basic helmet protection
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting - Only on auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Using email + IP combination to prevent blocking all users on same network
  keyGenerator: (req) => {
    const email = req.body?.email || "unknown";
    const ip = req.ip;
    return `${email}_${ip}`;
  },
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
app.use(compression());
app.use(cors(corsOptions));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used:
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      total:
        Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
    },
  });
});

// API routes rate limiting
app.use("/api/auth", authLimiter, authRoutes);

// Protected routes with middleware chains
app.use("/api/student", auth, role("student"), tenant, studentRoutes);
app.use("/api/counsellor", auth, role("counsellor"), tenant, counsellorRoutes);
app.use("/api/admin", auth, role("admin"), tenant, adminRoutes);
app.use("/api/superadmin", auth, role("superadmin"), superadminRoutes);

// ⭐ AI Companion routes (student-only, tenant-aware)


// AFTER (for all roles)
// ⭐ AI routes (all protected by auth + tenant)
app.use("/api/ai/transcription", aiTranscriptionRoutes);
app.use("/api/ai", auth, tenant, aiRoutes);



app.get("/", (req, res) => {
  res.json({
    message: "SIH Mental Health Platform Backend",
    version: "1.0.0",
    documentation: "/api/docs",
    health: "/health",
    features: [
      "JWT Authentication with Refresh Tokens",
      "Multi-tenant Architecture",
      "Role-based Access Control",
      "Supabase Integration",
      "Security Hardened",
      "Rate Limited",
      "Comprehensive Logging",
    ],
  });
});

// for all other routes - 404 handler
app.use("*", (req, res) => {
  return errorResponse(res, "Route not found", 404);
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global Error Handler:", error);

  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (error.code === "23505") {
    // PostgreSQL unique violation
    statusCode = 409;
    message = "Resource already exists";
  }

  return errorResponse(res, message, statusCode, {
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

export default app;
