import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { Apply, ApplyStatus } from "../models/Apply";
import { verifyCaptcha } from "../utils/captchaStore";
import { sendEmail } from "../utils/mailer";
const r = Router();
type CaptchaStoreItem = {
  text: string;
  expiresAt: number;
};
const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const onlyDigits = (v: any) => String(v ?? "").replace(/[^0-9]/g, "");
const captchaStore = new Map<string, CaptchaStoreItem>();

function cleanupCaptchaStore() {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (value.expiresAt < now) {
      captchaStore.delete(key);
    }
  }
}
const classTypeEnum = z.enum(["","AI", "CODING"]);
const statusEnum = z.enum(["","NEW", "CONTACTED", "DONE", "CANCELLED"]);

const createSchema = z.object({
  classType: classTypeEnum,
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(30),
  phoneDigits: z.string().trim().min(10).max(20),
  district: z.string().trim().min(1).max(50),
  neighborhoodDetail: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(255),
  motivation: z.string().trim().min(1),
  howFound: z.string().trim().min(1).max(100),
  recommender: z.string().trim().max(100).optional().nullable(),
  privacyAgree: z.coerce.boolean(),
  captchaId: z.string().trim().min(1),
  captchaText: z.string().trim().min(1).max(20),
  captchaStartedAt: z.coerce.number().int().positive(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().optional(),
  classType: classTypeEnum.optional(),
  status: statusEnum.optional(),
  district: z.string().optional(),
  order: z.enum(["new", "old"]).default("new"),
});

const updateStatusSchema = z.object({
  status: statusEnum,
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
});

const bulkStatusSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
  status: statusEnum,
});

