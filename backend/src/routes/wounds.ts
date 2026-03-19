import { Hono } from "hono";
import { softAuthMiddleware } from "../middleware/authMiddleware.js";
import {
  initializeDatabase,
  getWounds,
  createWound,
  getWoundById,
  updateWound,
  archiveWound,
  getWoundLogs,
  createWoundLog,
  getWoundLogsAdmin,
  getAllWoundsAdmin,
} from "../lib/db.js";
import { callGeminiText } from "../lib/ai.js";

const wounds = new Hono();
wounds.use("*", softAuthMiddleware);

// GET /api/wounds
wounds.get("/", async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get("userId");
    console.log(`[GET /api/wounds] userId: ${userId}`);
    const data = await getWounds(userId);
    console.log(`[GET /api/wounds] data length: ${data?.length}`);
    return c.json(data);
  } catch (error) {
    console.error("[GET /api/wounds] getWounds error:", error);
    return c.json({ error: "Failed to fetch wounds" }, 500);
  }
});

// POST /api/wounds
wounds.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();
    if (!data.name?.trim()) data.name = "未命名傷口";
    const wound = await createWound(userId, data);
    return c.json(wound, 201);
  } catch (error) {
    return c.json({ error: "Failed to create wound" }, 500);
  }
});

// GET /api/wounds/admin
wounds.get("/admin", async (c) => {
  try {
    const data = await getAllWoundsAdmin();
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Failed to fetch wounds" }, 500);
  }
});

// GET /api/wounds/:woundId
wounds.get("/:woundId", async (c) => {
  try {
    const userId = c.get("userId");
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);
    const wound = await getWoundById(userId, parsedId);
    if (!wound) return c.json({ error: "Wound not found" }, 404);
    return c.json(wound);
  } catch (error) {
    return c.json({ error: "Failed to fetch wound" }, 500);
  }
});

// PATCH /api/wounds/:woundId
wounds.patch("/:woundId", async (c) => {
  try {
    const userId = c.get("userId");
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);
    const data = await c.req.json();
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.wound_type !== undefined) updates.wound_type = data.wound_type;
    if (data.body_location !== undefined)
      updates.body_location = data.body_location;
    if (data.date_of_injury !== undefined)
      updates.date_of_injury = data.date_of_injury;
    if (Object.keys(updates).length === 0)
      return c.json({ error: "No fields to update" }, 400);
    const result = await updateWound(parsedId, userId, updates);
    return c.json({ success: true, wound: result });
  } catch (error) {
    return c.json({ error: "Failed to update wound" }, 500);
  }
});

// DELETE /api/wounds/:woundId — archive
wounds.delete("/:woundId", async (c) => {
  try {
    const userId = c.get("userId");
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);
    await archiveWound(userId, parsedId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to archive wound" }, 500);
  }
});

// GET /api/wounds/:woundId/logs
wounds.get("/:woundId/logs", async (c) => {
  try {
    const userId = c.get("userId");
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);
    const logs = await getWoundLogs(userId, parsedId);
    return c.json(logs);
  } catch (error) {
    return c.json({ error: "Failed to fetch logs" }, 500);
  }
});

// POST /api/wounds/:woundId/logs
wounds.post("/:woundId/logs", async (c) => {
  try {
    const userId = c.get("userId");
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);
    const data = await c.req.json();
    const log = await createWoundLog(userId, parsedId, data);
    return c.json(log, 201);
  } catch (error) {
    return c.json({ error: "Failed to create wound log" }, 500);
  }
});

// POST /api/wounds/:woundId/soap
wounds.post("/:woundId/soap", async (c) => {
  try {
    const parsedId = parseInt(c.req.param("woundId"), 10);
    if (isNaN(parsedId)) return c.json({ error: "Invalid wound ID" }, 400);

    const logs = await getWoundLogsAdmin(parsedId);
    if (!logs || logs.length === 0)
      return c.json({ error: "No logs available for SOAP generation" }, 400);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return c.json({ error: "GEMINI_API_KEY not configured" }, 500);

    const timelineData = logs
      .map((log) => {
        const dateStr = new Date(log.logged_at).toLocaleDateString("zh-TW");
        return `[日期: ${dateStr}]\n疼痛指數(NRS): ${log.nrs_pain_score}/10\n觀察症狀: ${log.symptoms || "無"}\n單日AI摘要: ${log.ai_assessment_summary || "無紀錄"}\n病程標籤: ${log.ai_status_label || "穩定"}\n---`;
      })
      .join("\n");

    const prompt = `你是一位專業的外科傷口照護護理師。請根據以下病患過去數天的「居家傷口照護紀錄」，撰寫一份專業的【護理紀錄 SOAP Note】。

【病患居家照護紀錄 (由近到遠)】:
${timelineData}

【請嚴格使用以下 SOAP 格式輸出 (繁體中文)】：
S (Subjective - 主觀資料): 總結病患這段時間回報的痛感變化與主訴症狀。
O (Objective - 客觀資料): 總結 AI 連續觀察到的傷口客觀變化。
A (Assessment - 評估): 護理師對於傷口癒合進度的綜合評估。
P (Plan - 計畫): 建議接下來的照護處置。

請直接輸出 SOAP 內容，不要加上任何開場白或自我介紹。`;

    const soapNote = await callGeminiText(apiKey, prompt);
    return c.json({ success: true, soap_note: soapNote });
  } catch (error) {
    console.error("SOAP error:", error);
    return c.json({ error: "Failed to generate SOAP Note" }, 500);
  }
});

export default wounds;
