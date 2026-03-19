import { Router } from "express";
import { z } from "zod";
import * as jwt from "jsonwebtoken";
import { verifyPassword } from "../utils/password";
import { authJwt } from "../middleware/authJwt";
import bcrypt from "bcrypt";
const r = Router();

const adminLoginSchema = z.object({
  adminId: z.string().min(1),
  password: z.string().min(1),
});
r.get("/admin/hash", async (req, res) => {
  const password = "!sy1234!";
  const hash = await bcrypt.hash(password, 10);

  res.json({
    password,
    hash
  });
});
r.post("/admin/login", async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

  const { adminId, password } = parsed.data;

  const envAdminId = process.env.ADMIN_ID || "";
  const envHash = process.env.ADMIN_PASSWORD_HASH || "";
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!envAdminId || !envHash) {
    return res.status(500).json({ message: "Admin credentials not configured" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT secret not configured" });
  }

  if (adminId !== envAdminId) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, envHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "2h") as jwt.SignOptions["expiresIn"];

  const accessToken = jwt.sign(
    { sub: "admin-1", adminId: envAdminId, role: "admin", name: adminName },
    secret as jwt.Secret,
    { expiresIn }
  );

  return res.json({
    accessToken,
    user: { id: "admin-1", adminId: envAdminId, name: adminName, role: "admin" },
  });
});

r.get("/admin/me", authJwt, async (req, res) => {
  return res.json({ user: (req as any).user });
});

export default r;