function toListItem(item: Apply) {
  return {
    id: item.id,
    classType: item.classType,
    name: item.name,
    phone: item.phone,
    phoneDigits: item.phoneDigits,
    district: item.district,
    neighborhoodDetail: item.neighborhoodDetail,
    address: item.address,
    howFound: item.howFound,
    recommender: item.recommender,
    privacyAgree: item.privacyAgree,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toDetail(item: Apply) {
  return {
    id: item.id,
    classType: item.classType,
    name: item.name,
    phone: item.phone,
    phoneDigits: item.phoneDigits,
    district: item.district,
    neighborhoodDetail: item.neighborhoodDetail,
    address: item.address,
    motivation: item.motivation,
    howFound: item.howFound,
    recommender: item.recommender,
    privacyAgree: item.privacyAgree,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * 공개 신청 등록
 * POST /apply
 */
r.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 신청 데이터입니다." });
  }

  const data = parsed.data;

  if (!data.privacyAgree) {
    return res.status(400).json({ message: "개인정보처리방침 동의가 필요합니다." });
  }

  if (data.howFound === "지인추천" && !data.recommender?.trim()) {
    return res.status(400).json({ message: "지인추천인 경우 추천인을 입력해주세요." });
  }

  // ✅ 자동입력방지 검증
  const captchaResult = verifyCaptcha({
    captchaId: data.captchaId,
    captchaText: data.captchaText,
    captchaStartedAt: data.captchaStartedAt,
  });

  if (!captchaResult.ok) {
    return res.status(400).json({ message: captchaResult.message });
  }

  try {
    const classLabel =
      data.classType === "AI"
        ? "AI 수업"
        : data.classType === "CODING"
        ? "코딩 수업"
        : "-";

    const phoneDigits = data.phoneDigits?.trim()
      ? onlyDigits(data.phoneDigits)
      : onlyDigits(data.phone);

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return res
        .status(400)
        .json({ message: "연락처는 10~11자리로 입력해 주세요." });
    }

    const address =
      data.address?.trim() ||
      [data.district, data.neighborhoodDetail].filter(Boolean).join(" ").trim();
    const created = await Apply.create({
      classType: data.classType,
      name: data.name,
      phone: data.phone,
      phoneDigits: data.phoneDigits,
      district: data.district,
      neighborhoodDetail: data.neighborhoodDetail,
      address: data.address,
      motivation: data.motivation,
      howFound: data.howFound,
      recommender: data.recommender?.trim() || null,
      privacyAgree: data.privacyAgree,
      status: "NEW",
    });
    // --- 이메일 본문 ---
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">수강 신청 접수</h2>
        <p style="margin:0 0 10px;color:#6b7280;font-size:12px">
          신청번호: <b>${esc(created.id)}</b>
        </p>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:160px">수업 종류</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(classLabel)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">이름</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(data.name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">연락처</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(data.phone)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">사는 동네</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(address || "-")}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">알게 된 계기</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(data.howFound || "-")}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">지원동기</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;white-space:pre-wrap">${esc(
                data.motivation || "-"
              )}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">추천인</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(data.recommender || "-")}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin:12px 0 0;color:#6b7280;font-size:12px">
          본 메일은 수강 신청 폼 제출로 자동 발송되었습니다.
        </p>
      </div>
    `;
    await sendEmail({
      to: "shindong1440@gmail.com",
      subject: `수강신청 - ${classLabel} (${esc(data.name)})`,
      html,
    });
    return res.status(201).json({
      ok: true,
      item: toDetail(created),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "수강신청 등록 중 오류가 발생했습니다." });
  }
});

/**
 * 목록 조회
 * GET /apply
 */
r.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  console.log(parsed);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 조회 파라미터입니다." });
  }

  const { page, pageSize, q, classType, status, district, order } = parsed.data;
  const offset = (page - 1) * pageSize;

  const where: any = {};

  if (q?.trim()) {
    const keyword = `%${q.trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: keyword } },
      { phone: { [Op.like]: keyword } },
      { phoneDigits: { [Op.like]: keyword } },
      { address: { [Op.like]: keyword } },
    ];
  }

  if (classType) where.classType = classType;
  if (status) where.status = status;
  if (district?.trim()) where.district = district.trim();

  try {
    const { rows, count } = await Apply.findAndCountAll({
      where,
      order: [["createdAt", order === "old" ? "ASC" : "DESC"]],
      limit: pageSize,
      offset,
    });

    return res.json({
      items: rows.map(toListItem),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "수강신청 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 상세 조회
 * GET /apply/:id
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const item = await Apply.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "수강신청을 찾을 수 없습니다." });
    }

    return res.json({
      item: toDetail(item),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "수강신청 상세 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 개별 상태 변경
 * PATCH /apply/:id/status
 */
r.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 상태값입니다." });
  }

  try {
    const item = await Apply.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "수강신청을 찾을 수 없습니다." });
    }

    item.status = parsed.data.status as ApplyStatus;
    await item.save();

    return res.json({
      ok: true,
      item: toDetail(item),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "상태 변경 중 오류가 발생했습니다." });
  }
});

/**
 * 일괄 상태 변경
 * PATCH /apply/bulk-status
 */
r.patch("/bulk-status", async (req, res) => {
  const parsed = bulkStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
  }

  try {
    const [updatedCount] = await Apply.update(
      { status: parsed.data.status },
      { where: { id: { [Op.in]: parsed.data.ids } } }
    );

    return res.json({
      ok: true,
      updatedCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "일괄 상태 변경 중 오류가 발생했습니다." });
  }
});

/**
 * 개별 삭제
 * DELETE /apply/:id
 */
r.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const item = await Apply.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "수강신청을 찾을 수 없습니다." });
    }

    await item.destroy();

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "삭제 중 오류가 발생했습니다." });
  }
});

/**
 * 일괄 삭제
 * POST /apply/bulk-delete
 */
r.post("/bulk-delete", async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "삭제할 항목을 선택해주세요." });
  }

  try {
    const deletedCount = await Apply.destroy({
      where: { id: { [Op.in]: parsed.data.ids } },
    });

    return res.json({
      ok: true,
      deletedCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "일괄 삭제 중 오류가 발생했습니다." });
  }
});

export default r;