// src/index.js
require("dotenv").config();
const express = require("express");
const usersRouter = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('Incoming', req.method, req.url);
  console.log('Content-Type:', req.headers['content-type']);
  next();
});

// Use users router
app.use("/users", usersRouter);

// root health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Prisma user backend running" });
});

// global error fallback (optional)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
