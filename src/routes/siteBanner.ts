import { Router, Request, Response } from "express";
import { sequelize } from "../db/sequelize";
import { SiteBanner } from "../models/SiteBanner";
import { SiteBannerSlide } from "../models/SiteBannerSlide";
import { siteBannerUpload } from "../utils/multer";

const router = Router();

type BannerCategory =
  | "메인"
  | "UNBOX소개"
  | "설립목적"
  | "주요사업"
  | "철학가치관"
  | "커뮤니티";

type BannerEffect =
  | "slide"
  | "fade"
  | "coverflow"
  | "flip"
  | "cards"
  | "creative";

type TextAlign = "left" | "center" | "right";
type VerticalAlign = "top" | "center" | "bottom";

interface SaveBannerSlideBody {
  title?: string | null;
  description?: string | null;
  existingImageUrl?: string | null;
  existingImageName?: string | null;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  duration: number;
  isActive?: boolean;
}

const VALID_CATEGORIES: BannerCategory[] = [
  "메인",
  "UNBOX소개",
  "설립목적",
  "주요사업",
  "철학가치관",
  "커뮤니티",
];

const VALID_EFFECTS: BannerEffect[] = [
  "slide",
  "fade",
  "coverflow",
  "flip",
  "cards",
  "creative",
];

const VALID_TEXT_ALIGN: TextAlign[] = ["left", "center", "right"];
const VALID_VERTICAL_ALIGN: VerticalAlign[] = ["top", "center", "bottom"];

/**
 * 전체 배너 조회
 * GET /site-banners
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const banners = await SiteBanner.findAll({
      include: [
        {
          model: SiteBannerSlide,
          as: "slides",
          required: false,
        },
      ],
      order: [
        ["id", "ASC"],
        [{ model: SiteBannerSlide, as: "slides" }, "sortOrder", "ASC"],
      ],
    });

    res.status(200).json({
      success: true,
      message: "전체 배너 조회 성공",
      data: banners.map((banner) => ({
        id: banner.id,
        category: banner.category,
        effect: banner.effect,
        isActive: banner.isActive,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt,
        slides: (banner.slides || []).map((slide) => ({
          id: slide.id,
          bannerId: slide.bannerId,
          sortOrder: slide.sortOrder,
          title: slide.title,
          description: slide.description,
          imageUrl: slide.imageUrl,
          imageName: slide.imageName,
          fontSize: slide.fontSize,
          fontColor: slide.fontColor,
          fontFamily: slide.fontFamily,
          textAlign: slide.textAlign,
          verticalAlign: slide.verticalAlign,
          duration: slide.duration,
          isActive: slide.isActive,
          createdAt: slide.createdAt,
          updatedAt: slide.updatedAt,
        })),
      })),
    });
  } catch (error) {
    console.error("전체 배너 조회 실패:", error);
    res.status(500).json({
      success: false,
      message: "전체 배너 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 카테고리별 단건 조회
 * GET /site-banners/:category
 */
