import { FormEvent, useEffect, useRef, useState, type ChangeEvent } from 'react';

import { exportAll, importAll, loadModels, resetDb, saveSettings } from '../lib/api';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../components/Toast';
import type { SettingsInput } from '../types/api';

export function SettingsPage() {
  const { settings, setSettings, reload } = useAppData();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [form, setForm] = useState<SettingsInput>({
    cnyToJpyRate: settings.cnyToJpyRate,
    jpyToCnyRate: settings.jpyToCnyRate,
    aiEndpointUrl: settings.aiEndpointUrl,
    aiApiKey: '',
    aiProtocol: settings.aiProtocol,
    aiModel: settings.aiModel,
  });
  const [models, setModels] = useState<string[]>(settings.aiModel ? [settings.aiModel] : []);
  const [aiExpanded, setAiExpanded] = useState(!settings.hasApiKey);

  useEffect(() => {
    setForm({
      cnyToJpyRate: settings.cnyToJpyRate,
      jpyToCnyRate: settings.jpyToCnyRate,
      aiEndpointUrl: settings.aiEndpointUrl,
      aiApiKey: '',
      aiProtocol: settings.aiProtocol,
      aiModel: settings.aiModel,
    });
    setModels(settings.aiModel ? [settings.aiModel] : []);
  }, [settings]);

  // Auto-load AI models when endpoint+key configured but model list empty
  useEffect(() => {
    if (!settings.hasApiKey || !settings.aiEndpointUrl) return;
    if (models.length > 1) return;
    void (async () => {
      try {
        const next = await loadModels({
          aiEndpointUrl: settings.aiEndpointUrl,
          aiApiKey: '',
          aiProtocol: settings.aiProtocol,
        });
        setModels(next);
      } catch {
        /* silently ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hasApiKey, settings.aiEndpointUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextSettings = await saveSettings(form);
      setSettings(nextSettings);
      toast('设置已保存', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '设置保存失败', 'error');
    }
  }

  async function handleExport() {
    try {
      const payload = await exportAll();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      link.href = url;
      link.download = `money-record-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast('备份已下载', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error');
    }
  }

  async function handleImportPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await importAll(payload);
      await reload();
      toast('恢复成功', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败', 'error');
    }
  }

  async function handleReset() {
    if (!window.confirm('确认清空所有本地账本数据？该操作不可恢复。')) return;
    try {
      await resetDb();
      await reload();
      toast('本地数据已清空', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '清空失败', 'error');
    }
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      {/* Exchange rate — auto synced, read-only display */}
      <div className="settings-row">
        <div>
          <strong>汇率</strong>
          <p className="settings-row__sub">
            1元 ≈ {form.cnyToJpyRate}円 · 1円 ≈ {form.jpyToCnyRate}元 · 每日自动同步
          </p>
        </div>
      </div>

      {/* AI — collapsed by default if already configured */}
      <details
        className="settings-group"
        open={aiExpanded}
        onToggle={(e) => setAiExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="settings-group__summary">
          <strong>AI 配置</strong>
          <span className="settings-row__sub">
            {settings.hasApiKey
              ? `已配置 · ${settings.aiModel || '未选模型'}`
              : '未配置，点击展开填写'}
          </span>
        </summary>

        <label className="field">
          <span>API 地址</span>
          <input
            aria-label="API 地址"
            value={form.aiEndpointUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, aiEndpointUrl: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>API Key</span>
          <input
            aria-label="API Key"
            type="password"
            placeholder={settings.hasApiKey ? settings.aiApiKeyMasked : '输入新的 API Key'}
            value={form.aiApiKey}
            onChange={(event) =>
              setForm((current) => ({ ...current, aiApiKey: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>协议</span>
          <select
            aria-label="协议"
            value={form.aiProtocol}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                aiProtocol: event.target.value as SettingsInput['aiProtocol'],
              }))
            }
          >
            <option value="chat_completions">v1/chat/completions</option>
            <option value="responses">v1/responses</option>
          </select>
        </label>

        <label className="field">
          <span>模型（自动加载）</span>
          <select
            aria-label="模型"
            value={form.aiModel}
            onChange={(event) =>
              setForm((current) => ({ ...current, aiModel: event.target.value }))
            }
          >
            <option value="">请选择模型</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </details>

      <button type="submit" className="button">
        保存设置
      </button>

      {/* Data backup — collapsed by default */}
      <details className="settings-group">
        <summary className="settings-group__summary">
          <strong>数据备份 / 恢复</strong>
          <span className="settings-row__sub">导出、导入、清空本地数据</span>
        </summary>
        <div className="form-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => void handleExport()}
          >
            导出 JSON 备份
          </button>
          <label className="button button--ghost">
            从 JSON 恢复
            <input
              ref={importInputRef}
              aria-label="从 JSON 恢复"
              type="file"
              accept="application/json"
              onChange={(event) => void handleImportPick(event)}
              className="visually-hidden-input"
            />
          </label>
          <button
            type="button"
            className="button button--danger"
            onClick={() => void handleReset()}
          >
            清空本地数据
          </button>
        </div>
      </details>
    </form>
  );
}
