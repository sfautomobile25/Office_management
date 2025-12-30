const express = require("express");
const cors = require("cors");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const { db } = require("./database");
const app = express();
const PORT = process.env.PORT || 5000;
const path = require("path");
const fs = require("fs");

require("dotenv").config();


const SESSION_DIR = process.env.SESSION_DB_DIR || path.join(__dirname, "data");
fs.mkdirSync(SESSION_DIR, { recursive: true });

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: SESSION_DIR,
    }),
    secret: process.env.SESSION_SECRET || "local_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
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
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const accountsRoutes = require("./routes/accounts");
const cashManagementRoutes = require("./routes/cashManagement");
const cashApprovalRoutes = require("./routes/cashApproval");
const receiptsRoutes = require("./routes/receipts");
const userManagementRoutes = require("./routes/userManagement");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/cash", cashManagementRoutes);
app.use("/api/cash", cashApprovalRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/user-management", userManagementRoutes);

// // Start server
// app.listen(PORT, () => {
//     console.log(`✅ Server running on http://localhost:${PORT}`);
//     console.log(`📊 Test: http://localhost:${PORT}/api/test`);
// });

// in render
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ports ${PORT}`);
});
