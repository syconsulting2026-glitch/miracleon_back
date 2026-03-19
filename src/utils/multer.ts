import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads", "site-banners");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeBaseName}${ext}`;
    cb(null, uniqueName);
  },
});

const imageOnlyFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("이미지 파일만 업로드할 수 있습니다."));
};

export const siteBannerUpload = multer({
  storage,
  fileFilter: imageOnlyFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

const contentUploadDir = path.join(process.cwd(), "uploads", "site-contents");

if (!fs.existsSync(contentUploadDir)) {
  fs.mkdirSync(contentUploadDir, { recursive: true });
}

const contentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, contentUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeBaseName}${ext}`;
    cb(null, uniqueName);
  },
});

export const siteContentUpload = multer({
  storage: contentStorage,
  fileFilter: imageOnlyFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 30,
  },
});

/** =========================
 *  공지사항 첨부 업로드
 *  ========================= */
const noticeUploadDir = path.join(process.cwd(), "uploads", "notices");

if (!fs.existsSync(noticeUploadDir)) {
  fs.mkdirSync(noticeUploadDir, { recursive: true });
}

const noticeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, noticeUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeBaseName}${ext}`;
    cb(null, uniqueName);
  },
});

const noticeFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = [
    // image
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",

    // document
    "application/pdf",
    "application/haansofthwp",
    "application/x-hwp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".hwp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".zip",
  ];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
    return;
  }

  cb(new Error("허용되지 않는 첨부파일 형식입니다."));
};

export const noticeUpload = multer({
  storage: noticeStorage,
  fileFilter: noticeFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 5,
  },
});

/** =========================
 *  갤러리 이미지 업로드
 *  ========================= */
const galleryUploadDir = path.join(process.cwd(), "uploads", "galleries");

if (!fs.existsSync(galleryUploadDir)) {
  fs.mkdirSync(galleryUploadDir, { recursive: true });
}

const galleryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, galleryUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeBaseName}${ext}`;
    cb(null, uniqueName);
  },
});

const galleryImageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("이미지 파일만 업로드할 수 있습니다."));
};

export const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter: galleryImageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
});