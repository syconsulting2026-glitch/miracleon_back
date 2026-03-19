import { Router } from "express";
import { getFirebaseAdmin } from "../firebase";
import { tokenStore } from "../store/token.store";
import { RegisterTokenBody, SendToTokenBody, SendToUserBody } from "../types";
import { FcmToken } from "../models";

const fcmRouter = Router();

/**
 * ✅ 토큰 등록/갱신
 * POST /api/fcm/register
 * body: { userId, token }
 */
fcmRouter.post("/register", async (req, res) => {
  const parsed = RegisterTokenBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { deviceId, token, platform, deviceModel, osVersion, appVersion } = parsed.data;

  await FcmToken.upsert({
    deviceId,
    token,
    platform,
    deviceModel: deviceModel ?? null,
    osVersion: osVersion ?? null,
    appVersion: appVersion ?? null,
    isActive: true,
    lastSeenAt: new Date(),
  });

  return res.json({ ok: true });
});

/**
 * ✅ 특정 토큰으로 발송(테스트용)
 * POST /api/fcm/send-to-token
 * body: { token, title?, body?, url? }
 */
fcmRouter.post("/send-to-token", async (req, res) => {
  const parsed = SendToTokenBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const admin = getFirebaseAdmin();
  const { token, title, body, url } = parsed.data;

  try {
    const message = {
      token,
      notification: {
        title: title ?? "알림",
        body: body ?? "새 메시지가 도착했습니다.",
      },
      data: {
        url: url ?? "http://www.syconsulting.co.kr/apply/list",
      },
    };

    const messageId = await admin.messaging().send(message as any);
    return res.json({ ok: true, messageId });
  } catch (e: any) {
    // 토큰이 더 이상 유효하지 않으면 정리
    const msg = String(e?.message ?? e);
    if (msg.includes("registration-token-not-registered")) {
      tokenStore.removeToken(token);
    }
    return res.status(500).json({ ok: false, error: msg });
  }
});

/**
 * ✅ userId에 매핑된 모든 토큰으로 발송(실사용 핵심)
 * POST /api/fcm/send-to-user
 * body: { userId, title?, body?, url? }
 */
fcmRouter.post("/send-to-user", async (req, res) => {
  const parsed = SendToUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const admin = getFirebaseAdmin();
  const { userId, title, body, url } = parsed.data;

  const tokens = tokenStore.getTokensByUser(userId);
  if (!tokens.length) {
    return res.status(404).json({ ok: false, error: "No tokens for this userId" });
  }

  // FCM 멀티캐스트는 최대 500개
  const targetTokens = tokens.slice(0, 500);

  try {
    const resp = await admin.messaging().sendEachForMulticast({
      tokens: targetTokens,
      notification: {
        title: title ?? "알림",
        body: body ?? "새 메시지가 도착했습니다.",
      },
      data: {
        url: url ?? "http://www.syconsulting.co.kr/apply/list",
      },
    } as any);

    // 실패 토큰 정리(특히 not registered)
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const errMsg = r.error?.message ?? "";
        if (errMsg.includes("registration-token-not-registered")) {
          tokenStore.removeToken(targetTokens[i]);
        }
      }
    });

    return res.json({
      ok: true,
      successCount: resp.successCount,
      failureCount: resp.failureCount,
      results: resp.responses.map((r, i) => ({
        token: targetTokens[i],
        ok: r.success,
        error: r.error?.message,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

export default fcmRouter;