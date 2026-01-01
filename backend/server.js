require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Use your stable Vercel domain (not deployment URL)
const ORIGIN = process.env.CORS_ORIGIN || "https://office-management-alpha.vercel.app";

const isProd = process.env.NODE_ENV === "production";

// ✅ Required on Render behind proxy
app.set("trust proxy", 1);

// ✅ CORS must allow credentials
app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session config for Vercel <-> Render
app.use(
  session({
    name: "sid", // (optional) clearer than connect.sid
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProd, // ✅ true on Render (https), false locally
      sameSite: isProd ? "none" : "lax", // ✅ cross-site in production
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend is working!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.status(200).send("ok"));

// Import routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/accounts", require("./routes/accounts"));
app.use("/api/cash", require("./routes/cashManagement"));
app.use("/api/cash", require("./routes/cashApproval"));
app.use("/api/receipts", require("./routes/receipts"));
app.use("/api/user-management", require("./routes/userManagement"));

// Start server (Render needs 0.0.0.0)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
