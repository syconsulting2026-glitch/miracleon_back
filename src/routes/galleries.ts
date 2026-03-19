import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import fs from "fs";
import { sequelize } from "../db/sequelize";
import { Gallery } from "../models/Gallery";
import { GalleryImage } from "../models/GalleryImage";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";
import { galleryUpload } from "../utils/multer";

const r = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().optional(),
});

const createBodySchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
});

const updateBodySchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional().nullable(),
  deleteImageIds: z.array(z.coerce.number().int().positive()).optional(),
  thumbnailImageId: z.coerce.number().int().positive().optional(),
});

function parseDeleteImageIds(value: unknown): number[] {
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

function toImageResponse(image: GalleryImage) {
  return {
    id: image.id,
    originalName: image.originalName,
    storedName: image.storedName,
    filePath: image.filePath,
    fileUrl: image.fileUrl,
    sortOrder: image.sortOrder,
    isThumbnail: image.isThumbnail,
    createdAt: image.createdAt,
  };
}

/**
 * 목록 조회 (공개)
 * GET /galleries?page=1&pageSize=12&q=검색어
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

    const { rows, count } = await Gallery.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
      include: [
        {
          model: GalleryImage,
          as: "images",
          required: false,
        },
      ],
    });

    return res.json({
      items: rows.map((gallery) => {
        const images = (gallery.images ?? []).sort((a, b) => {
          if (Number(a.isThumbnail) !== Number(b.isThumbnail)) {
            return Number(b.isThumbnail) - Number(a.isThumbnail);
          }
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.id - b.id;
        });

        const thumbnail = images[0] ?? null;

        return {
          id: gallery.id,
          title: gallery.title,
          description: gallery.description,
          views: gallery.views,
          createdAt: gallery.createdAt,
          imageCount: images.length,
          thumbnail: thumbnail
            ? {
                id: thumbnail.id,
                fileUrl: thumbnail.fileUrl,
                originalName: thumbnail.originalName,
              }
            : null,
        };
      }),
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "갤러리 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 상세 조회 (공개) + 조회수 증가
 * GET /galleries/:id
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const gallery = await Gallery.findByPk(id, {
        include: [
          {
            model: GalleryImage,
            as: "images",
            required: false,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!gallery) return null;

      gallery.views += 1;
      await gallery.save({ transaction: t });

      if (gallery.images) {
        gallery.images.sort((a, b) => {
          if (Number(a.isThumbnail) !== Number(b.isThumbnail)) {
            return Number(b.isThumbnail) - Number(a.isThumbnail);
          }
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.id - b.id;
        });
      }

      return gallery;
    });

    if (!result) {
      return res.status(404).json({ message: "갤러리를 찾을 수 없습니다." });
    }

    return res.json({
      id: result.id,
      title: result.title,
      description: result.description,
      views: result.views,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      images: (result.images ?? []).map(toImageResponse),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "갤러리 상세 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 등록 (관리자)
 * multipart/form-data
 * - title
 * - description
 * - images (최대 20장)
 * - thumbnailIndex (선택) 신규 업로드 이미지 중 대표 인덱스
 */
r.post(
  "/",
  galleryUpload.array("images", 20),
  async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];

    try {
      const parsed = createBodySchema.safeParse({
        title: req.body.title,
        description: req.body.description ?? null,
      });

      if (!parsed.success) {
        files.forEach((file) => safeUnlink(file.path));
        return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
      }

      if (files.length === 0) {
        return res.status(400).json({ message: "최소 1장의 이미지를 업로드해야 합니다." });
      }

      const thumbnailIndexRaw = req.body.thumbnailIndex;
      const thumbnailIndex = Number.isFinite(Number(thumbnailIndexRaw))
        ? Number(thumbnailIndexRaw)
        : 0;

      const created = await sequelize.transaction(async (t) => {
        const gallery = await Gallery.create(
          {
            title: parsed.data.title,
            description: parsed.data.description ?? null,
            views: 0,
          },
          { transaction: t }
        );

        await GalleryImage.bulkCreate(
          files.map((file, index) => ({
            galleryId: gallery.id,
            originalName: file.originalname,
            storedName: file.filename,
            filePath: file.path,
            fileUrl: `/uploads/galleries/${file.filename}`,
            sortOrder: index,
            isThumbnail: index === thumbnailIndex,
          })),
          { transaction: t }
        );

        const fullGallery = await Gallery.findByPk(gallery.id, {
          include: [
            {
              model: GalleryImage,
              as: "images",
              required: false,
            },
          ],
          transaction: t,
        });

        return fullGallery!;
      });

      return res.status(201).json({
        id: created.id,
        title: created.title,
        description: created.description,
        views: created.views,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        images: (created.images ?? [])
          .sort((a, b) => {
            if (Number(a.isThumbnail) !== Number(b.isThumbnail)) {
              return Number(b.isThumbnail) - Number(a.isThumbnail);
            }
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          })
          .map(toImageResponse),
      });
    } catch (error) {
      files.forEach((file) => safeUnlink(file.path));
      console.error(error);
      return res.status(500).json({ message: "갤러리 등록 중 오류가 발생했습니다." });
    }
  }
);

/**
 * 수정 (관리자)
 * multipart/form-data
 * - title (optional)
 * - description (optional)
 * - deleteImageIds (optional) ex: [1,2] or "1,2"
 * - images (optional)
 * - thumbnailImageId (optional) 기존 이미지 ID 기준 대표 이미지 지정
 * - thumbnailNewIndex (optional) 신규 업로드 이미지 중 대표 지정
 */
