import { FormEvent, useEffect, useRef, useState, type ChangeEvent } from 'react';

import { exportAll, importAll, loadModels, resetDb, saveSettings } from '../lib/api';
import { useAppData } from '../hooks/useAppData';
import type { SettingsInput } from '../types/api';

export function SettingsPage() {
  const { settings, setSettings, reload } = useAppData();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<SettingsInput>({
    cnyToJpyRate: settings.cnyToJpyRate,
    jpyToCnyRate: settings.jpyToCnyRate,
    aiEndpointUrl: settings.aiEndpointUrl,
    aiApiKey: '',
    aiProtocol: settings.aiProtocol,
    aiModel: settings.aiModel,
  });
  const [models, setModels] = useState<string[]>(settings.aiModel ? [settings.aiModel] : []);
  const [message, setMessage] = useState('');

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextSettings = await saveSettings(form);
      setSettings(nextSettings);
      setMessage('设置已保存');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '设置保存失败');
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
      setMessage('备份已下载');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出失败');
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
      setMessage('恢复成功');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '恢复失败');
    }
  }

  async function handleReset() {
    if (!window.confirm('确认清空所有本地账本数据？该操作不可恢复。')) return;
    try {
      await resetDb();
      await reload();
      setMessage('本地数据已清空');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '清空失败');
    }
  }

  async function handleLoadModels() {
    try {
      const nextModels = await loadModels({
        aiEndpointUrl: form.aiEndpointUrl,
        aiApiKey: form.aiApiKey,
        aiProtocol: form.aiProtocol,
      });
      setModels(nextModels);
      if (!form.aiModel && nextModels[0]) {
        setForm((current) => ({ ...current, aiModel: nextModels[0] }));
      }
      setMessage(`已加载 ${nextModels.length} 个模型`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '模型加载失败');
    }
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      <div className="panel__header">
        <h2>设置</h2>
        <p>保存汇率、API 地址、Key 和模型。</p>
      </div>

      <label className="field">
        <span>人民币兑日元</span>
        <input
          aria-label="人民币兑日元"
          type="number"
          value={form.cnyToJpyRate}
          onChange={(event) =>
            setForm((current) => ({ ...current, cnyToJpyRate: Number(event.target.value) }))
          }
        />
      </label>

      <label className="field">
        <span>日元兑人民币</span>
        <input
          aria-label="日元兑人民币"
          type="number"
          step="0.0001"
          value={form.jpyToCnyRate}
          onChange={(event) =>
            setForm((current) => ({ ...current, jpyToCnyRate: Number(event.target.value) }))
          }
        />
      </label>

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
          onChange={(event) => setForm((current) => ({ ...current, aiApiKey: event.target.value }))}
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

      <div className="field field--inline">
        <label className="field">
          <span>模型</span>
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
        <button type="button" className="button button--ghost" onClick={handleLoadModels}>
          加载模型列表
        </button>
      </div>

      <button type="submit" className="button">
        保存设置
      </button>

      <div className="panel__header">
        <h2>数据备份</h2>
        <p>账本数据存在手机本地浏览器里，请定期导出到云盘或微信。</p>
      </div>

      <div className="form-actions">
        <button type="button" className="button" onClick={() => void handleExport()}>
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
        <button type="button" className="button button--ghost" onClick={() => void handleReset()}>
          清空本地数据
        </button>
      </div>

      {message ? <p className="status">{message}</p> : null}
    </form>
  );
}
