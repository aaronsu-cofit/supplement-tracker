'use client';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ResultContent() {
    const { id } = useParams();
    const sp = useSearchParams();
    const analysis = sp.get('analysis') || '';
    const statusLabel = sp.get('status') || '需多加留意觀察';
    const nrs = parseInt(sp.get('nrs') || '0');
    const symptoms = sp.get('symptoms') || '';

    const isConcern = statusLabel.includes('諮詢') || statusLabel.includes('留意');
    const statusColor = isConcern ? '#ffa502' : '#2ed573';
    const statusIcon = isConcern ? '⚠️' : '✅';

    return (
        <div style={{ padding: '1.2rem', maxWidth: 480, margin: '0 auto' }}>
            {/* Status Banner */}
            <div style={{
                background: `linear-gradient(135deg, ${statusColor}18, ${statusColor}08)`,
                border: `1px solid ${statusColor}30`,
                borderRadius: 18, padding: '1.2rem', marginBottom: '1.2rem', textAlign: 'center',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>{statusIcon}</div>
                <div style={{ color: statusColor, fontSize: '1.05rem', fontWeight: 700 }}>{statusLabel}</div>
            </div>

            {/* AI Analysis */}
            <div style={{
                background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                padding: '1.2rem', marginBottom: '1rem',
            }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>🤖 AI 分析</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis}</div>
            </div>

            {/* Pain + Symptoms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.3rem' }}>疼痛指數</div>
                    <div style={{ color: nrs <= 3 ? '#2ed573' : nrs <= 6 ? '#ffa502' : '#ff4757', fontSize: '1.5rem', fontWeight: 800 }}>{nrs}/10</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.3rem' }}>回報症狀</div>
                    <div style={{ color: '#ff9a9e', fontSize: '0.85rem', fontWeight: 600 }}>{symptoms || '皆無'}</div>
                </div>
            </div>

            {/* Nurse Tip */}
            <div style={{
                background: 'rgba(255,154,158,0.08)', border: '1px solid rgba(255,154,158,0.15)',
                borderRadius: 14, padding: '0.8rem 1rem', marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span>👩‍⚕️</span>
                    <span style={{ color: '#ff9a9e', fontSize: '0.85rem', fontWeight: 600 }}>護理師叮嚀</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    {isConcern
                        ? '建議持續觀察傷口狀態，若症狀加重請及時就醫。保持傷口清潔乾燥。'
                        : '傷口恢復良好，請繼續保持目前的照護方式。定期拍照追蹤更好掌握變化。'
                    }
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
                <Link href={`/wounds/${id}/history`} style={{
                    flex: 1, padding: '0.9rem', borderRadius: 12, textAlign: 'center', textDecoration: 'none',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                }}>📅 查看歷程</Link>
                <Link href={`/wounds/${id}`} style={{
                    flex: 1, padding: '0.9rem', borderRadius: 12, textAlign: 'center', textDecoration: 'none',
                    background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                }}>🏠 回到首頁</Link>
            </div>

            {/* Disclaimer */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.5 }}>
                ⚠️ 以上分析由 AI 輔助生成，僅供參考，不構成醫療診斷。如有疑慮請諮詢專業醫護人員。
            </p>
        </div>
    );
}

export default function WoundResultPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}>
            <ResultContent />
        </Suspense>
    );
}
