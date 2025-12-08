import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJSON } from '../api';
import { useT } from '../i18n';
import { formatKRW } from '../utils/currency';
import RequestDetail from './RequestDetail';
import { decodeToken, getAuthToken } from '../auth';

type RequestItem = {
  id: string;
  title: string;
  customerName: string;
  productArea: string;
  category: string;
  importanceFlag: string;
  expectedRevenue: number | null;
  submittedAt: string;
  customerDeadline: string;
  currentStage: string;
  currentStatus: string;
  salesSummary: string;
  techAreas?: { id?: string; groupName?: string; code?: string; label?: string }[];
  strategicAlignment?: number | null;
  regulatoryRiskLevel?: string | null;
  regulatoryRequired?: boolean | null;
  technicalNotes?: string | null;
  customerInfluenceScore?: number | null;
};

export default function RequestList() {
  const t = useT();
  const roleUpper = (() => {
    const token = getAuthToken();
    const decoded = token ? decodeToken(token) : null;
    return (decoded?.role || '').toUpperCase();
  })();
  const readOnly = roleUpper === 'VIEWER' || roleUpper === 'EXTERNAL_VIEWER';
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [stages, setStages] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [keyword, setKeyword] = useState<string>(() => new URLSearchParams(window.location.search).get('keyword') || '');
  const [rdGroupId, setRdGroupId] = useState<string>(() => new URLSearchParams(window.location.search).get('rdGroupId') || '');
  const [sortBy, setSortBy] = useState<'deadline' | 'revenue' | 'newest'>('deadline');
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const scrollPosRef = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      const stageOk = stages.length ? stages.includes(r.currentStage) : true;
      const areaOk = areas.length ? areas.includes(r.productArea) : true;
      return stageOk && areaOk;
    });
  }, [items, stages, areas]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      if (sortBy === 'deadline') {
        const ad = new Date(a.customerDeadline).getTime();
        const bd = new Date(b.customerDeadline).getTime();
        return ad - bd;
      }
      if (sortBy === 'revenue') {
        const av = a.expectedRevenue ?? -Infinity;
        const bv = b.expectedRevenue ?? -Infinity;
        return bv - av;
      }
      // newest
      const as = new Date(a.submittedAt).getTime();
      const bs = new Date(b.submittedAt).getTime();
      return bs - as;
    });
    return list;
  }, [filteredItems, sortBy]);

  const sortedPagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, page]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const rememberScroll = () => {
    if (typeof window === 'undefined') return;
    scrollPosRef.current = window.scrollY;
  };

  const goPrev = () => {
    if (!canPrev) return;
    rememberScroll();
    setPage((p) => Math.max(1, p - 1));
  };

  const goNext = () => {
    if (!canNext) return;
    rememberScroll();
    setPage((p) => Math.min(totalPages, p + 1));
  };

  const stageOptions = [
    { value: '', label: t('filter_stage_all') },
    { value: 'IDEATION', label: t('stages_IDEATION') },
    { value: 'REVIEW', label: t('stages_REVIEW') },
    { value: 'CONFIRM', label: t('stages_CONFIRM') },
    { value: 'PROJECT', label: t('stages_PROJECT') },
    { value: 'REJECTED', label: t('stages_REJECTED') },
  ];

  const areaOptions = [
    { value: '', label: t('filter_area_all') },
    { value: 'C_ARM', label: 'C-Arm' },
    { value: 'MAMMO', label: 'Mammography' },
    { value: 'DENTAL', label: 'Dental' },
    { value: 'NEW_BUSINESS', label: 'New Business' },
  ];

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (stages.length) p.set('stages', stages.join(','));
    if (areas.length) p.set('productAreas', areas.join(','));
    if (keyword) p.set('keyword', keyword);
    if (rdGroupId) p.set('rdGroupId', rdGroupId);
    p.set('limit', '500');
    p.set('offset', '0');
    return p.toString();
  }, [q, stages, areas, keyword, rdGroupId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJSON<{ items: RequestItem[]; total: number }>(`/requests${queryParams ? `?${queryParams}` : ''}`);
        setItems(data.items);
        setTotal(data.total);
        setPage(1);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams]);

  useEffect(() => {
    if (!loading && scrollPosRef.current !== null && typeof window !== 'undefined') {
      window.scrollTo({ top: scrollPosRef.current, behavior: 'auto' });
      scrollPosRef.current = null;
    }
  }, [loading]);

  const importanceLabel = (flag: string | null | undefined) => {
    if (!flag) return '-';
    const map: Record<string, string> = {
      MUST: t('importance_MUST'),
      SHOULD: t('importance_SHOULD'),
      NICE: t('importance_NICE'),
    };
    return map[flag] || flag;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 6, fontSize: 26, color: '#0f172a' }}>{t('nav_list')}</h1>
          <p style={{ color: '#475569', marginBottom: 14 }}>{t('list_subtitle')}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder={t('search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid #d8e0f0',
                background: '#fff',
                boxShadow: '0 10px 30px rgba(16, 43, 95, 0.08)',
              }}
            />
            <div style={{ color: '#1f2937', fontWeight: 600 }}>
              {t('list_total')}: {filteredItems.length}
              {total ? ` / ${total}` : ''}
            </div>
          </div>
        </div>

        {(keyword || rdGroupId) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            {keyword && (
              <span style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}>
                keyword: {keyword}
              </span>
            )}
            {rdGroupId && (
              <span style={{ background: '#ecfeff', border: '1px solid #a5f3fc', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}>
                rdGroupId: {rdGroupId}
              </span>
            )}
            <button
              onClick={() => {
                setKeyword('');
                setRdGroupId('');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid #c7d2fe',
                background: '#fff',
                cursor: 'pointer',
                color: '#2563eb',
                fontWeight: 700,
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div
          style={{
            background: '#fff',
            padding: '16px 18px',
            borderRadius: 18,
            boxShadow: '0 12px 40px rgba(44, 72, 124, 0.12)',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#334', minWidth: 90 }}>{t('filter_stage_all')}</span>
            {stageOptions.map((opt) => {
              const active = opt.value === '' ? stages.length === 0 : stages.includes(opt.value);
              return (
                <button
                  key={opt.value || 'all-stage'}
                  type="button"
                  onClick={() => {
                    if (!opt.value) {
                      setStages([]);
                      return;
                    }
                    setStages((prev) => (prev.includes(opt.value) ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]));
                  }}
                  style={{
                    border: '1px solid #e0e7ff',
                    background: active ? '#e9f0ff' : '#f8fafc',
                    color: active ? '#1d4ed8' : '#0f172a',
                    borderRadius: 14,
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? '0 6px 16px rgba(61, 102, 255, 0.18)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#334', minWidth: 90 }}>{t('filter_area_all')}</span>
            {areaOptions.map((opt) => {
              const active = opt.value === '' ? areas.length === 0 : areas.includes(opt.value);
              return (
                <button
                  key={opt.value || 'all-area'}
                  type="button"
                  onClick={() => {
                    if (!opt.value) {
                      setAreas([]);
                      return;
                    }
                    setAreas((prev) => (prev.includes(opt.value) ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]));
                  }}
                  style={{
                    border: '1px solid #cce4ff',
                    background: active ? '#e6f4ff' : '#f8fafc',
                    color: active ? '#0ea5e9' : '#0f172a',
                    borderRadius: 14,
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? '0 6px 16px rgba(14, 165, 233, 0.16)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading && <div>{t('loading')}</div>}
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <button
              type="button"
              disabled={!canPrev}
              onClick={goPrev}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #d0d7e6',
                background: !canPrev ? '#f1f5f9' : '#fff',
                cursor: !canPrev ? 'default' : 'pointer',
                color: '#0f172a',
              }}
            >
              {t('pagination_prev')}
            </button>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {t('pagination_page')} {page} / {totalPages}
            </div>
            <button
              type="button"
              disabled={!canNext}
              onClick={goNext}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #d0d7e6',
                background: !canNext ? '#f1f5f9' : '#fff',
                cursor: !canNext ? 'default' : 'pointer',
                color: '#0f172a',
              }}
            >
              {t('pagination_next')}
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>정렬</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #d0d7e6' }}
              >
                <option value="deadline">마감일 임박순</option>
                <option value="revenue">매출액 높은순</option>
                <option value="newest">신규 요청 최신순</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedPagedItems.map((r) => {
              const deadline = new Date(r.customerDeadline);
              const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const badgeColor =
                r.currentStage === 'PROJECT'
                  ? '#c6f6d5'
                  : r.currentStage === 'CONFIRM'
                  ? '#bfdbfe'
                  : r.currentStage === 'REVIEW'
                  ? '#fef3c7'
                  : r.currentStage === 'IDEATION'
                  ? '#e0f2fe'
                  : '#fee2e2';
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 18,
                    padding: '16px 18px',
                    background: '#fff',
                    boxShadow: '0 14px 40px rgba(30, 64, 175, 0.12)',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#0f172a',
                            maxWidth: '70%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.title}
                        </div>
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#0f172a',
                            background: badgeColor,
                            padding: '6px 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(0,0,0,0.05)',
                            minWidth: 96,
                            textAlign: 'center',
                          }}
                        >
                          {t('th_stage')}: {r.currentStage}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#334', marginTop: 6 }}>
                        <span>
                          {t('th_customer')}: {r.customerName}
                        </span>
                        <span>
                          {t('th_category')}: {r.category}
                        </span>
                        <span>
                          {t('th_deadline')}: {deadline.toLocaleDateString()} (
                          {daysLeft >= 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`}
                          )
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
                        {r.salesSummary?.slice(0, 140) || '-'}
                        {r.salesSummary && r.salesSummary.length > 140 ? ' ...' : ''}
                      </div>
                      {r.technicalNotes && (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#0f172a', background: '#f8fafc', padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          {r.technicalNotes}
                        </div>
                      )}
                      {r.techAreas && r.techAreas.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                          {r.techAreas.map((t) => (
                            <span
                              key={`${t.id || t.code || t.label}-${r.id}`}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 10,
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#0f172a',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t.label || t.code || t.groupName || '기술 요구/제약'}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: '#0f172a' }}>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#eef2ff', fontWeight: 700 }}>
                          {t('th_importance')}: {importanceLabel(r.importanceFlag)}
                        </span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#e0f2fe', fontWeight: 700 }}>
                          {t('th_productArea')}: {r.productArea}
                        </span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#fef3c7', fontWeight: 700 }}>
                          {t('th_expectedRevenue')}: {formatKRW(r.expectedRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button
              type="button"
              disabled={!canPrev}
              onClick={goPrev}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #d0d7e6',
                background: !canPrev ? '#f1f5f9' : '#fff',
                cursor: !canPrev ? 'default' : 'pointer',
                color: '#0f172a',
              }}
            >
              {t('pagination_prev')}
            </button>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {t('pagination_page')} {page} / {totalPages}
            </div>
            <button
              type="button"
              disabled={!canNext}
              onClick={goNext}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #d0d7e6',
                background: !canNext ? '#f1f5f9' : '#fff',
                cursor: !canNext ? 'default' : 'pointer',
                color: '#0f172a',
              }}
            >
              {t('pagination_next')}
            </button>
          </div>

          {!loading && items.length === 0 && (
            <div
              style={{
                border: '1px dashed #ccc',
                padding: 24,
                borderRadius: 12,
                color: '#777',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {t('empty_list')}
            </div>
          )}
        </div>
        {loading && <div style={{ marginTop: 12, color: '#475569' }}>{t('loading')}</div>}
      </div>

      {selectedId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              width: 'min(1100px, 96vw)',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#111827',
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>
            <RequestDetail requestId={selectedId} openInModal onClose={() => setSelectedId(null)} readOnly={readOnly} />
          </div>
        </div>
      )}
    </div>
  );
}
