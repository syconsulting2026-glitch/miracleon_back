import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import fs from "fs";
import { sequelize } from "../db/sequelize";
import { Notice } from "../models/Notice";
import { NoticeAttachment } from "../models/NoticeAttachment";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";
import { noticeUpload } from "../utils/multer";

const r = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().optional(),
});

const createBodySchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().min(1),
});

const updateBodySchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(1).optional(),
  deleteAttachmentIds: z.array(z.coerce.number().int().positive()).optional(),
});

function parseDeleteAttachmentIds(value: unknown): number[] {
  if (value == null || value === "") return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((v) => String(v).split(","))
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0);
      }
    } catch {
      return value
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0);
    }
  }

  return [];
}

function classifyFileType(mimetype?: string | null): "image" | "file" {
  if (!mimetype) return "file";
  return mimetype.startsWith("image/") ? "image" : "file";
}

function safeUnlink(filePath?: string | null) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("파일 삭제 실패:", filePath, err);
  }
}

function toAttachmentResponse(att: NoticeAttachment) {
  return {
    id: att.id,
    originalName: att.originalName,
    storedName: att.storedName,
    filePath: att.filePath,
    fileUrl: att.fileUrl,
    mimeType: att.mimeType,
    fileSize: att.fileSize,
    fileType: att.fileType,
    sortOrder: att.sortOrder,
    createdAt: att.createdAt,
  };
}

/**
 * 목록(공개)
 * GET /notices?page=1&pageSize=10&q=키워드
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

    const { rows, count } = await Notice.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
      include: [
        {
          model: NoticeAttachment,
          as: "attachments",
          attributes: ["id", "fileType", "fileUrl"],
          required: false,
        },
      ],
    });

    return res.json({
      items: rows.map((notice) => ({
        id: notice.id,
        title: notice.title,
        views: notice.views,
        createdAt: notice.createdAt,
        attachmentCount: notice.attachments?.length ?? 0,
        hasImage: (notice.attachments ?? []).some((a) => a.fileType === "image"),
        hasAttachment: (notice.attachments?.length ?? 0) > 0,
      })),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "공지사항 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 상세(공개) + 조회수 증가
 * GET /notices/:id
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const notice = await Notice.findByPk(id, {
        include: [
          {
            model: NoticeAttachment,
            as: "attachments",
            required: false,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!notice) return null;

      notice.views += 1;
      await notice.save({ transaction: t });

      if (notice.attachments) {
        notice.attachments.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.id - b.id;
        });
      }

      return notice;
    });

    if (!result) {
      return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." });
    }

    return res.json({
      id: result.id,
      title: result.title,
      content: result.content,
      views: result.views,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      attachments: (result.attachments ?? []).map(toAttachmentResponse),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "공지사항 상세 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 등록(관리자)
 * multipart/form-data
 * fields:
 * - title
 * - content
 * - attachments (최대 5개)
 */
r.post(
  "/",
  noticeUpload.array("attachments", 5),
  async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];

    try {
      const parsed = createBodySchema.safeParse(req.body);
      if (!parsed.success) {
        files.forEach((file) => safeUnlink(file.path));
        return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
      }

      if (files.length > 5) {
        files.forEach((file) => safeUnlink(file.path));
        return res.status(400).json({ message: "첨부파일은 최대 5개까지 가능합니다." });
      }

      const { title, content } = parsed.data;

      const created = await sequelize.transaction(async (t) => {
        const notice = await Notice.create(
          {
            title,
            content,
            views: 0,
          },
          { transaction: t }
        );

        if (files.length > 0) {
          await NoticeAttachment.bulkCreate(
            files.map((file, index) => ({
              noticeId: notice.id,
              originalName: file.originalname,
              storedName: file.filename,
              filePath: file.path,
              fileUrl: `/uploads/notices/${file.filename}`,
              mimeType: file.mimetype,
              fileSize: file.size,
              fileType: classifyFileType(file.mimetype),
              sortOrder: index,
            })),
            { transaction: t }
          );
        }

        const fullNotice = await Notice.findByPk(notice.id, {
          include: [
            {
              model: NoticeAttachment,
              as: "attachments",
              required: false,
            },
          ],
          transaction: t,
        });

        return fullNotice!;
      });

      return res.status(201).json({
        id: created.id,
        title: created.title,
        content: created.content,
        views: created.views,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        attachments: (created.attachments ?? [])
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(toAttachmentResponse),
      });
    } catch (error) {
      files.forEach((file) => safeUnlink(file.path));
      console.error(error);
      return res.status(500).json({ message: "공지사항 등록 중 오류가 발생했습니다." });
    }
  }
);

