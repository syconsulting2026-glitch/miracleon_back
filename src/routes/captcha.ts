import { Router } from "express";
import { generateCaptcha } from "../utils/captchaStore";

const r = Router();

r.get("/", async (_req, res) => {
  try {
    const result = generateCaptcha();
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "자동입력방지를 생성하지 못했습니다." });
  }
});

export default r;