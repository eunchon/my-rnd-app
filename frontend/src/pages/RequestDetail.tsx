import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchJSON, patchJSON, deleteJSON } from '../api';
import { useT } from '../i18n';
import { formatKRW } from '../utils/currency';

type DetailRequest = {
  id: string;
  title: string;
  customerName: string;
  productArea: string;
  productModel: string | null;
  category: string;
  expectedRevenue: number | null;
  importanceFlag: string;
  submittedAt: string;
  customerDeadline: string;
  currentStage: string;
  currentStatus: string | null;
  createdByDept: string;
  createdByUserId: string;
  createdByName?: string | null;
  region: string | null;
  rawCustomerText: string;
  salesSummary: string;
  keywords: { id: string; keyword: string }[];
  rdGroups: { id: string; role: string | null; rdGroup: { id: string; name: string; category: string | null } }[];
  stageHistory: { id: string; stage: string; enteredAt: string; exitedAt: string | null }[];
  techAreas?: { id?: string; groupName?: string | null; code?: string | null; label?: string | null }[];
  technicalNotes?: string | null;
  customerInfluenceScore?: number | null;
};

export default function RequestDetail({
  requestId,
  openInModal,
  onClose,
  readOnly,
}: {
  requestId?: string;
  openInModal?: boolean;
  onClose?: () => void;
  readOnly?: boolean;
}) {
  const params = useParams<{ id: string }>();
  const id = requestId || params.id;
  const t = useT();
  const navigate = useNavigate();
  const [item, setItem] = useState<DetailRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageUpdate, setStageUpdate] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [rdGroups, setRdGroups] = useState<{ id: string; name: string; category: string | null }[]>([]);

  useEffect(() => {
    if (readOnly) {
      setEditing(false);
      setDraft(null);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJSON<DetailRequest>(`/requests/${id}`);
        setItem(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await fetchJSON<{ id: string; name: string; category: string | null }[]>('/requests/rd-groups');
        setRdGroups(data);
      } catch {
        // ignore
      }
    };
    loadGroups();
  }, []);

  if (!id) return null;
  if (loading) return <div style={{ padding: 16 }}>{t('loading')}</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!item) return null;

  const stageOptions = ['IDEATION', 'REVIEW', 'CONFIRM', 'PROJECT', 'REJECTED', 'RELEASE'];
  const isReadOnly = !!readOnly;

  async function updateStage() {
    if (isReadOnly) return;
    if (!item) return;
    if (!stageUpdate && !statusUpdate) return;
    setSaving(true);
    try {
      const updated = await patchJSON<DetailRequest>(`/requests/${item.id}`, {
        ...(stageUpdate ? { currentStage: stageUpdate } : {}),
        ...(statusUpdate ? { currentStatus: statusUpdate } : {}),
      });
      setItem(updated);
      setStageUpdate('');
      setStatusUpdate('');
    } catch (e: any) {
      setError(e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!openInModal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/list" style={{ textDecoration: 'none', color: '#2563eb' }}>{t('back_to_list')}</Link>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{item.title}</div>
          <div style={{ color: '#475569', fontSize: 13 }}>{item.customerName} · {item.productArea}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666' }}>{t('th_stage')}: {item.currentStage}</span>
          {!isReadOnly && (
            <>
              <select value={stageUpdate} onChange={(e) => setStageUpdate(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8 }}>
                <option value="">{t('filter_stage_all')}</option>
                {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                placeholder="상태 메모"
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <button disabled={!item || saving || (!stageUpdate && !statusUpdate)} onClick={updateStage} style={{ padding: '8px 12px' }}>
                {saving ? 'Saving...' : 'Update'}
              </button>
            </>
          )}
          {!editing && !isReadOnly && (
            <button
              onClick={() => {
                setEditing(true);
                setDraft({
                  title: item.title,
                  customerName: item.customerName,
                  productArea: item.productArea,
                  expectedRevenue: item.expectedRevenue ?? '',
                  importanceFlag: item.importanceFlag,
                  salesSummary: item.salesSummary,
                  rawCustomerText: item.rawCustomerText,
                  customerDeadline: item.customerDeadline,
                  createdByUserId: item.createdByUserId,
                  createdByDept: item.createdByDept,
                  createdByName: item.createdByName ?? item.createdByUserId ?? '',
                  rdGroupIds: item.rdGroups.map((x) => x.rdGroup.id),
                });
              }}
            >
              Edit
            </button>
          )}
          {editing && !isReadOnly && (
            <>
              <button onClick={() => { setEditing(false); setDraft(null); }}>Cancel</button>
              <button
                onClick={async () => {
                  if (!draft) return;
                  const nextAuthorName = (draft.createdByName ?? '').trim();
                  const nextAuthorId = nextAuthorName || draft.createdByUserId || item.createdByUserId;
                  setSaving(true);
                  try {
                    const payload: any = {
                      expectedRevenue: draft.expectedRevenue === '' ? null : Number(draft.expectedRevenue ?? item.expectedRevenue ?? 0),
                      importanceFlag: draft.importanceFlag ?? item.importanceFlag,
                      customerDeadline: draft.customerDeadline
                        ? new Date(draft.customerDeadline).toISOString()
                        : item.customerDeadline,
                      createdByUserId: nextAuthorId,
                      createdByDept: draft.createdByDept || item.createdByDept,
                      createdByName: nextAuthorName || item.createdByName || '',
                      salesSummary: draft.salesSummary ?? item.salesSummary,
                      rawCustomerText: draft.rawCustomerText ?? item.rawCustomerText,
                      rdGroupIds: draft.rdGroupIds ?? item.rdGroups.map((x) => x.rdGroup.id),
                      title: draft.title ?? item.title,
                      customerName: draft.customerName ?? item.customerName,
                      productArea: draft.productArea ?? item.productArea,
                    };
                    const updated = await patchJSON<DetailRequest>(`/requests/${item.id}`, payload);
                    setItem(updated);
                    setEditing(false);
                    setDraft(null);
                  } catch (e: any) {
                    setError(e?.message || 'Save failed');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save
              </button>
            </>
          )}
          {!isReadOnly && (
            <button
              style={{ background: '#ef4444', color: '#fff', border: '1px solid #dc2626', padding: '8px 12px', borderRadius: 8, fontWeight: 700, boxShadow: '0 6px 12px rgba(239,68,68,0.35)' }}
              onClick={async () => {
                if (!confirm('정말 삭제하시겠습니까?')) return;
                setSaving(true);
                try {
                  await deleteJSON(`/requests/${item.id}`);
                  if (openInModal && onClose) onClose();
                  else navigate('/list');
                } catch (e: any) {
                  setError(e?.message || 'Delete failed');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Delete
            </button>
          )}
          {openInModal && <button onClick={onClose}>Close</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
        <InfoRow label="예상 매출" value={editing ? (
          <input
            value={draft?.expectedRevenue ?? ''}
            onChange={(e) => setDraft({ ...draft, expectedRevenue: e.target.value })}
          />
        ) : formatKRW(item.expectedRevenue)} />
        <InfoRow label="중요도" value={editing ? (
          <select value={draft?.importanceFlag} onChange={(e) => setDraft({ ...draft, importanceFlag: e.target.value })}>
            {['MUST','SHOULD','NICE'].map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        ) : item.importanceFlag} />
        <InfoRow label="마감일" value={editing ? (
          <input
            type="date"
            value={(draft?.customerDeadline ?? item.customerDeadline)?.toString().slice(0, 10)}
            onChange={(e) => setDraft({ ...draft, customerDeadline: e.target.value })}
          />
        ) : new Date(item.customerDeadline).toLocaleDateString()} />
        <InfoRow label="작성 부서" value={editing ? (
          <input value={draft?.createdByDept ?? item.createdByDept} onChange={(e) => setDraft({ ...draft, createdByDept: e.target.value })} />
        ) : item.createdByDept} />
        <InfoRow label="작성자" value={editing ? (
          <input
            value={draft?.createdByName ?? draft?.createdByUserId ?? item.createdByName ?? item.createdByUserId}
            onChange={(e) => {
              const next = e.target.value;
              setDraft({ ...draft, createdByName: next, createdByUserId: next });
            }}
          />
        ) : (item.createdByName || item.createdByUserId)} />
      </div>

      <Card title="고객 원문">
        {editing ? (
          <textarea
            value={draft?.rawCustomerText ?? ''}
            onChange={(e) => setDraft({ ...draft, rawCustomerText: e.target.value })}
            style={{ width: '100%', minHeight: 80 }}
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.rawCustomerText}</div>
        )}
      </Card>

      <Card title="영업 요약">
        {editing ? (
          <textarea
            value={draft?.salesSummary ?? ''}
            onChange={(e) => setDraft({ ...draft, salesSummary: e.target.value })}
            style={{ width: '100%', minHeight: 100 }}
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.salesSummary}</div>
        )}
      </Card>

      {item.technicalNotes && (
        <Card title="기술 요구/제약 메모">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {item.technicalNotes
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, idx) => {
                const [key, ...rest] = line.split(':');
                const label = rest.length ? key.trim() : 'Note';
                const value = rest.length ? rest.join(':').trim() : line;
                return (
                  <div
                    key={`${line}-${idx}`}
                    style={{
                      flex: '1 1 240px',
                      minWidth: 220,
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: '#f8fafc',
                      boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{value || '-'}</div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
      {/* 고객 영향력 점수 및 선택형 기술 요구 섹션 제거 */}

      <Card title="담당 R&D 그룹">
        {editing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {rdGroups.map((g) => {
              const checked = (draft?.rdGroupIds ?? item.rdGroups.map((x) => x.rdGroup.id)).includes(g.id);
              return (
                <label key={g.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 8px', background: checked ? '#e0f2fe' : '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const prev = (draft?.rdGroupIds ?? item.rdGroups.map((x) => x.rdGroup.id));
                      const next = e.target.checked ? [...new Set([...prev, g.id])] : prev.filter((id) => id !== g.id);
                      setDraft({ ...draft, rdGroupIds: next });
                    }}
                    style={{ marginRight: 6 }}
                  />
                  {g.name} {g.category ? `(${g.category})` : ''}
                </label>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.rdGroups.map((g) => (
              <span key={g.id} style={{ padding: '4px 8px', borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                {g.rdGroup.name}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title="단계 히스토리">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th>Stage</th><th>Entered</th><th>Exited</th></tr></thead>
          <tbody>
            {item.stageHistory.map((s) => (
              <tr key={s.id}>
                <td>{s.stage}</td>
                <td>{new Date(s.enteredAt).toLocaleDateString()}</td>
                <td>{s.exitedAt ? new Date(s.exitedAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );

  if (openInModal) return body;
  return <div>{body}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8, borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 700 }}>{value}</span>
    </div>
  );
}