/**
 * 수정(관리자)
 * multipart/form-data
 * fields:
 * - title (optional)
 * - content (optional)
 * - deleteAttachmentIds (optional)  ex) "[1,2]" or "1,2"
 * - attachments (optional, 최대 5개)
 */
r.put(
  "/:id",
  authJwt,
  requireAdmin,
  noticeUpload.array("attachments", 5),
  async (req, res) => {
    const id = Number(req.params.id);
    const newFiles = (req.files as Express.Multer.File[]) ?? [];

    if (!Number.isFinite(id)) {
      newFiles.forEach((file) => safeUnlink(file.path));
      return res.status(400).json({ message: "잘못된 ID입니다." });
    }

    try {
      const deleteAttachmentIds = parseDeleteAttachmentIds(req.body.deleteAttachmentIds);

      const parsed = updateBodySchema.safeParse({
        title: req.body.title,
        content: req.body.content,
        deleteAttachmentIds,
      });

      if (!parsed.success) {
        newFiles.forEach((file) => safeUnlink(file.path));
        return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
      }

      const updated = await sequelize.transaction(async (t) => {
        const notice = await Notice.findByPk(id, {
          include: [
            {
              model: NoticeAttachment,
              as: "attachments",
              required: false,
            },
          ],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!notice) {
          return null;
        }

        const currentAttachments = notice.attachments ?? [];

        const attachmentsToDelete = currentAttachments.filter((att) =>
          deleteAttachmentIds.includes(att.id)
        );

        const remainCount = currentAttachments.length - attachmentsToDelete.length;
        const finalCount = remainCount + newFiles.length;

        if (newFiles.length > 5) {
          throw new Error("첨부파일은 최대 5개까지 업로드 가능합니다.");
        }

        if (finalCount > 5) {
          throw new Error("기존 첨부 유지 개수와 신규 첨부를 합쳐 최대 5개까지만 가능합니다.");
        }

        if (parsed.data.title !== undefined) notice.title = parsed.data.title;
        if (parsed.data.content !== undefined) notice.content = parsed.data.content;

        await notice.save({ transaction: t });

        if (attachmentsToDelete.length > 0) {
          await NoticeAttachment.destroy({
            where: {
              id: attachmentsToDelete.map((att) => att.id),
              noticeId: notice.id,
            },
            transaction: t,
          });
        }

        const remainAttachments = currentAttachments
          .filter((att) => !deleteAttachmentIds.includes(att.id))
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });

        if (newFiles.length > 0) {
          await NoticeAttachment.bulkCreate(
            newFiles.map((file, index) => ({
              noticeId: notice.id,
              originalName: file.originalname,
              storedName: file.filename,
              filePath: file.path,
              fileUrl: `/uploads/notices/${file.filename}`,
              mimeType: file.mimetype,
              fileSize: file.size,
              fileType: classifyFileType(file.mimetype),
              sortOrder: remainAttachments.length + index,
            })),
            { transaction: t }
          );
        }

        const fullNotice = await Notice.findByPk(notice.id, {
          include: [
            {
              model: NoticeAttachment,
              as: "attachments",
              required: false,
            },
          ],
          transaction: t,
        });

        return {
          notice: fullNotice!,
          deletedFiles: attachmentsToDelete,
        };
      });

      if (!updated) {
        newFiles.forEach((file) => safeUnlink(file.path));
        return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." });
      }

      updated.deletedFiles.forEach((file) => safeUnlink(file.filePath));

      return res.json({
        id: updated.notice.id,
        title: updated.notice.title,
        content: updated.notice.content,
        views: updated.notice.views,
        createdAt: updated.notice.createdAt,
        updatedAt: updated.notice.updatedAt,
        attachments: (updated.notice.attachments ?? [])
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          })
          .map(toAttachmentResponse),
      });
    } catch (error: any) {
      newFiles.forEach((file) => safeUnlink(file.path));
      console.error(error);

      if (error?.message?.includes("최대 5개")) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "공지사항 수정 중 오류가 발생했습니다." });
    }
  }
);

/**
 * 삭제(관리자)
 * DELETE /notices/:id
 */
r.delete("/:id", authJwt, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const deletedFiles = await sequelize.transaction(async (t) => {
      const notice = await Notice.findByPk(id, {
        include: [
          {
            model: NoticeAttachment,
            as: "attachments",
            required: false,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!notice) {
        return null;
      }

      const files = [...(notice.attachments ?? [])];

      await NoticeAttachment.destroy({
        where: { noticeId: notice.id },
        transaction: t,
      });

      await notice.destroy({ transaction: t });

      return files;
    });

    if (!deletedFiles) {
      return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." });
    }

    deletedFiles.forEach((file) => safeUnlink(file.filePath));

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "공지사항 삭제 중 오류가 발생했습니다." });
  }
});

export default r;