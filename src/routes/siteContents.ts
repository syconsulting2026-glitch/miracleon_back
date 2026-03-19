import { Router, Request, Response } from "express";
import { sequelize } from "../db/sequelize";
import { SiteContentPage } from "../models/SiteContentPage";
import { SiteContentSection } from "../models/SiteContentSection";
import { SiteContentSectionCardItem } from "../models/SiteContentSectionCardItem";
import { siteContentUpload } from "../utils/multer";

const router = Router();

type ContentCategory =
  | "UNBOX소개"
  | "설립목적"
  | "주요사업"
  | "철학가치관";

type SectionType = "text" | "imageText" | "cta" | "titleImage" | "cardGrid";
type TextAlign = "left" | "center" | "right";
type AnimationType =
  | "none"
  | "fadeUp"
  | "fadeIn"
  | "slideLeft"
  | "slideRight"
  | "zoomIn";

type SectionBackground = "white" | "gray" | "dark";
type ImageLayout = "left" | "right";
type CtaTheme = "orange" | "dark";

type SaveContentCardItemPayload = {
  title: string;
  description?: string | null;
  existingIconUrl?: string | null;
  existingIconName?: string | null;
  titleColor?: string | null;
  descriptionColor?: string | null;
  cardBgColor?: string | null;
};

type SaveContentSectionPayload = {
  type: SectionType;
  name: string;
  animation: AnimationType;

  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;

  titleColor?: string | null;
  descriptionColor?: string | null;

  align?: TextAlign | null;
  background?: SectionBackground | null;

  existingImageUrl?: string | null;
  existingImageName?: string | null;
  layout?: ImageLayout | null;

  buttonText?: string | null;
  buttonLink?: string | null;
  buttonTextColor?: string | null;
  buttonBgColor?: string | null;

  theme?: CtaTheme | null;

  pcColumns?: number | null;
  tabletColumns?: number | null;
  mobileColumns?: number | null;

  rowGap?: number | null;
  columnGap?: number | null;

  items?: SaveContentCardItemPayload[];
};

const CATEGORY_VALUES: ContentCategory[] = [
  "UNBOX소개",
  "설립목적",
  "주요사업",
  "철학가치관",
];

const SECTION_TYPE_VALUES: SectionType[] = [
  "text",
  "imageText",
  "cta",
  "titleImage",
  "cardGrid",
];

const ANIMATION_VALUES: AnimationType[] = [
  "none",
  "fadeUp",
  "fadeIn",
  "slideLeft",
  "slideRight",
  "zoomIn",
];

const API_BASE_URL = process.env.API_BASE_URL || "http://113.131.151.103:8080";

