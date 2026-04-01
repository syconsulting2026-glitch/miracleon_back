import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";

// 1. S3 클라이언트 설정
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * 공통 파일 이름 생성 로직
 * S3의 'key'는 폴더 경로를 포함한 전체 파일명을 의미합니다.
 */
const getS3Key = (dir: string) => (_req: any, file: Express.Multer.File, cb: any) => {
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext);
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
  const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeBaseName}${ext}`;
  
  // 예: uploads/site-banners/12345_파일이름.jpg
  cb(null, `${dir}/${uniqueName}`);
};

/**
 * 파일 필터들 (기존 로직 유지)
 */
const imageOnlyFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error("이미지 파일만 업로드할 수 있습니다."));
};

const noticeFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "application/pdf", "application/haansofthwp", "application/x-hwp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint", "text/plain", "application/zip", "application/x-zip-compressed",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".hwp", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".zip"];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) return cb(null, true);
  cb(new Error("허용되지 않는 첨부파일 형식입니다."));
};

// --- S3 업로드 설정 정의 ---

// 1. 사이트 배너
export const siteBannerUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: getS3Key("uploads/site-banners"),
  }),
  fileFilter: imageOnlyFileFilter,
  limits: { fileSize: 30 * 1024 * 1024, files: 5 },
});

// 2. 사이트 컨텐츠
export const siteContentUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: getS3Key("uploads/site-contents"),
  }),
  fileFilter: imageOnlyFileFilter,
  limits: { fileSize: 30 * 1024 * 1024, files: 30 },
});

// 3. 공지사항
export const noticeUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: getS3Key("uploads/notices"),
  }),
  fileFilter: noticeFileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

// 4. 갤러리
export const galleryUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: getS3Key("uploads/galleries"),
  }),
  fileFilter: imageOnlyFileFilter,
  limits: { fileSize: 30 * 1024 * 1024, files: 20 },
});