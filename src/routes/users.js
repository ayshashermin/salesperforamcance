// src/routes/users.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer(); // default memory storage

// Helper to remove password from responses
function sanitizeUser(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

/**
 * POST /users
 * Use upload.none() to parse multipart/form-data fields (no files).
 * If you prefer JSON, send application/json from client instead.
 */
router.post("/", upload.none(), async (req, res) => {
  console.log("Received body:", req.body);

  try {
    const body = req.body || {}; // defensive
    const {
      username,
      password,
      userrole,
      employeecode,
      leaveApprover,
      requestDate,
      approverName,
    } = body;

    if (!username || !password || !userrole) {
      return res
        .status(400)
        .json({ error: "username, password and userrole are required" });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: "username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    let parsedDate = undefined;
    if (requestDate) {
      parsedDate = new Date(requestDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "invalid requestDate" });
      }
    }

    const created = await prisma.user.create({
      data: {
        username,
        password: hashed,
        userrole,
        employeecode,
        leaveApprover,
        requestDate: parsedDate,
        approverName,
      },
    });

    return res.status(201).json(sanitizeUser(created));
  } catch (err) {
    console.error("POST /users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /users
 * optional query params: ?skip=0&take=100
 */
router.get("/", async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = Math.min(parseInt(req.query.take) || 100, 1000);
    const users = await prisma.user.findMany({
      skip,
      take,
      orderBy: { id: "asc" },
    });
    return res.json(users.map(sanitizeUser));
  } catch (err) {
    console.error("GET /users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /users/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "not found" });
    return res.json(sanitizeUser(user));
  } catch (err) {
    console.error("GET /users/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /users/:id
 * Use upload.none() here too if client sends multipart/form-data
 */
router.put("/:id", upload.none(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

    const body = req.body || {};
    const {
      username,
      password,
      userrole,
      employeecode,
      leaveApprover,
      requestDate,
      approverName,
    } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "not found" });

    if (username && username !== existing.username) {
      const other = await prisma.user.findUnique({ where: { username } });
      if (other) return res.status(409).json({ error: "username already exists" });
    }

    let hashed = undefined;
    if (password) {
      hashed = await bcrypt.hash(password, 10);
    }

    let parsedDate = undefined;
    if (requestDate) {
      parsedDate = new Date(requestDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "invalid requestDate" });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: username ?? undefined,
        password: hashed ?? undefined,
        userrole: userrole ?? undefined,
        employeecode: employeecode ?? undefined,
        leaveApprover: leaveApprover ?? undefined,
        requestDate: parsedDate ?? undefined,
        approverName: approverName ?? undefined,
      },
    });

    return res.json(sanitizeUser(updated));
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /users/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

    await prisma.user.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    // Prisma P2025 => record not found
    if (err.code === "P2025") {
      return res.status(404).json({ error: "not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
