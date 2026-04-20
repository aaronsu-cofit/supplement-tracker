'use client';
import { apiFetch, getApiUrl } from '@vitera/lib';
import { useState } from 'react';
import type { LineOA } from '../../../../types';

interface Props {
  oa: LineOA;
  onChange: (oa: LineOA) => void;
}

interface EditForm {
  name: string;
  description: string;
  channel_access_token: string;
  channel_secret: string;
  default_agent_id: string;
  ai_skill_platform_url: string;
  ai_skill_platform_api_key: string;
}

export default function OaSettingsTab({ oa, onChange }: Props) {
  const [form, setForm] = useState<EditForm>({
    name: oa.name,
    description: oa.description || '',
    channel_access_token: '',
    channel_secret: '',
    default_agent_id: oa.default_agent_id || '',
    ai_skill_platform_url: oa.ai_skill_platform_url || '',
    ai_skill_platform_api_key: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testingAi, setTestingAi] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        ...(form.channel_access_token && { channel_access_token: form.channel_access_token }),
        ...(form.channel_secret && { channel_secret: form.channel_secret }),
        ...(form.default_agent_id && { default_agent_id: form.default_agent_id }),
        ai_skill_platform_url: form.ai_skill_platform_url,
        ...(form.ai_skill_platform_api_key && { ai_skill_platform_api_key: form.ai_skill_platform_api_key }),
      };
      const res = await apiFetch(`/api/line/oa/${oa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      onChange({ ...oa, ...data.oa });
      setStatus({ type: 'success', message: '已儲存' });
      // Clear secret fields after save
      setForm(p => ({ ...p, channel_access_token: '', channel_secret: '', ai_skill_platform_api_key: '' }));
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshBotInfo = async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/api/line/oa/${oa.id}/refresh-bot-info`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '抓取失敗');
      onChange({ ...oa, line_destination_id: data.bot_user_id });
      setStatus({ type: 'success', message: `已抓取 bot ID: ${data.bot_user_id}` });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestAiPlatform = async () => {
    setTestingAi(true);
    try {
      const res = await apiFetch(`/api/line/oa/${oa.id}/test-ai-platform`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setStatus({ type: 'success', message: `Platform 可達 (HTTP ${data.status}, ${data.latency_ms}ms)` });
      } else {
        setStatus({ type: 'error', message: `無法連線: ${data.error || 'HTTP ' + data.status}` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl flex flex-col gap-4">
      {status && (
        <div className={`hq-alert ${status.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
          {status.message}
        </div>
      )}

      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">基本資訊</h3>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">OA 名稱</label>
          <input className="hq-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">說明</label>
          <input className="hq-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
      </div>

      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">LINE 憑證</h3>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel Access Token（留空=不變）</label>
          <input type="password" className="hq-input font-mono" value={form.channel_access_token} onChange={e => setForm(p => ({ ...p, channel_access_token: e.target.value }))} placeholder="新 Token" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel Secret（留空=不變）</label>
          <input type="password" className="hq-input font-mono" value={form.channel_secret} onChange={e => setForm(p => ({ ...p, channel_secret: e.target.value }))} placeholder="新 Secret" />
        </div>
        <div className="text-xs text-slate-500 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Webhook destination:</span>
            {oa.line_destination_id ? (
              <code className="bg-slate-100 px-1.5 rounded font-mono">{oa.line_destination_id}</code>
            ) : (
              <span className="text-amber-600">尚未抓取</span>
            )}
            <button onClick={handleRefreshBotInfo} disabled={refreshing} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">
              {refreshing ? '抓取中...' : '↻ 抓取'}
            </button>
          </div>
          <div>
            Webhook URL：<code className="bg-slate-100 px-1.5 rounded font-mono">{getApiUrl()}/webhook/line</code>
          </div>
        </div>
      </div>

      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">AI Skill Platform</h3>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default Agent ID</label>
          <input className="hq-input font-mono" value={form.default_agent_id} onChange={e => setForm(p => ({ ...p, default_agent_id: e.target.value }))} placeholder="e.g. nutrition_analyst" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform URL</label>
          <input className="hq-input font-mono" value={form.ai_skill_platform_url} onChange={e => setForm(p => ({ ...p, ai_skill_platform_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API Key（留空=不變）</label>
          <input type="password" className="hq-input font-mono" value={form.ai_skill_platform_api_key} onChange={e => setForm(p => ({ ...p, ai_skill_platform_api_key: e.target.value }))} placeholder="新 API Key" />
        </div>
        {oa.ai_skill_platform_url && (
          <div>
            <button onClick={handleTestAiPlatform} disabled={testingAi} className="text-xs px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">
              {testingAi ? '測試中...' : '↻ 測連線'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving} className="hq-btn-primary">
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}
