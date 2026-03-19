import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../db/sequelize";
import { Qna } from "../models/Qna";
import { QnaAnswer } from "../models/QnaAnswer";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";
import svgCaptcha from "svg-captcha";
import crypto from "crypto";
const r = Router();
type CaptchaStoreItem = {
  text: string;
  expiresAt: number;
};

const captchaStore = new Map<string, CaptchaStoreItem>();

function cleanupCaptchaStore() {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (value.expiresAt < now) {
      captchaStore.delete(key);
    }
  }
}
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().optional(),
});

const createQnaSchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().min(1),
  authorName: z.string().min(2).max(100),
  password: z.string().min(4).max(50),
  isSecret: z.coerce.boolean().optional().default(false),
  captchaId: z.string().min(1),
  captchaText: z.string().min(1).max(20),
  honeypot: z.string().optional().default(""),
  startedAt: z.coerce.number(),
});

const updateQnaSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(1).optional(),
  authorName: z.string().min(2).max(100).optional(),
  password: z.string().min(4).max(50),
  isSecret: z.coerce.boolean().optional(),
});

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

const answerSchema = z.object({
  content: z.string().min(1),
});

function toQnaListItem(qna: Qna & { answer?: QnaAnswer | null }) {
  return {
    id: qna.id,
    title: qna.title,
    authorName: qna.authorName,
    isSecret: qna.isSecret,
    views: qna.views,
    createdAt: qna.createdAt,
    updatedAt: qna.updatedAt,
    answerStatus: qna.answer ? "answered" : "pending",
    hasAnswer: !!qna.answer,
  };
}

function toQnaDetail(qna: Qna & { answer?: QnaAnswer | null }, isAuthorized = false) {
  const secretBlocked = qna.isSecret && !isAuthorized;

  return {
    id: qna.id,
    title: qna.title,
    content: secretBlocked ? "" : qna.content,
    authorName: qna.authorName,
    isSecret: qna.isSecret,
    views: qna.views,
    createdAt: qna.createdAt,
    updatedAt: qna.updatedAt,
    answerStatus: qna.answer ? "answered" : "pending",
    hasAnswer: !!qna.answer,
    answer: qna.answer
      ? {
          id: qna.answer.id,
          content: secretBlocked ? "" : qna.answer.content,
          createdAt: qna.answer.createdAt,
          updatedAt: qna.answer.updatedAt,
        }
      : null,
    secretBlocked,
  };
}

/**
 * 목록 조회
 * GET /qnas?page=1&pageSize=10&q=검색어
 */
r.get("/", async (req, res) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 조회 파라미터입니다." });
    }

    const { page, pageSize, q } = parsed.data;
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (q?.trim()) {
      where.title = { [Op.like]: `%${q.trim()}%` };
    }

    const { rows, count } = await Qna.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
      include: [
        {
          model: QnaAnswer,
          as: "answer",
          required: false,
        },
      ],
    });

    return res.json({
      items: rows.map((item) => toQnaListItem(item as Qna & { answer?: QnaAnswer | null })),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Q&A 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 비밀번호 확인
 * POST /qnas/:id/verify-password
 */
r.post("/:id/verify-password", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = verifyPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "비밀번호를 입력해주세요." });
  }

  try {
    const qna = await Qna.findByPk(id);
    if (!qna) {
      return res.status(404).json({ message: "Q&A를 찾을 수 없습니다." });
    }

    const matched = await bcrypt.compare(parsed.data.password, qna.password);

    return res.json({
      ok: matched,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "비밀번호 확인 중 오류가 발생했습니다." });
  }
});

r.get("/captcha", async (_req, res) => {
  try {
    cleanupCaptchaStore();

    const captcha = svgCaptcha.create({
      size: 5,
      noise: 4,
      color: true,
      background: "#f3f4f6",
      ignoreChars: "0oO1iIlL",
      fontSize: 56,
      width: 180,
      height: 60,
    });

    const captchaId = crypto.randomUUID();

    captchaStore.set(captchaId, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + 1000 * 60 * 5,
    });

    return res.json({
      captchaId,
      image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString("base64")}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "자동입력방지 생성 중 오류가 발생했습니다." });
  }
});
/**
 * 상세 조회
 * GET /qnas/:id
 * 비밀글은 password를 query로 넘기거나 관리자만 열람 가능
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const qna = await Qna.findByPk(id, {
        include: [
          {
            model: QnaAnswer,
            as: "answer",
            required: false,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!qna) return null;

      qna.views += 1;
      await qna.save({ transaction: t });

      return qna;
    });

    if (!result) {
      return res.status(404).json({ message: "Q&A를 찾을 수 없습니다." });
    }

    let isAuthorized = false;

    if (!result.isSecret) {
      isAuthorized = true;
    } else {
      const password = typeof req.query.password === "string" ? req.query.password : "";
      if (password) {
        isAuthorized = await bcrypt.compare(password, result.password);
      }
    }

    return res.json(toQnaDetail(result as Qna & { answer?: QnaAnswer | null }, isAuthorized));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Q&A 상세 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 질문 작성
 * POST /qnas
 */