r.put(
  "/:id",
  galleryUpload.array("images", 20),
  async (req, res) => {
    const id = Number(req.params.id);
    const newFiles = (req.files as Express.Multer.File[]) ?? [];

    if (!Number.isFinite(id)) {
      newFiles.forEach((file) => safeUnlink(file.path));
      return res.status(400).json({ message: "잘못된 ID입니다." });
    }

    try {
      const deleteImageIds = parseDeleteImageIds(req.body.deleteImageIds);
      const thumbnailImageId = req.body.thumbnailImageId
        ? Number(req.body.thumbnailImageId)
        : undefined;
      const thumbnailNewIndex = req.body.thumbnailNewIndex !== undefined
        ? Number(req.body.thumbnailNewIndex)
        : undefined;

      const parsed = updateBodySchema.safeParse({
        title: req.body.title,
        description: req.body.description,
        deleteImageIds,
        thumbnailImageId,
      });

      if (!parsed.success) {
        newFiles.forEach((file) => safeUnlink(file.path));
        return res.status(400).json({ message: "잘못된 요청 데이터입니다." });
      }

      const updated = await sequelize.transaction(async (t) => {
        const gallery = await Gallery.findByPk(id, {
          include: [
            {
              model: GalleryImage,
              as: "images",
              required: false,
            },
          ],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!gallery) return null;

        const currentImages = gallery.images ?? [];
        const imagesToDelete = currentImages.filter((img) =>
          deleteImageIds.includes(img.id)
        );

        if (parsed.data.title !== undefined) {
          gallery.title = parsed.data.title;
        }

        if (parsed.data.description !== undefined) {
          gallery.description = parsed.data.description ?? null;
        }

        await gallery.save({ transaction: t });

        if (imagesToDelete.length > 0) {
          await GalleryImage.destroy({
            where: {
              id: imagesToDelete.map((img) => img.id),
              galleryId: gallery.id,
            },
            transaction: t,
          });
        }

        const remainImages = currentImages
          .filter((img) => !deleteImageIds.includes(img.id))
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });

        if (newFiles.length > 0) {
          await GalleryImage.bulkCreate(
            newFiles.map((file, index) => ({
              galleryId: gallery.id,
              originalName: file.originalname,
              storedName: file.filename,
              filePath: file.path,
              fileUrl: `/uploads/galleries/${file.filename}`,
              sortOrder: remainImages.length + index,
              isThumbnail: false,
            })),
            { transaction: t }
          );
        }

        const refreshedImages = await GalleryImage.findAll({
          where: { galleryId: gallery.id },
          transaction: t,
        });

        await GalleryImage.update(
          { isThumbnail: false },
          {
            where: { galleryId: gallery.id },
            transaction: t,
          }
        );

        if (
          thumbnailImageId &&
          refreshedImages.some((img) => img.id === thumbnailImageId)
        ) {
          await GalleryImage.update(
            { isThumbnail: true },
            {
              where: { id: thumbnailImageId, galleryId: gallery.id },
              transaction: t,
            }
          );
        } else if (
          thumbnailNewIndex !== undefined &&
          Number.isFinite(thumbnailNewIndex)
        ) {
          const sortedImages = refreshedImages.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });

          const target = sortedImages[thumbnailNewIndex];
          if (target) {
            await GalleryImage.update(
              { isThumbnail: true },
              {
                where: { id: target.id, galleryId: gallery.id },
                transaction: t,
              }
            );
          }
        } else {
          const sortedImages = refreshedImages.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });

          if (sortedImages[0]) {
            await GalleryImage.update(
              { isThumbnail: true },
              {
                where: { id: sortedImages[0].id, galleryId: gallery.id },
                transaction: t,
              }
            );
          }
        }

        const fullGallery = await Gallery.findByPk(gallery.id, {
          include: [
            {
              model: GalleryImage,
              as: "images",
              required: false,
            },
          ],
          transaction: t,
        });

        return {
          gallery: fullGallery!,
          deletedFiles: imagesToDelete,
        };
      });

      if (!updated) {
        newFiles.forEach((file) => safeUnlink(file.path));
        return res.status(404).json({ message: "갤러리를 찾을 수 없습니다." });
      }

      updated.deletedFiles.forEach((img) => safeUnlink(img.filePath));

      return res.json({
        id: updated.gallery.id,
        title: updated.gallery.title,
        description: updated.gallery.description,
        views: updated.gallery.views,
        createdAt: updated.gallery.createdAt,
        updatedAt: updated.gallery.updatedAt,
        images: (updated.gallery.images ?? [])
          .sort((a, b) => {
            if (Number(a.isThumbnail) !== Number(b.isThumbnail)) {
              return Number(b.isThumbnail) - Number(a.isThumbnail);
            }
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          })
          .map(toImageResponse),
      });
    } catch (error) {
      newFiles.forEach((file) => safeUnlink(file.path));
      console.error(error);
      return res.status(500).json({ message: "갤러리 수정 중 오류가 발생했습니다." });
    }
  }
);

/**
 * 삭제 (관리자)
 * DELETE /galleries/:id
 */
r.delete("/:id", authJwt, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "잘못된 ID입니다." });
  }

  try {
    const deletedFiles = await sequelize.transaction(async (t) => {
      const gallery = await Gallery.findByPk(id, {
        include: [
          {
            model: GalleryImage,
            as: "images",
            required: false,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!gallery) return null;

      const files = [...(gallery.images ?? [])];

      await GalleryImage.destroy({
        where: { galleryId: gallery.id },
        transaction: t,
      });

      await gallery.destroy({ transaction: t });

      return files;
    });

    if (!deletedFiles) {
      return res.status(404).json({ message: "갤러리를 찾을 수 없습니다." });
    }

    deletedFiles.forEach((img) => safeUnlink(img.filePath));

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "갤러리 삭제 중 오류가 발생했습니다." });
  }
});

export default r;