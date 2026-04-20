// backend/src/lib/womenHealingDb.ts
import { db } from './db.js';
import type { ReliefType } from '@prisma/client';

// Returns today's date at midnight UTC, representing the Taiwan date (UTC+8)
function getTaiwanToday(): Date {
  const now = new Date();
  const taiwanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // "2026-04-20"
  return new Date(taiwanDateStr + 'T00:00:00.000Z');
}

export async function getTodayDiary(userId: string) {
  const today = getTaiwanToday();
  return db().diaryEntry.findUnique({
    where: { user_id_date: { user_id: userId, date: today } },
  });
}

export interface UpsertDiaryInput {
  mood: number;
  sleep: number;
  diary?: string;
  aiFeedback?: string;
}

export async function upsertDiaryEntry(userId: string, input: UpsertDiaryInput) {
  const today = getTaiwanToday();
  return db().diaryEntry.upsert({
    where: { user_id_date: { user_id: userId, date: today } },
    create: {
      user_id: userId,
      date: today,
      mood: input.mood,
      sleep: input.sleep,
      diary: input.diary ?? null,
      ai_feedback: input.aiFeedback ?? null,
    },
    update: {
      mood: input.mood,
      sleep: input.sleep,
      diary: input.diary ?? null,
      ai_feedback: input.aiFeedback ?? null,
    },
  });
}

export async function getDiaryEntries(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    db().diaryEntry.findMany({
      where: { user_id: userId },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    db().diaryEntry.count({ where: { user_id: userId } }),
  ]);
  return { entries, total, hasMore: skip + entries.length < total };
}

export interface SaveAssessmentInput {
  resultType: string;
  scores: { A: number; B: number; C: number };
  aiAnalysis: object;
  faceInsight?: string;
}

export async function saveAssessmentResult(userId: string, input: SaveAssessmentInput) {
  return db().assessmentResult.create({
    data: {
      user_id: userId,
      result_type: input.resultType,
      scores: input.scores,
      ai_analysis: input.aiAnalysis,
      face_insight: input.faceInsight ?? null,
    },
  });
}

export interface SaveReliefInput {
  type: ReliefType;
  durationSec: number;
}

export async function saveReliefSession(userId: string, input: SaveReliefInput) {
  return db().reliefSession.create({
    data: {
      user_id: userId,
      type: input.type,
      duration_sec: input.durationSec,
    },
  });
}
