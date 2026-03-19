import svgCaptcha from "svg-captcha";
import crypto from "crypto";

type CaptchaRecord = {
  text: string;
  createdAt: number;
};

const CAPTCHA_TTL_MS = 1000 * 60 * 5; // 5분
const store = new Map<string, CaptchaRecord>();

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.createdAt > CAPTCHA_TTL_MS) {
      store.delete(key);
    }
  }
}

export function generateCaptcha() {
  cleanup();

  const captcha = svgCaptcha.create({
    size: 5,
    noise: 2,
    ignoreChars: "0oO1iIl",
    color: true,
    background: "#ffffff",
    width: 180,
    height: 60,
    fontSize: 42,
  });

  const captchaId = crypto.randomUUID();

  store.set(captchaId, {
    text: captcha.text.toLowerCase(),
    createdAt: Date.now(),
  });

  return {
    captchaId,
    image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString("base64")}`,
  };
}

export function verifyCaptcha(params: {
  captchaId: string;
  captchaText: string;
  captchaStartedAt?: number;
  minFillMs?: number;
}) {
  cleanup();

  const { captchaId, captchaText, captchaStartedAt, minFillMs = 1200 } = params;

  const saved = store.get(captchaId);

  if (!saved) {
    return { ok: false, message: "자동입력방지가 만료되었거나 유효하지 않습니다." };
  }

  const now = Date.now();

  if (captchaStartedAt && now - captchaStartedAt < minFillMs) {
    store.delete(captchaId);
    return { ok: false, message: "자동입력방지를 너무 빠르게 입력했습니다. 다시 시도해 주세요." };
  }

  if (now - saved.createdAt > CAPTCHA_TTL_MS) {
    store.delete(captchaId);
    return { ok: false, message: "자동입력방지 유효시간이 지났습니다. 새로고침 후 다시 시도해 주세요." };
  }

  if (saved.text !== captchaText.trim().toLowerCase()) {
    store.delete(captchaId);
    return { ok: false, message: "자동입력방지 문자가 올바르지 않습니다." };
  }

  store.delete(captchaId);
  return { ok: true };
}