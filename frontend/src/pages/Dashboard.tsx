import React, { useEffect, useMemo, useState } from 'react';
import { fetchJSON } from '../api';
import { Chart, BarController, BarElement, BubbleController, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
Chart.register(BarController, BarElement, BubbleController, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
import { useT } from '../i18n';
import { formatKRW } from '../utils/currency';
import { useNavigate } from 'react-router-dom';

const palette = {
  ink: '#0f172a',
  sub: '#475569',
  accent: '#2563eb',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  grayLine: '#e2e8f0',
};

export default function Dashboard() {
  const t = useT();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productArea, setProductArea] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [keywordsStats, setKeywordsStats] = useState<any[]>([]);
  const [rdGroupLoad, setRdGroupLoad] = useState<any[]>([]);
  const [scored, setScored] = useState<any[]>([]);
  const [modal, setModal] = useState<{ title: string; items: any[] } | null>(null);
  const [urgentOnly, setUrgentOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const v = localStorage.getItem('dash_urgentOnly');
    return v === 'true';
  });
  const [maxRows, setMaxRows] = useState<number>(() => {
    if (typeof window === 'undefined') return 60;
    const v = Number(localStorage.getItem('dash_maxRows'));
    return Number.isFinite(v) && v >= 10 ? v : 60;
  });
  const [urgentDays, setUrgentDays] = useState<number>(() => {
    if (typeof window === 'undefined') return 14;
    const v = Number(localStorage.getItem('dash_urgentDays'));
    return [7, 14, 21].includes(v) ? v : 14;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dash_urgentOnly', String(urgentOnly));
    localStorage.setItem('dash_maxRows', String(maxRows));
    localStorage.setItem('dash_urgentDays', String(urgentDays));
  }, [urgentOnly, maxRows, urgentDays]);

  async function loadData() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (productArea) qs.set('productArea', productArea);
    if (stage) qs.set('stage', stage);
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    const res = await fetchJSON<{ items: any[]; total: number }>(`/requests?${qs.toString()}`);
    setRequests(res.items);
    const kw = await fetchJSON<any[]>(`/requests/stats/keywords`);
    setKeywordsStats(kw);
    const rd = await fetchJSON<any[]>(`/requests/stats/rd-groups`);
    setRdGroupLoad(rd);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(); }, [productArea, stage, fromDate, toDate]);

  const kpis = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const totalThisYear = requests.filter(r => new Date(r.submittedAt) >= yearStart).length;
    const byStage: Record<string, number> = {};
    const deadlineRisk = requests.filter(r => {
      const d = new Date(r.customerDeadline);
      const diff = (d.getTime() - now.getTime()) / (1000*3600*24);
      return diff <= 7 && ['IDEATION','REVIEW','CONFIRM'].includes(r.currentStage);
    }).length;
    for (const r of requests) byStage[r.currentStage] = (byStage[r.currentStage] || 0) + 1;
    return { totalThisYear, byStage, deadlineRisk };
  }, [requests]);

  function stageLabel(code: string) {
    const map: Record<string, string> = {
      IDEATION: t('stages_IDEATION'),
      REVIEW: t('stages_REVIEW'),
      CONFIRM: t('stages_CONFIRM'),
      PROJECT: t('stages_PROJECT'),
      REJECTED: t('stages_REJECTED'),
      RELEASE: t('stages_RELEASE'),
    };
    return map[code] || code;
  }

  useEffect(() => {
    const now = Date.now();
    const enriched = requests.map((r) => {
      const revenue = r.expectedRevenue || 0;
      const deadline = new Date(r.customerDeadline).getTime();
      const daysLeft = Math.ceil((deadline - now) / (1000 * 3600 * 24));
      const importance = r.importanceFlag === 'MUST' ? 3 : r.importanceFlag === 'SHOULD' ? 2 : 1;
      const influenceRaw: any = (r as any).customerInfluenceScore;
      const influence =
        influenceRaw !== undefined && influenceRaw !== null && Number.isFinite(Number(influenceRaw))
          ? Number(influenceRaw)
          : Math.max(3, importance * 2 + (revenue > 500_000_000 ? 2 : revenue > 100_000_000 ? 1 : 0));
      return { ...r, _daysLeft: daysLeft, _importance: importance, _rev: revenue, _influence: Math.min(10, influence) };
    });
    setScored(enriched);
  }, [requests]);

  return (
    <>
    <div className="grid">
      <div className="card">
        <div className="section-title">{t('filters_title') || 'Filters'}</div>
        <div className="grid grid-3">
          <div>
            <label>{t('filter_area_all')}</label>
            <select value={productArea} onChange={e=>setProductArea(e.target.value)}>
              <option value="">{t('filter_area_all')}</option>
              <option value="C_ARM">C-Arm</option>
              <option value="MAMMO">Mammo</option>
              <option value="DENTAL">Dental</option>
              <option value="NEW_BUSINESS">New Business</option>
            </select>
          </div>
          <div>
            <label>{t('filter_stage_all')}</label>
            <select value={stage} onChange={e=>setStage(e.target.value)}>
              <option value="">{t('filter_stage_all')}</option>
              {(['IDEATION','REVIEW','CONFIRM','PROJECT','REJECTED'] as const).map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-2">
            <div>
              <label>{t('filter_from')}</label>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
            </div>
            <div>
              <label>{t('filter_to')}</label>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="card"><div className="section-title">{t('kpi_total_requests')}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{kpis.totalThisYear}</div></div>
        <div className="card"><div className="section-title">{t('kpi_by_stage')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {(['IDEATION','REVIEW','CONFIRM','PROJECT','REJECTED'] as const).map((st) => (
              <div key={st}><div className="muted">{stageLabel(st)}</div><div style={{ fontWeight: 600 }}>{(kpis.byStage as any)[st] || 0}</div></div>
            ))}
          </div>
        </div>
        <div className="card"><div className="section-title">{t('kpi_deadline_risk')}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{kpis.deadlineRisk}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div
          className="card"
          style={{ background: '#0f172a', color: '#fff', cursor: 'pointer' }}
          onClick={() =>
            setModal({
              title: 'Strategic Priority',
              items: scored
                .filter((r) => r.importanceFlag === 'MUST' && (r._influence || 0) >= 6)
                .sort((a, b) => (b._influence || 0) - (a._influence || 0)),
            })
          }
        >
          <div className="section-title" style={{ color: '#e2e8f0' }}>Strategic Priority</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
            {scored.filter((r) => r.importanceFlag === 'MUST' && (r._influence || 0) >= 6).length}
          </div>
          <div className="muted" style={{ color: '#e2e8f0' }}>MUST + influence 6+ (sorted by influence)</div>
        </div>
        <div
          className="card"
          style={{ background: '#0ea5e9', color: '#fff', cursor: 'pointer' }}
          onClick={() =>
            setModal({
              title: 'Top Revenue 5',
              items: scored.slice().sort((a, b) => (b._rev || 0) - (a._rev || 0)).slice(0, 5),
            })
          }
        >
          <div className="section-title" style={{ color: '#e0f2fe' }}>Top Revenue 5</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
            {Math.min(5, scored.length)}
          </div>
          <div className="muted" style={{ color: '#e0f2fe' }}>Top 5 by expected revenue</div>
        </div>
        <div
          className="card"
          style={{ background: '#fff4e5', cursor: 'pointer' }}
          onClick={() => {
            const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
            const items = scored.filter((r) => new Date(r.submittedAt).getTime() >= weekAgo);
            setModal({
              title: 'New This Week',
              items: items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
            });
          }}
        >
          <div className="section-title">New This Week</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309' }}>
            {scored.filter((r) => new Date(r.submittedAt).getTime() >= Date.now() - 7 * 24 * 3600 * 1000).length}
          </div>
          <div className="muted">Requests created in the last 7 days</div>
        </div>
        <div
          className="card"
          style={{ background: '#e2f8f0', cursor: 'pointer' }}
          onClick={() =>
            setModal({
              title: 'Expected Revenue',
              items: scored.sort((a, b) => (b._rev || 0) - (a._rev || 0)),
            })
          }
        >
          <div className="section-title">Expected Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#047857' }}>
            {formatKRW(scored.reduce((s, r) => s + (r._rev || 0), 0))}
          </div>
          <div className="muted">Total expected revenue (descending)</div>
        </div>
      </div>

      <ImpactRiskBubble
        data={scored}
        productArea={productArea}
      />

      <RoadmapTimeline
        t={t}
        requests={requests}
        urgentOnly={urgentOnly}
        urgentDays={urgentDays}
        maxRows={maxRows}
        setUrgentOnly={setUrgentOnly}
        setUrgentDays={setUrgentDays}
        setMaxRows={setMaxRows}
        stageLabel={stageLabel}
        navigate={navigate}
      />

      <div className="grid grid-2">
        <div className="card" style={{ background: 'linear-gradient(180deg, #f1f5ff 0%, #ffffff 60%)' }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.accent, boxShadow: '0 0 0 6px rgba(37,99,235,0.08)' }} />
            {t('card_top_keywords')}
          </div>
          <KeywordsChart data={keywordsStats} />
        </div>
        <div className="card" style={{ background: 'linear-gradient(180deg, #ecfdf3 0%, #ffffff 65%)' }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.green, boxShadow: '0 0 0 6px rgba(16,185,129,0.12)' }} />
            {t('card_rd_group_load')}
          </div>
          <RDGroupChart data={rdGroupLoad} />
        </div>
      </div>

      <div className="card" style={{ paddingBottom: 8 }}>
        <div className="section-title">{t('card_decision_pending')}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>{t('table_id')}</th><th>{t('table_title')}</th><th>{t('table_area')}</th><th>{t('th_stage')}</th><th>{t('table_customer')}</th><th>{t('table_expected')}</th><th>{t('table_deadline')}</th><th>{t('table_days_since')}</th></tr></thead>
          <tbody>
            {requests.filter(r => r.currentStage==='CONFIRM' && ['CTO_APPROVAL_PENDING','CEO_APPROVAL_PENDING'].includes(r.currentStatus || '')).sort((a,b)=>{
              const rev = (b.expectedRevenue||0)-(a.expectedRevenue||0);
              if (rev !== 0) return rev;
              return new Date(a.customerDeadline).getTime() - new Date(b.customerDeadline).getTime();
            }).map(r => (
              <tr key={r.id} onClick={() => navigate(`/request/${r.id}`)} style={{ cursor: 'pointer' }}>
                <td>{r.id}</td>
                <td>{r.title}</td>
                <td>{r.productArea}</td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    background: r.currentStage === 'CONFIRM' ? '#fde68a' : r.currentStage === 'PROJECT' ? '#bfdbfe' : r.currentStage === 'REVIEW' ? '#e5e7eb' : '#d1fae5',
                    color: '#111827',
                    border: '1px solid rgba(0,0,0,0.08)'
                  }}>{stageLabel(r.currentStage)}</span>
                </td>
                <td>{r.customerName}</td>
                <td>{formatKRW(r.expectedRevenue)}</td>
                <td>{new Date(r.customerDeadline).toLocaleDateString()}</td>
                <td>{Math.floor((Date.now() - new Date(r.submittedAt).getTime())/(1000*3600*24))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="card">Loading...</div>}
    </div>
    {modal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}
        onClick={() => setModal(null)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            width: 'min(720px, 90vw)',
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{modal.title}</div>
            <button onClick={() => setModal(null)} style={{ padding: '4px 8px' }}>Close</button>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>Click an item to open its detail page.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            {modal.items.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setModal(null);
                  navigate(`/list/${r.id}`);
                }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 10,
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>Importance: {r.importanceFlag || '-'}</span>
                    <span>Influence: {r._influence ?? '-'}</span>
                    <span>Expected: {formatKRW(r._rev || r.expectedRevenue || 0)}</span>
                    <span>Area: {r.productArea || '-'}</span>
                  </div>
                </div>
              ))}
            {modal.items.length === 0 && <div style={{ color: '#6b7280' }}>No items match this criteria.</div>}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function RoadmapTimeline(props: {
  t: ReturnType<typeof useT>;
  requests: any[];
  urgentOnly: boolean;
  urgentDays: number;
  maxRows: number;
  setUrgentOnly: (v: boolean) => void;
  setUrgentDays: (v: number) => void;
  setMaxRows: (v: number) => void;
  stageLabel: (s: string) => string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t, requests, urgentOnly, urgentDays, maxRows, setUrgentOnly, setUrgentDays, setMaxRows, stageLabel, navigate } = props;
  const now = Date.now();
  let items = requests.slice().map(r => {
    const end = new Date(r.customerDeadline).getTime();
    const daysLeft = Math.floor((end - now) / (1000*3600*24));
    return { ...r, _daysLeft: daysLeft };
  });
  if (urgentOnly) items = items.filter(r => r._daysLeft <= urgentDays);
  items.sort((a,b)=> a._daysLeft - b._daysLeft);
  items = items.slice(0, maxRows);

  const windowDays = 90;
  const urgencyColor = (daysLeft: number) => {
    if (daysLeft < 0) return '#dc2626';
    if (daysLeft <= 7) return '#ef4444';
    if (daysLeft <= 14) return '#f59e0b';
    if (daysLeft <= 30) return '#10b981';
    return '#6b7280';
  };

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #f8fbff 0%, #eef2ff 60%, #ffffff 100%)', border: '1px solid #dbeafe' }}>
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ padding: '6px 10px', borderRadius: 10, background: '#e0e7ff', color: palette.accent, fontWeight: 700, fontSize: 12 }}>ROADMAP</span>
        {t('timeline_title')}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}>
          <input type="checkbox" checked={urgentOnly} onChange={(e)=>setUrgentOnly(e.target.checked)} /> {t('timeline_urgent')} ({urgentDays}d)
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {t('timeline_urgent_window')}
          <select aria-label={t('timeline_urgent_window')} value={urgentDays} onChange={(e)=>setUrgentDays(Number(e.target.value))}>
            {[7,14,21].map(d => <option key={d} value={d}>{d}d</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {t('timeline_max_rows')}
          <input aria-label={t('timeline_max_rows')} style={{ width: 64 }} type="number" min={10} max={200} value={maxRows} onChange={(e)=>setMaxRows(Math.min(200, Math.max(10, Number(e.target.value)||60)))} />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 14, height: 8, borderRadius: 4, background: palette.red, display: 'inline-block' }} /> {t('legend_must')}
          </span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 14, height: 8, borderRadius: 4, background: palette.amber, display: 'inline-block' }} /> {t('legend_should')}
          </span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 14, height: 8, borderRadius: 4, background: palette.green, display: 'inline-block' }} /> {t('legend_nice')}
          </span>
          <span title={t('label_overdue')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: '#dc2626', display: 'inline-block' }} /> {t('label_overdue')}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', height: 22, marginBottom: 6 }}>
        {[0, 25, 50, 75, 100].map((p) => (
          <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: '#e5e7eb' }} />
        ))}
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 11, color: '#666' }}>{t('timeline_axis_left') || '0d'}</div>
        <div style={{ position: 'absolute', right: 0, top: 0, fontSize: 11, color: '#666' }}>{`${windowDays}d`}</div>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
        {items.map((r) => {
          const deadlineLabel = new Date(r.customerDeadline).toLocaleDateString();
          const daysLeft = r._daysLeft;
          const overdue = daysLeft < 0;
          const color = urgencyColor(daysLeft);
          const widthPct = Math.min(100, Math.max(3, (Math.min(windowDays, Math.max(0, daysLeft)) / windowDays) * 100));
          const handleNavigate = () => navigate(`/request/${r.id}`);

          return (
            <div
              key={r.id}
              onClick={handleNavigate}
              style={{
                padding: '12px 10px',
                borderBottom: '1px solid #eef2f7',
                borderRadius: 10,
                marginBottom: 4,
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 6px 14px rgba(15,23,42,0.04)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: '#223', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{r.title}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: '#e2e8f0', color: '#1e293b', fontSize: 11 }}>
                    {stageLabel(r.currentStage)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span title={t('th_deadline')} style={{ color: '#556' }}>{deadlineLabel}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, background: overdue ? '#fee2e2' : '#e0f2fe', color: overdue ? '#991b1b' : '#0f172a' }}>
                    {overdue ? t('label_overdue') : `${daysLeft}d`}
                  </span>
                </div>
              </div>
              <div style={{ position: 'relative', height: 16, background: '#f3f4f6', borderRadius: 999 }}>
                <div
                  title={`${t('th_title')}: ${r.title} 쨌 ${t('th_stage')}: ${stageLabel(r.currentStage)} 쨌 ${t('th_deadline')}: ${deadlineLabel} 쨌 ${t('timeline_days_left') || 'days left'}: ${daysLeft}${overdue ? ' 쨌 ' + t('label_overdue') : ''}`}
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: `${widthPct}%`,
                    height: 12,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius: 999,
                    boxShadow: '0 6px 10px rgba(0,0,0,0.06)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeywordsChart({ data }: { data: Array<{ keyword: string; _count?: any }> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const t = useT();
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const labels = data.slice(0, 10).map(d => d.keyword);
    const counts = data.slice(0, 10).map(d => (d as any)._count?.keyword || 0);
    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: (t('chart_count') as any), data: counts, backgroundColor: labels.map((_, i) => `rgba(37,99,235,${0.45 + (i/labels.length)*0.3})`), borderRadius: 6 }] },
      options: {
        responsive: true,
        onHover: (event: any, elements: any[]) => {
          if (event?.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { ticks: { color: palette.sub }, grid: { display: false } }, y: { ticks: { color: palette.sub }, grid: { color: palette.grayLine } } },
        onClick: (_evt: any, elements: any[]) => {
          if (!elements?.length) return;
          const idx = elements[0].index;
          const kw = labels[idx];
          navigate(`/list?keyword=${encodeURIComponent(kw)}`);
        }
      }
    });
    return () => {
      canvas.style.cursor = 'default';
      chart.destroy();
    };
  }, [data, navigate]);
  return <canvas ref={canvasRef} height={260} />;
}