router.get(
  "/:category",
  async (req: Request<{ category: string }>, res: Response): Promise<void> => {
    try {
      const { category } = req.params;

      if (!VALID_CATEGORIES.includes(category as BannerCategory)) {
        res.status(400).json({
          success: false,
          message: "유효한 category가 아닙니다.",
        });
        return;
      }

      const banner = await SiteBanner.findOne({
        where: {
          category: category as BannerCategory,
        },
        include: [
          {
            model: SiteBannerSlide,
            as: "slides",
            required: false,
          },
        ],
        order: [[{ model: SiteBannerSlide, as: "slides" }, "sortOrder", "ASC"]],
      });

      if (!banner) {
        res.status(404).json({
          success: false,
          message: "해당 카테고리의 배너를 찾을 수 없습니다.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "배너 조회 성공",
        data: {
          id: banner.id,
          category: banner.category,
          effect: banner.effect,
          isActive: banner.isActive,
          createdAt: banner.createdAt,
          updatedAt: banner.updatedAt,
          slides: (banner.slides || []).map((slide) => ({
            id: slide.id,
            bannerId: slide.bannerId,
            sortOrder: slide.sortOrder,
            title: slide.title,
            description: slide.description,
            imageUrl: `http://113.131.151.103:8080${slide.imageUrl}`,
            imageName: slide.imageName,
            fontSize: slide.fontSize,
            fontColor: slide.fontColor,
            fontFamily: slide.fontFamily,
            textAlign: slide.textAlign,
            verticalAlign: slide.verticalAlign,
            duration: slide.duration,
            isActive: slide.isActive,
            createdAt: slide.createdAt,
            updatedAt: slide.updatedAt,
          })),
        },
      });
    } catch (error) {
      console.error("카테고리 배너 조회 실패:", error);
      res.status(500).json({
        success: false,
        message: "배너 조회 중 오류가 발생했습니다.",
      });
    }
  }
);

/**
 * 저장 API
 * POST /site-banners/save
 */
router.post(
  "/save",
  siteBannerUpload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, effect } = req.body;

      let slides: SaveBannerSlideBody[] = [];

      try {
        slides = JSON.parse(req.body.slides || "[]");
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "slides JSON 파싱에 실패했습니다.",
        });
        return;
      }

      if (!category || !VALID_CATEGORIES.includes(category as BannerCategory)) {
        res.status(400).json({
          success: false,
          message: "유효한 category가 아닙니다.",
        });
        return;
      }

      if (!effect || !VALID_EFFECTS.includes(effect as BannerEffect)) {
        res.status(400).json({
          success: false,
          message: "유효한 effect가 아닙니다.",
        });
        return;
      }

      if (!Array.isArray(slides) || slides.length === 0) {
        res.status(400).json({
          success: false,
          message: "slides는 1개 이상이어야 합니다.",
        });
        return;
      }

      if (slides.length > 5) {
        res.status(400).json({
          success: false,
          message: "슬라이드는 최대 5개까지 가능합니다.",
        });
        return;
      }

      for (const slide of slides) {
        if (
          typeof slide.fontSize !== "number" ||
          slide.fontSize < 20 ||
          slide.fontSize > 120
        ) {
          res.status(400).json({
            success: false,
            message: "fontSize는 20~120 사이여야 합니다.",
          });
          return;
        }

        if (
          typeof slide.duration !== "number" ||
          slide.duration < 1 ||
          slide.duration > 60
        ) {
          res.status(400).json({
            success: false,
            message: "duration은 1~60 사이여야 합니다.",
          });
          return;
        }

        if (!VALID_TEXT_ALIGN.includes(slide.textAlign)) {
          res.status(400).json({
            success: false,
            message: "유효한 textAlign이 아닙니다.",
          });
          return;
        }

        if (!VALID_VERTICAL_ALIGN.includes(slide.verticalAlign)) {
          res.status(400).json({
            success: false,
            message: "유효한 verticalAlign이 아닙니다.",
          });
          return;
        }
      }

      const uploadedFiles = (req.files as Express.Multer.File[]) || [];

      const fileMap = new Map<number, Express.Multer.File>();
      for (const file of uploadedFiles) {
        const match = file.fieldname.match(/^slideImage_(\d+)$/);
        if (match) {
          const slideIndex = Number(match[1]);
          fileMap.set(slideIndex, file);
        }
      }

      const transaction = await sequelize.transaction();

      try {
        const [banner] = await SiteBanner.findOrCreate({
          where: { category: category as BannerCategory },
          defaults: {
            category: category as BannerCategory,
            effect: effect as BannerEffect,
            isActive: true,
          },
          transaction,
        });

        await banner.update(
          {
            effect: effect as BannerEffect,
            isActive: true,
          },
          { transaction }
        );

        await SiteBannerSlide.destroy({
          where: { bannerId: banner.id },
          transaction,
        });

        const slideCreatePayload = slides.map((slide, index) => {
          const uploadedFile = fileMap.get(index);

          const imageUrl = uploadedFile
            ? `/uploads/site-banners/${uploadedFile.filename}`
            : slide.existingImageUrl ?? null;

          const imageName = uploadedFile
            ? uploadedFile.originalname
            : slide.existingImageName ?? null;

          return {
            bannerId: banner.id,
            sortOrder: index + 1,
            title: slide.title ?? null,
            description: slide.description ?? null,
            imageUrl,
            imageName,
            fontSize: slide.fontSize,
            fontColor: slide.fontColor,
            fontFamily: slide.fontFamily,
            textAlign: slide.textAlign,
            verticalAlign: slide.verticalAlign,
            duration: slide.duration,
            isActive: slide.isActive ?? true,
          };
        });

        const createdSlides = await SiteBannerSlide.bulkCreate(
          slideCreatePayload,
          { transaction }
        );

        await transaction.commit();

        res.status(200).json({
          success: true,
          message: "배너와 이미지가 저장되었습니다.",
          data: {
            banner: {
              id: banner.id,
              category: banner.category,
              effect: banner.effect,
            },
            slides: createdSlides,
          },
        });
      } catch (error) {
        await transaction.rollback();
        console.error("배너 저장 실패:", error);

        res.status(500).json({
          success: false,
          message: "배너 저장 중 오류가 발생했습니다.",
        });
      }
    } catch (error: any) {
      console.error("업로드 처리 실패:", error);
      res.status(500).json({
        success: false,
        message: error?.message || "파일 업로드 중 오류가 발생했습니다.",
      });
    }
  }
);

export default router;