function isValidCategory(value: unknown): value is ContentCategory {
  return typeof value === "string" && CATEGORY_VALUES.includes(value as ContentCategory);
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeSectionType(value: unknown): SectionType | null {
  return typeof value === "string" && SECTION_TYPE_VALUES.includes(value as SectionType)
    ? (value as SectionType)
    : null;
}

function normalizeAnimation(value: unknown): AnimationType {
  return typeof value === "string" && ANIMATION_VALUES.includes(value as AnimationType)
    ? (value as AnimationType)
    : "fadeUp";
}

function normalizeAlign(value: unknown): TextAlign | null {
  return value === "left" || value === "center" || value === "right" ? value : null;
}

function normalizeBackground(value: unknown): SectionBackground | null {
  return value === "white" || value === "gray" || value === "dark" ? value : null;
}

function normalizeLayout(value: unknown): ImageLayout | null {
  return value === "left" || value === "right" ? value : null;
}

function normalizeTheme(value: unknown): CtaTheme | null {
  return value === "orange" || value === "dark" ? value : null;
}

function toUploadedFileUrl(filename: string) {
  return `/uploads/site-contents/${filename}`;
}

function toAbsoluteFileUrl(filePath: string | null) {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  return `${API_BASE_URL}${filePath}`;
}

function getUploadedFileMap(files: Express.Multer.File[] | undefined) {
  const map = new Map<string, Express.Multer.File>();

  for (const file of files ?? []) {
    map.set(file.fieldname, file);
  }

  return map;
}

function ensureCategoryOrder<T extends { category: ContentCategory }>(rows: T[]) {
  return CATEGORY_VALUES.map((category) => rows.find((row) => row.category === category))
    .filter(Boolean) as T[];
}

/**
 * 전체 내용관리 조회
 * GET /site-contents
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const pages = await SiteContentPage.findAll({
      where: { isActive: true },
      order: [["id", "ASC"]],
      include: [
        {
          model: SiteContentSection,
          as: "sections",
          required: false,
          where: { isActive: true },
          separate: true,
          order: [["sortOrder", "ASC"]],
          include: [
            {
              model: SiteContentSectionCardItem,
              as: "cardItems",
              required: false,
              where: { isActive: true },
              separate: true,
              order: [["sortOrder", "ASC"]],
            },
          ],
        },
      ],
    });

    const mapped = pages.map((page) => ({
      id: page.id,
      category: page.category,
      isActive: page.isActive,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      sections: (page.sections ?? []).map((section) => ({
        id: section.id,
        pageId: section.pageId,
        sortOrder: section.sortOrder,
        type: section.sectionType,
        name: section.name,
        animation: section.animation,

        eyebrow: section.eyebrow,
        title: section.title,
        description: section.description,

        titleColor: section.titleColor,
        descriptionColor: section.descriptionColor,

        align: section.align,
        background: section.background,

        imageUrl: toAbsoluteFileUrl(section.imageUrl),
        imageName: section.imageName,
        layout: section.layout,

        buttonText: section.buttonText,
        buttonLink: section.buttonLink,
        buttonTextColor: section.buttonTextColor,
        buttonBgColor: section.buttonBgColor,

        theme: section.theme,

        pcColumns: section.pcColumns,
        tabletColumns: section.tabletColumns,
        mobileColumns: section.mobileColumns,

        rowGap: section.rowGap,
        columnGap: section.columnGap,

        isActive: section.isActive,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,

        items:
          section.sectionType === "cardGrid"
            ? (section.cardItems ?? []).map((item) => ({
                id: item.id,
                sectionId: item.sectionId,
                sortOrder: item.sortOrder,
                title: item.title,
                description: item.description,
                iconUrl: toAbsoluteFileUrl(item.iconUrl),
                iconName: item.iconName,
                titleColor: item.titleColor,
                descriptionColor: item.descriptionColor,
                cardBgColor: item.cardBgColor,
                isActive: item.isActive,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              }))
            : [],
      })),
    }));

    res.status(200).json({
      success: true,
      message: "전체 내용관리 조회 성공",
      data: ensureCategoryOrder(mapped),
    });
  } catch (error) {
    console.error("[site-contents][GET /] error:", error);
    res.status(500).json({
      success: false,
      message: "내용관리 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 저장
 * POST /site-contents/save
 */
router.post(
  "/save",
  siteContentUpload.any(),
  async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();

    try {
      const category = req.body.category;
      const rawSections = req.body.sections;

      if (!isValidCategory(category)) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          message: "유효하지 않은 카테고리입니다.",
        });
        return;
      }

      if (!rawSections || typeof rawSections !== "string") {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          message: "sections 값이 필요합니다.",
        });
        return;
      }

      let sections: SaveContentSectionPayload[] = [];

      try {
        const parsed = JSON.parse(rawSections);
        if (!Array.isArray(parsed)) {
          throw new Error("sections must be array");
        }
        sections = parsed;
      } catch (error) {
        await transaction.rollback();
        res.status(400).json({
          success: false,
          message: "sections JSON 형식이 올바르지 않습니다.",
        });
        return;
      }

      const uploadedFiles = getUploadedFileMap(req.files as Express.Multer.File[]);

      let page = await SiteContentPage.findOne({
        where: { category },
        transaction,
      });

      if (!page) {
        page = await SiteContentPage.create(
          {
            category,
            isActive: true,
          },
          { transaction }
        );
      } else {
        await page.update(
          {
            isActive: true,
          },
          { transaction }
        );
      }

      const existingSections = await SiteContentSection.findAll({
        where: { pageId: page.id },
        transaction,
      });

      const existingSectionIds = existingSections.map((section) => section.id);

      if (existingSectionIds.length > 0) {
        await SiteContentSectionCardItem.destroy({
          where: { sectionId: existingSectionIds },
          transaction,
        });
      }

      await SiteContentSection.destroy({
        where: { pageId: page.id },
        transaction,
      });

      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        const rawSection = sections[sectionIndex];
        const sectionType = normalizeSectionType(rawSection.type);

        if (!sectionType) {
          await transaction.rollback();
          res.status(400).json({
            success: false,
            message: `${sectionIndex + 1}번째 섹션 타입이 올바르지 않습니다.`,
          });
          return;
        }

        const sectionImageFile = uploadedFiles.get(`sectionImage_${sectionIndex}`);

        const imageUrl = sectionImageFile
          ? toUploadedFileUrl(sectionImageFile.filename)
          : normalizeString(rawSection.existingImageUrl);

        const imageName = sectionImageFile
          ? sectionImageFile.originalname
          : normalizeString(rawSection.existingImageName);

        const createdSection = await SiteContentSection.create(
          {
            pageId: page.id,
            sortOrder: sectionIndex + 1,

            sectionType,
            name: normalizeString(rawSection.name) ?? `섹션 ${sectionIndex + 1}`,
            animation: normalizeAnimation(rawSection.animation),

            eyebrow: normalizeString(rawSection.eyebrow),
            title: normalizeString(rawSection.title),
            description: normalizeString(rawSection.description),

            titleColor: normalizeString(rawSection.titleColor),
            descriptionColor: normalizeString(rawSection.descriptionColor),

            align: normalizeAlign(rawSection.align),
            background: normalizeBackground(rawSection.background),

            imageUrl,
            imageName,
            layout: normalizeLayout(rawSection.layout),

            buttonText: normalizeString(rawSection.buttonText),
            buttonLink: normalizeString(rawSection.buttonLink),
            buttonTextColor: normalizeString(rawSection.buttonTextColor),
            buttonBgColor: normalizeString(rawSection.buttonBgColor),

            theme: normalizeTheme(rawSection.theme),

            pcColumns: normalizeNumber(rawSection.pcColumns),
            tabletColumns: normalizeNumber(rawSection.tabletColumns),
            mobileColumns: normalizeNumber(rawSection.mobileColumns),

            rowGap: normalizeNumber(rawSection.rowGap),
            columnGap: normalizeNumber(rawSection.columnGap),

            isActive: true,
          },
          { transaction }
        );

        if (sectionType === "cardGrid" && Array.isArray(rawSection.items)) {
          for (let itemIndex = 0; itemIndex < rawSection.items.length; itemIndex += 1) {
            const rawItem = rawSection.items[itemIndex];
            const iconFile = uploadedFiles.get(
              `sectionCardIcon_${sectionIndex}_${itemIndex}`
            );

            const iconUrl = iconFile
              ? toUploadedFileUrl(iconFile.filename)
              : normalizeString(rawItem.existingIconUrl);

            const iconName = iconFile
              ? iconFile.originalname
              : normalizeString(rawItem.existingIconName);

            await SiteContentSectionCardItem.create(
              {
                sectionId: createdSection.id,
                sortOrder: itemIndex + 1,

                title: normalizeString(rawItem.title) ?? `카드 ${itemIndex + 1}`,
                description: normalizeString(rawItem.description),

                iconUrl,
                iconName,

                titleColor: normalizeString(rawItem.titleColor),
                descriptionColor: normalizeString(rawItem.descriptionColor),
                cardBgColor: normalizeString(rawItem.cardBgColor),

                isActive: true,
              },
              { transaction }
            );
          }
        }
      }

      await transaction.commit();

      const savedPage = await SiteContentPage.findOne({
        where: { id: page.id },
        include: [
          {
            model: SiteContentSection,
            as: "sections",
            required: false,
            separate: true,
            order: [["sortOrder", "ASC"]],
            include: [
              {
                model: SiteContentSectionCardItem,
                as: "cardItems",
                required: false,
                separate: true,
                order: [["sortOrder", "ASC"]],
              },
            ],
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: "내용관리와 이미지가 저장되었습니다.",
        data: {
          id: savedPage?.id,
          category: savedPage?.category,
          isActive: savedPage?.isActive,
          sections: (savedPage?.sections ?? []).map((section) => ({
            id: section.id,
            pageId: section.pageId,
            sortOrder: section.sortOrder,
            type: section.sectionType,
            name: section.name,
            animation: section.animation,
            eyebrow: section.eyebrow,
            title: section.title,
            description: section.description,
            titleColor: section.titleColor,
            descriptionColor: section.descriptionColor,
            align: section.align,
            background: section.background,
            imageUrl: toAbsoluteFileUrl(section.imageUrl),
            imageName: section.imageName,
            layout: section.layout,
            buttonText: section.buttonText,
            buttonLink: section.buttonLink,
            buttonTextColor: section.buttonTextColor,
            buttonBgColor: section.buttonBgColor,
            theme: section.theme,
            pcColumns: section.pcColumns,
            tabletColumns: section.tabletColumns,
            mobileColumns: section.mobileColumns,
            rowGap: section.rowGap,
            columnGap: section.columnGap,
            items: (section.cardItems ?? []).map((item) => ({
              id: item.id,
              sectionId: item.sectionId,
              sortOrder: item.sortOrder,
              title: item.title,
              description: item.description,
              iconUrl: toAbsoluteFileUrl(item.iconUrl),
              iconName: item.iconName,
              titleColor: item.titleColor,
              descriptionColor: item.descriptionColor,
              cardBgColor: item.cardBgColor,
            })),
          })),
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("[site-contents/save] error:", error);

      res.status(500).json({
        success: false,
        message: "내용 저장 중 오류가 발생했습니다.",
      });
    }
  }
);

export default router;