function RDGroupChart({ data }: { data: Array<{ id: string; group: string; activeRequests: number }> }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const t = useT();
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const labels = data.map(d => d.group);
    const ids = data.map(d => d.id);
    const counts = data.map(d => d.activeRequests);
    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: (t('chart_active') as any),
          data: counts,
          backgroundColor: counts.map((c, i) => `rgba(16,185,129,${0.45 + (i/labels.length)*0.35})`),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        onHover: (event: any, elements: any[]) => {
          if (event?.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { ticks: { color: palette.sub }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: palette.sub }, grid: { color: palette.grayLine } } },
        onClick: (_evt: any, elements: any[]) => {
          if (!elements?.length) return;
          const idx = elements[0].index;
          const id = ids[idx];
          navigate(`/list?rdGroupId=${encodeURIComponent(id)}`);
        }
      }
    });
    return () => {
      canvas.style.cursor = 'default';
      chart.destroy();
    };
  }, [data, navigate]);
  return <canvas ref={canvasRef} height={260} />;
}

function ImpactRiskBubble({
  data,
  productArea,
}: {
  data: any[];
  productArea: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const t = useT();
  const navigate = useNavigate();

  const filtered = React.useMemo(() => {
    return data.filter((d) => (productArea ? d.productArea === productArea : true));
  }, [data, productArea]);

  const summary = React.useMemo(() => {
    if (!filtered.length) return { count: 0, avgInfluence: 0, avgImportance: 0, totalRev: 0 };
    const totalRev = filtered.reduce((s, r) => s + (r._rev || 0), 0);
    const avgInfluence = filtered.reduce((s, r) => s + (r._influence || 0), 0) / filtered.length;
    const avgImportance = filtered.reduce((s, r) => s + (r._importance || 0), 0) / filtered.length;
    return { count: filtered.length, avgInfluence, avgImportance, totalRev };
  }, [filtered]);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current;
    ctx.style.cursor = 'default';
    const importanceLabel: Record<number, string> = { 1: 'NICE', 2: 'SHOULD', 3: 'MUST' };
    const importanceValue = (flag: string) => (flag === 'MUST' ? 3 : flag === 'SHOULD' ? 2 : 1);
    const deadlineColor = (daysLeft: number) => {
      if (daysLeft <= 7) return 'rgba(239,68,68,0.65)';
      if (daysLeft <= 14) return 'rgba(249,115,22,0.6)';
      if (daysLeft <= 21) return 'rgba(250,204,21,0.55)';
      return 'rgba(34,197,94,0.55)';
    };
    const radius = (revenue: number) => {
      const revM = Math.max(0, (Number.isFinite(revenue) ? revenue : 0) / 1_000_000);
      const scaled = 6 + Math.sqrt(revM) * 2.5;
      return Math.max(6, Math.min(50, scaled));
    };
    const bubbleData = filtered.map((r) => {
      const daysLeft =
        r._daysLeft ?? Math.ceil((new Date(r.customerDeadline).getTime() - Date.now()) / (1000 * 3600 * 24));
      const imp = importanceValue(r.importanceFlag);
      return {
        _id: r.id,
        x: r._influence || 0,
        y: imp,
        r: radius(r._rev || 0),
        _label: r.title,
        _importance: imp,
        _rev: r._rev || 0,
        _deadline: r.customerDeadline,
        _daysLeft: daysLeft,
        _influence: r._influence || 0,
      };
    });

    const chart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [
          {
            label: '비즈니스 임팩트',
            data: bubbleData,
            backgroundColor: bubbleData.map((b) => deadlineColor(b._daysLeft)),
            borderColor: bubbleData.map((b) => deadlineColor(b._daysLeft)),
          },
        ],
      },
      options: {
        responsive: true,
        onHover: (event: any, elements: any[]) => {
          if (event?.native?.target) event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        onClick: (_evt, elements) => {
          if (!elements?.length) return;
          const { datasetIndex, index } = elements[0];
          const d: any = (chart.data.datasets?.[datasetIndex] as any)?.data?.[index];
          if (d?._id) navigate(`/request/${d._id}`);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const d: any = ctx.raw;
                return [
                  d._label,
                  `중요도: ${importanceLabel[d._importance] || '-'}`,
                  `영향력: ${d._influence}`,
                  `예상매출: ${formatKRW(d._rev)}`,
                  `마감: ${new Date(d._deadline).toLocaleDateString()}`,
                  `D${d._daysLeft >= 0 ? '-' + d._daysLeft : '+' + Math.abs(d._daysLeft)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: '영향력 (0~10)' },
            min: 0,
            max: 10.5,
            ticks: { stepSize: 2 },
            grid: { color: '#e2e8f0' },
          },
          y: {
            title: { display: true, text: '중요도 (NICE → MUST)' },
            min: 0.5,
            max: 3.5,
            ticks: {
              stepSize: 1,
              callback: (val) => importanceLabel[val as number] || '',
            },
            grid: { color: '#e2e8f0' },
          },
        },
      },
    });
    return () => {
      ctx.style.cursor = 'default';
      chart.destroy();
    };
  }, [filtered]);

  return (
    <div className="card">
      <div className="section-title">비즈니스 임팩트(버블)</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></span> D≤7
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316' }}></span> D≤14
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#facc15' }}></span> D≤21
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }}></span> D&gt;21
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>버블 크기 = 상대적 예상 매출액 </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            background: '#0f172a',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.8, color: '#e2e8f0' }}>필터된 요청</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{summary.count}</div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #fde7c5',
            background: '#fff9f2',
            color: '#b45309',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700 }}>평균 영향력</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{summary.avgInfluence.toFixed(1)}</div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            color: '#0f766e',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700 }}>평균 중요도</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{summary.avgImportance.toFixed(1)}</div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1d4ed8',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700 }}>예상 매출 합계</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{formatKRW(summary.totalRev)}</div>
        </div>
      </div>
      <canvas ref={canvasRef} height={100} />
    </div>
  );
}
