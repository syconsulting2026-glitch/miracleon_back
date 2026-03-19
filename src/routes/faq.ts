import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { Faq } from "../models/Faq";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";

const r = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().optional(),
  category: z.string().optional(),
  isVisible: z
    .union([z.coerce.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

const createBodySchema = z.object({
  category: z.string().trim().min(1).max(100).default("기타"),
  question: z.string().trim().min(2).max(255),
  answer: z.string().trim().min(1),
  isPinned: z.coerce.boolean().optional().default(false),
  isVisible: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

const updateBodySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  question: z.string().trim().min(2).max(255).optional(),
  answer: z.string().trim().min(1).optional(),
  isPinned: z.coerce.boolean().optional(),
  isVisible: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

/**
 * 목록(공개)
 * GET /faq?page=1&pageSize=10&q=키워드&category=일반
 */
r.get("/", async (req, res) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 조회 파라미터입니다." });
    }

    const { page, pageSize, q, category, isVisible } = parsed.data;
    const offset = (page - 1) * pageSize;

    const where: any = {};

    if (q?.trim()) {
      where[Op.or] = [
        { question: { [Op.like]: `%${q.trim()}%` } },
        { answer: { [Op.like]: `%${q.trim()}%` } },
      ];
    }

    if (category?.trim()) {
      where.category = category.trim();
    }

    // 공개 목록에서는 기본적으로 노출된 FAQ만 보여줌
    where.isVisible = isVisible ?? true;

    const { rows, count } = await Faq.findAndCountAll({
      where,
      order: [
        ["isPinned", "DESC"],
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: pageSize,
      offset,
    });

    return res.json({
      items: rows.map((faq) => ({
        id: faq.id,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        isPinned: faq.isPinned,
        isVisible: faq.isVisible,
        views: faq.views,
        sortOrder: faq.sortOrder,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      })),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 관리자 목록
 * GET /faq/admin?page=1&pageSize=10&q=키워드&category=일반&isVisible=true
 */
r.get("/admin", async (req, res) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 조회 파라미터입니다." });
    }

    const { page, pageSize, q, category, isVisible } = parsed.data;
    const offset = (page - 1) * pageSize;

    const where: any = {};

    if (q?.trim()) {
      where[Op.or] = [
        { question: { [Op.like]: `%${q.trim()}%` } },
        { answer: { [Op.like]: `%${q.trim()}%` } },
      ];
    }

    if (category?.trim()) {
      where.category = category.trim();
    }

    if (isVisible !== undefined) {
      where.isVisible = isVisible;
    }

    const { rows, count } = await Faq.findAndCountAll({
      where,
      order: [
        ["isPinned", "DESC"],
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: pageSize,
      offset,
    });

    return res.json({
      items: rows.map((faq) => ({
        id: faq.id,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        isPinned: faq.isPinned,
        isVisible: faq.isVisible,
        views: faq.views,
        sortOrder: faq.sortOrder,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
      })),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 관리자 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 상세(공개) + 조회수 증가
 * GET /faq/:id
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  console.log(id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const faq = await Faq.findByPk(id);

    if (!faq ) {
      return res.status(404).json({ message: "FAQ를 찾을 수 없습니다." });
    }

    faq.views += 1;
    await faq.save();

    return res.json({
      id: faq.id,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      isPinned: faq.isPinned,
      isVisible: faq.isVisible,
      views: faq.views,
      sortOrder: faq.sortOrder,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 상세 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 등록(관리자)
 * POST /faq
 */
r.post("/",  async (req, res) => {
  try {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
    }

    const created = await Faq.create({
      category: parsed.data.category,
      question: parsed.data.question,
      answer: parsed.data.answer,
      isPinned: parsed.data.isPinned,
      isVisible: parsed.data.isVisible,
      sortOrder: parsed.data.sortOrder,
      views: 0,
    });

    return res.status(201).json({
      id: created.id,
      category: created.category,
      question: created.question,
      answer: created.answer,
      isPinned: created.isPinned,
      isVisible: created.isVisible,
      views: created.views,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 등록 중 오류가 발생했습니다." });
  }
});

/**
 * 수정(관리자)
 * PUT /faq/:id
 */
r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const parsed = updateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
    }

    const faq = await Faq.findByPk(id);
    if (!faq) {
      return res.status(404).json({ message: "FAQ를 찾을 수 없습니다." });
    }

    if (parsed.data.category !== undefined) faq.category = parsed.data.category;
    if (parsed.data.question !== undefined) faq.question = parsed.data.question;
    if (parsed.data.answer !== undefined) faq.answer = parsed.data.answer;
    if (parsed.data.isPinned !== undefined) faq.isPinned = parsed.data.isPinned;
    if (parsed.data.isVisible !== undefined) faq.isVisible = parsed.data.isVisible;
    if (parsed.data.sortOrder !== undefined) faq.sortOrder = parsed.data.sortOrder;

    await faq.save();

    return res.json({
      id: faq.id,
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      isPinned: faq.isPinned,
      isVisible: faq.isVisible,
      views: faq.views,
      sortOrder: faq.sortOrder,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 수정 중 오류가 발생했습니다." });
  }
});

/**
 * 삭제(관리자)
 * DELETE /faq/:id
 */
r.delete("/:id",  async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const faq = await Faq.findByPk(id);
    if (!faq) {
      return res.status(404).json({ message: "FAQ를 찾을 수 없습니다." });
    }

    await faq.destroy();

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 삭제 중 오류가 발생했습니다." });
  }
});

/**
 * 다중 삭제(관리자)
 * DELETE /faq
 * body: { ids: number[] }
 */
r.delete("/", authJwt, requireAdmin, async (req, res) => {
  const schema = z.object({
    ids: z.array(z.coerce.number().int().positive()).min(1),
  });

  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
    }

    await Faq.destroy({
      where: {
        id: parsed.data.ids,
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "FAQ 다중 삭제 중 오류가 발생했습니다." });
  }
});

export default r;