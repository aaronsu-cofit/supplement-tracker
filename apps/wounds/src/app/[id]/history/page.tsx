"use client";
import { apiFetch } from "@vitera/lib";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const getConcern = (label) => {
  if (!label) return "unknown";
  if (label.includes("穩定") || label.includes("符合")) return "false";
  return "true";
};

const STATUS_CLASSES = {
  true: "bg-w-orange/[0.12] text-w-orange",
  false: "bg-w-green/[0.12] text-w-green",
  unknown: "bg-white/[0.06] text-white/40",
};

const getNrsMiniClass = (s) =>
  s <= 3 ? "text-w-green" : s <= 6 ? "text-w-orange" : "text-w-red";

export default function WoundHistoryPage() {
  const params = useParams();
  const id = params?.id;
  const [logs, setLogs] = useState([]);
  const [wound, setWound] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!id || fetchedRef.current) return;
    fetchedRef.current = true;

    Promise.all([
      apiFetch(`/api/wounds/${id}`).then((r) => (r.ok ? r.json() : null)),
      apiFetch(`/api/wounds/${id}/logs`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([w, l]) => {
        setWound(w);
        setLogs(Array.isArray(l) ? l : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const daysSince = (dateStr, refDate) => {
    if (!dateStr || !refDate) return "";
    const diff = Math.floor(
      (new Date(dateStr).getTime() - new Date(refDate).getTime()) / 86400000,
    );
    return diff >= 0 ? `第 ${diff + 1} 天` : "";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-[3px] border-white/10 border-t-w-pink rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 pb-24">
      <Link
        href={`/${id}`}
        className="text-white/50 no-underline text-[0.85rem] inline-flex items-center gap-1 mb-4"
      >
        ← 返回傷口
      </Link>
      <h2 className="text-white text-[1.15rem] font-bold m-0 mb-[0.3rem]">
        📅 照護歷程
      </h2>
      {wound && (
        <p className="text-white/60 text-[0.85rem] m-0 mb-5">
          {wound.name} ・ 受傷日期 {wound.date_of_injury?.split("T")[0]}
        </p>
      )}

      {logs.length === 0 ? (
        <div className="text-center p-12 bg-white/[0.03] rounded-[20px] border border-dashed border-white/15">
          <div className="text-[2.5rem] mb-2">📭</div>
          <p className="text-white/50">尚無紀錄</p>
          <Link
            href={`/${id}/scan`}
            className="text-w-pink no-underline font-semibold text-[0.9rem]"
          >
            → 開始第一次掃描
          </Link>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-w-pink/30 to-w-pink/5" />

          {logs.map((log, i) => {
            const concern = getConcern(log.ai_status_label);
            return (
              <div key={log.id || i} className="relative mb-4">
                <div className="absolute -left-6 top-[18px] w-3 h-3 rounded-full bg-w-pink shadow-[0_0_8px_rgba(255,154,158,0.4)]" />
                <div className="bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.08] rounded-[14px] p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/65 text-[0.82rem]">
                      {new Date(log.logged_at || log.date).toLocaleDateString(
                        "zh-TW",
                      )}{" "}
                      {daysSince(log.date, wound?.date_of_injury)}
                    </span>
                    <span
                      className={`${STATUS_CLASSES[concern]} px-2 py-[2px] rounded-[6px] text-[0.75rem] font-semibold`}
                    >
                      {log.ai_status_label || "—"}
                    </span>
                  </div>
                  {log.image_data && (
                    <img
                      src={log.image_data}
                      alt=""
                      className="w-full rounded-[10px] max-h-[160px] object-cover mb-2"
                    />
                  )}
                  {log.ai_assessment_summary && (
                    <p className="text-white/80 text-[0.85rem] leading-relaxed m-0 mb-2 whitespace-pre-wrap">
                      {log.ai_assessment_summary.length > 120
                        ? log.ai_assessment_summary.slice(0, 120) + "..."
                        : log.ai_assessment_summary}
                    </p>
                  )}
                  <div className="flex gap-[0.6rem] flex-wrap">
                    <span
                      className={`text-[0.8rem] ${getNrsMiniClass(log.nrs_pain_score)}`}
                    >
                      🌡️ NRS {log.nrs_pain_score}/10
                    </span>
                    {log.symptoms && (
                      <span className="text-[0.8rem] text-white/60">
                        📝 {log.symptoms}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
