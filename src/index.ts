import "dotenv/config";
import express from "express";
import cors from "cors";
import { sequelize } from "./db/sequelize";
import "./models";
import siteBannerRouter from "./routes/siteBanner";
import siteContentsRouter from "./routes/siteContents";
import noticesRouter from "./routes/notices";
import galleriesRouter from "./routes/galleries";
import qnasRouter from "./routes/qnas";
import faqRouter from "./routes/faq";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import applyRouter from "./routes/apply";
import captchaRouter from "./routes/captcha";
const app = express();

const corsOptions: cors.CorsOptions = {
  origin: [
    "http://localhost:3000",
    "http://113.131.151.103:3000",
    "http://113.131.151.103:8088",
    "http://www.syconsulting.co.kr",
    "http://syconsulting.co.kr",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use("/site-banners", siteBannerRouter);
app.use("/site-contents", siteContentsRouter);
app.use("/notices", noticesRouter);
app.use("/galleries", galleriesRouter);
app.use("/qnas", qnasRouter);
app.use("/faq", faqRouter);
app.use("/auth", authRouter);
app.use("/apply", applyRouter);
app.use("/captcha", captchaRouter);
async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB 연결 성공");

    const syncMode = (process.env.DB_SYNC_MODE || "alter") as "alter" | "force" | "none";

    if (syncMode !== "none") {
      await sequelize.sync({ [syncMode]: true } as any);
      console.log(`✅ 테이블 생성/동기화 완료 (mode=${syncMode})`);
    } else {
      console.log("ℹ️ DB_SYNC_MODE=none (sync 생략)");
    }

    const PORT = Number(process.env.PORT || 8080);
    app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ 부팅 실패:", err);
    process.exit(1);
  }
}

bootstrap();