r.post("/", async (req, res) => {
  const parsed = createQnaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
  }

  try {
    const {
      title,
      content,
      authorName,
      password,
      isSecret,
      captchaId,
      captchaText,
      honeypot,
      startedAt,
    } = parsed.data;

    if (honeypot && honeypot.trim() !== "") {
      return res.status(400).json({ message: "비정상 요청으로 판단되었습니다." });
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < 1500) {
      return res.status(400).json({ message: "너무 빠른 제출은 허용되지 않습니다." });
    }

    const captchaItem = captchaStore.get(captchaId);

    if (!captchaItem) {
      return res.status(400).json({ message: "자동입력방지가 만료되었거나 유효하지 않습니다." });
    }

    if (captchaItem.expiresAt < Date.now()) {
      captchaStore.delete(captchaId);
      return res.status(400).json({ message: "자동입력방지가 만료되었습니다. 새로고침 후 다시 시도해주세요." });
    }

    if (captchaItem.text !== captchaText.trim().toLowerCase()) {
      captchaStore.delete(captchaId);
      return res.status(400).json({ message: "자동입력방지 문자가 올바르지 않습니다." });
    }

    captchaStore.delete(captchaId);

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await Qna.create({
      title,
      content,
      authorName,
      password: hashedPassword,
      isSecret: isSecret ?? false,
      views: 0,
    });

    return res.status(201).json({
      id: created.id,
      title: created.title,
      authorName: created.authorName,
      isSecret: created.isSecret,
      views: created.views,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      answerStatus: "pending",
      hasAnswer: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Q&A 등록 중 오류가 발생했습니다." });
  }
});

/**
 * 질문 수정
 * PUT /qnas/:id
 * body.password 로 본인 확인
 */
r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = updateQnaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
  }

  try {
    const qna = await Qna.findByPk(id);
    if (!qna) {
      return res.status(404).json({ message: "Q&A를 찾을 수 없습니다." });
    }

    const matched = await bcrypt.compare(parsed.data.password, qna.password);
    if (!matched) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    if (parsed.data.title !== undefined) qna.title = parsed.data.title;
    if (parsed.data.content !== undefined) qna.content = parsed.data.content;
    if (parsed.data.authorName !== undefined) qna.authorName = parsed.data.authorName;
    if (parsed.data.isSecret !== undefined) qna.isSecret = parsed.data.isSecret;

    await qna.save();

    const fullQna = await Qna.findByPk(qna.id, {
      include: [
        {
          model: QnaAnswer,
          as: "answer",
          required: false,
        },
      ],
    });

    return res.json(toQnaDetail(fullQna as Qna & { answer?: QnaAnswer | null }, true));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Q&A 수정 중 오류가 발생했습니다." });
  }
});

/**
 * 질문 삭제
 * DELETE /qnas/:id
 * body.password 로 본인 확인
 */
r.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = verifyPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "비밀번호를 입력해주세요." });
  }

  try {
    const qna = await Qna.findByPk(id);
    if (!qna) {
      return res.status(404).json({ message: "Q&A를 찾을 수 없습니다." });
    }

    const matched = await bcrypt.compare(parsed.data.password, qna.password);
    if (!matched) {
      return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    await qna.destroy();

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Q&A 삭제 중 오류가 발생했습니다." });
  }
});

/**
 * 관리자 답변 등록
 * POST /qnas/:id/answer
 */
r.post("/:id/answer",  async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "답변 내용을 입력해주세요." });
  }

  try {
    const qna = await Qna.findByPk(id, {
      include: [
        {
          model: QnaAnswer,
          as: "answer",
          required: false,
        },
      ],
    });

    if (!qna) {
      return res.status(404).json({ message: "Q&A를 찾을 수 없습니다." });
    }

    if (qna.answer) {
      return res.status(400).json({ message: "이미 답변이 등록된 질문입니다." });
    }

    const answer = await QnaAnswer.create({
      qnaId: qna.id,
      content: parsed.data.content,
    });

    return res.status(201).json({
      id: answer.id,
      qnaId: qna.id,
      content: answer.content,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "답변 등록 중 오류가 발생했습니다." });
  }
});

/**
 * 관리자 답변 수정
 * PUT /qnas/:id/answer
 */
r.put("/:id/answer",  async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "답변 내용을 입력해주세요." });
  }

  try {
    const answer = await QnaAnswer.findOne({
      where: { qnaId: id },
    });

    if (!answer) {
      return res.status(404).json({ message: "등록된 답변이 없습니다." });
    }

    answer.content = parsed.data.content;
    await answer.save();

    return res.json({
      id: answer.id,
      qnaId: answer.qnaId,
      content: answer.content,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "답변 수정 중 오류가 발생했습니다." });
  }
});

/**
 * 관리자 답변 삭제
 * DELETE /qnas/:id/answer
 */
r.delete("/:id/answer",  async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const answer = await QnaAnswer.findOne({
      where: { qnaId: id },
    });

    if (!answer) {
      return res.status(404).json({ message: "등록된 답변이 없습니다." });
    }

    await answer.destroy();

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "답변 삭제 중 오류가 발생했습니다." });
  }
});

export default r;