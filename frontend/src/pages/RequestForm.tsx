import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { postJSON, fetchJSON } from '../api';
import { useLang, useT } from '../i18n';

const productModels: Record<string, string[]> = {
  C_ARM: ['Belliger Ace', 'Zen-7000', 'Zen-2090 Turbo', 'Oscar 15', 'Oscar Prime', 'Oscar Classic'],
  MAMMO: ['Hestia', 'DMX-600', 'MX-600'],
  DENTAL: ['Papaya Plus', 'GT300', 'Papaya 3D Premium Plus', 'Papaya 3D Premium ENT', 'Papaya 3D Plus', 'DVAS', 'Port-X 4'],
};

const schema = z.object({
  title: z.string().min(1),
  customerName: z.string().min(1),
  productArea: z.string().min(1),
  productModel: z.string().optional(),
  category: z.enum(['NEW_PRODUCT', 'PRODUCT_IMPROVEMENT', 'CUSTOMIZATION']),
  expectedRevenue: z.string().optional(),
  expectedRevenueUnknown: z.boolean().optional(),
  expectedRevenueNote: z.string().optional(),
  importanceFlag: z.enum(['MUST', 'SHOULD', 'NICE']),
  customerDeadline: z.string().min(1),
  createdByDept: z.string().min(1),
  createdByUserId: z.string().min(1),
  region: z.string().optional(),
  rawCustomerText: z.string().min(10),
  salesSummary: z.string().min(10),
  rdGroupIds: z.array(z.string()).min(1),
  keywords: z.array(z.string()).optional(),
  influenceRevenue: z.string().optional(),
  influenceKol: z.string().optional(),
  influenceReuse: z.string().optional(),
  influenceStrategic: z.string().optional(),
  influenceTender: z.string().optional(),
});

const deptOptions = ['Domestic Sales', 'Overseas Sales', 'Government Sales', 'Product Marketing', 'Service/Support'];

export default function RequestForm() {
  const t = useT();
  const lang = useLang();
  const [form, setForm] = useState<any>({
    title: '',
    customerName: '',
    productArea: '',
    productModel: '',
    category: 'PRODUCT_IMPROVEMENT',
    expectedRevenue: '',
    expectedRevenueUnknown: false,
    expectedRevenueNote: '',
    importanceFlag: 'MUST',
    customerDeadline: '',
    createdByDept: 'Domestic Sales',
    createdByUserId: '',
    authorName: '',
    authorTitle: '',
    region: 'KR',
    rawCustomerText: '',
    salesSummary: '',
    rdGroupIds: [],
    keywords: [],
    usageScenario: '',
    desiredOutputs: [] as string[],
    performanceGoals: '',
    regulatoryImpact: '',
    interfaceNeeds: '',
    mechanicalConstraints: '',
    powerConstraints: '',
    softwareScope: [] as string[],
    dataLogNeeds: [] as string[],
    environmentConstraints: '',
    urgency: '',
    quantity: '',
    rolloutScope: '',
    serviceImpact: [] as string[],
    risks: '',
    referenceLinks: '',
  influenceRevenue: '',
  influenceKol: '',
  influenceReuse: '',
  influenceStrategic: '',
  influenceTender: '',
});
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rdGroups, setRdGroups] = useState<Array<{ id: string; name: string; category: string | null }>>([]);

  const formattedRevenue = useMemo(() => {
    if (!form.expectedRevenue) return '';
    const num = Number(form.expectedRevenue);
    if (Number.isNaN(num)) return '';
    return num.toLocaleString();
  }, [form.expectedRevenue]);

  const jobTitleOptions = useMemo(
    () => [
      { value: '', label: '-' },
      { value: 'Staff', label: lang === 'ko' ? '사원' : 'Staff' },
      { value: 'Assistant Manager', label: lang === 'ko' ? '대리' : 'Assistant Manager' },
      { value: 'Manager', label: lang === 'ko' ? '과장' : 'Manager' },
      { value: 'Deputy GM', label: lang === 'ko' ? '차장' : 'Deputy GM' },
      { value: 'General Manager', label: lang === 'ko' ? '부장' : 'General Manager' },
      { value: 'Executive', label: lang === 'ko' ? '임원' : 'Executive' },
    ],
    [lang]
  );

  useEffect(() => {
    (async () => {
      try {
        const gs = await fetchJSON<Array<{ id: string; name: string; category: string | null }>>('/requests/rd-groups');
        setRdGroups(gs);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    setForm((prev: any) => {
      const validIds = prev.rdGroupIds.filter((id: string) => rdGroups.some((g) => g.id === id));
      return validIds.length === prev.rdGroupIds.length ? prev : { ...prev, rdGroupIds: validIds };
    });
  }, [rdGroups]);

  const groupedRdGroups = useMemo(() => {
    if (!rdGroups.length) return [] as Array<{ title: string; items: Array<{ id: string; name: string }> }>;
    const labelFor = (category: string | null) => {
      switch (category) {
        case 'Core':
          return 'Core';
        case 'Platform':
          return 'Platform / AI';
        case 'Compliance':
          return 'Regulatory / Compliance';
        case 'Quality':
          return 'Quality / QA';
        default:
          return 'Other groups';
      }
    };
    const map = new Map<string, Array<{ id: string; name: string }>>();
    rdGroups.forEach((group) => {
      const key = labelFor(group.category);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ id: group.id, name: group.name });
    });
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [rdGroups]);

  const isNewProduct = form.category === 'NEW_PRODUCT';
  const applicableModels = productModels[form.productArea] || [];
  const influenceScore = useMemo(() => {
    const fields = ['influenceRevenue', 'influenceKol', 'influenceReuse', 'influenceStrategic', 'influenceTender'] as const;
    const total = fields.reduce((sum, key) => {
      const val = Number((form as any)[key] || 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    return Math.min(10, total);
  }, [form]);

  const canSubmit = useMemo(() => {
    const parsed = schema.safeParse({
      ...form,
      rdGroupIds: form.rdGroupIds,
      createdByUserId: form.authorName || form.createdByUserId || 'unknown',
      influenceRevenue: form.influenceRevenue || '0',
      influenceKol: form.influenceKol || '0',
      influenceReuse: form.influenceReuse || '0',
      influenceStrategic: form.influenceStrategic || '0',
      influenceTender: form.influenceTender || '0',
    });
    if (!parsed.success) return false;
    const influenceFilled =
      form.influenceRevenue !== '' &&
      form.influenceKol !== '' &&
      form.influenceReuse !== '' &&
      form.influenceStrategic !== '' &&
      form.influenceTender !== '';
    if (!influenceFilled) return false;
    if (!isNewProduct && (!form.productArea || (!form.productModel && applicableModels.length))) return false;
    if (!form.authorName && !form.createdByUserId) return false;
    if (!form.createdByDept) return false;
    return true;
  }, [form, isNewProduct, applicableModels.length]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const expectedRevenue =
        !form.expectedRevenueUnknown && form.expectedRevenue && !Number.isNaN(Number(form.expectedRevenue))
          ? Number(form.expectedRevenue)
          : null;

      const technicalNotesParts: string[] = [];
      const pushNote = (label: string, val: any) => {
        if (!val) return;
        if (Array.isArray(val) && val.length === 0) return;
        const v = Array.isArray(val) ? val.join(', ') : String(val);
        if (v.trim().length === 0) return;
        technicalNotesParts.push(`${label}: ${v}`);
      };
      pushNote('Author', `${form.authorName || form.createdByUserId || ''}${form.authorTitle ? ` (${form.authorTitle})` : ''}`);
      pushNote('Sales dept', form.createdByDept);
      pushNote('Usage scenario', form.usageScenario);
      pushNote('Desired outputs', form.desiredOutputs);
      pushNote('Performance goals', form.performanceGoals);
      pushNote('Regulatory impact', form.regulatoryImpact);
      pushNote('Interface/data needs', form.interfaceNeeds);
      pushNote('Mechanical constraints', form.mechanicalConstraints);
      pushNote('Power constraints', form.powerConstraints);
      pushNote('SW scope', form.softwareScope);
      pushNote('Data log needs', form.dataLogNeeds);
      pushNote('Operating environment constraints', form.environmentConstraints);
      pushNote('Service impact', form.serviceImpact);
      pushNote('Reference links', form.referenceLinks);
      const technicalNotes = technicalNotesParts.join('\n');

      await postJSON('/requests', {
        ...form,
        createdByUserId: form.authorName || form.createdByUserId || 'unknown',
        influenceRevenue: Number(form.influenceRevenue || 0),
        influenceKol: Number(form.influenceKol || 0),
        influenceReuse: Number(form.influenceReuse || 0),
        influenceStrategic: Number(form.influenceStrategic || 0),
        influenceTender: Number(form.influenceTender || 0),
        technicalNotes,
        expectedRevenue,
        revenueEstimateStatus: form.expectedRevenueUnknown
          ? 'UNKNOWN'
          : expectedRevenue !== null
          ? 'NUMERIC'
          : null,
        revenueEstimateNote:
          form.expectedRevenueUnknown || form.expectedRevenueNote
            ? (form.expectedRevenueNote || '').trim() || null
            : null,
      });
      alert('Request submitted');
      setForm({
        title: '',
        customerName: '',
        productArea: '',
        productModel: '',
        category: 'PRODUCT_IMPROVEMENT',
        expectedRevenue: '',
        expectedRevenueUnknown: false,
        expectedRevenueNote: '',
        importanceFlag: 'MUST',
        customerDeadline: '',
        createdByDept: 'Domestic Sales',
        createdByUserId: '',
        authorName: '',
        authorTitle: '',
        region: 'KR',
        rawCustomerText: '',
        salesSummary: '',
        rdGroupIds: [],
        keywords: [],
        usageScenario: '',
        desiredOutputs: [] as string[],
        performanceGoals: '',
        regulatoryImpact: '',
        interfaceNeeds: '',
        mechanicalConstraints: '',
        powerConstraints: '',
        softwareScope: [] as string[],
        dataLogNeeds: [] as string[],
        environmentConstraints: '',
        urgency: '',
        quantity: '',
        rolloutScope: '',
        serviceImpact: [] as string[],
        risks: '',
        referenceLinks: '',
        influenceRevenue: '',
        influenceKol: '',
        influenceReuse: '',
        influenceStrategic: '',
        influenceTender: '',
      });
    } catch (e: any) {
      setError(e?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function doSimilarSearch() {
    if (!form.productArea || !form.title) return;
    const items = await fetchJSON<any[]>(
      `/requests/similar?productArea=${encodeURIComponent(form.productArea)}&q=${encodeURIComponent(form.title)}`
    );
    setSimilar(items);
  }

  const projectTypeOptions = [
    { value: 'NEW_PRODUCT', label: 'NEW_PRODUCT' },
    { value: 'PRODUCT_IMPROVEMENT', label: 'PRODUCT_IMPROVEMENT' },
    { value: 'CUSTOMIZATION', label: 'CUSTOMIZATION' },
  ];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, #f7f9ff 0%, #ffffff 60%)' }}>
        <SectionHeader badge="A" color="#1d4ed8" bg="#e0e7ff" title={t('form_header_basic')} />
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label={t('form_request_title')}>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('form_author')}>
            <input
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              placeholder={t('form_author_placeholder')}
            />
          </Field>
          <Field label={t('form_job_title')}>
            <select value={form.authorTitle} onChange={(e) => setForm({ ...form, authorTitle: e.target.value })}>
              {jobTitleOptions.map((title) => (
                <option key={title.value} value={title.value}>
                  {title.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('form_sales_dept')}>
            <select value={form.createdByDept} onChange={(e) => setForm({ ...form, createdByDept: e.target.value })}>
              <option value="">-</option>
              {deptOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('form_customer_name')}>
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </Field>
          <Field label={t('form_region')}>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              <option value="">-</option>
              <option value="KR">KR</option>
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </Field>
          <Field label="Urgency / lead time">
            <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              <option value="">-</option>
              <option value="1M">1 month</option>
              <option value="3M">3 months</option>
              <option value="6M">6 months</option>
              <option value="FLEX">Flexible</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card raw-block">
        <SectionHeader badge="B" color="#1d4ed8" bg="#dbeafe" title={t('form_customer_raw')} />
        <Field label={t('form_customer_raw_text')}>
          <textarea value={form.rawCustomerText} onChange={(e) => setForm({ ...form, rawCustomerText: e.target.value })} />
        </Field>
        <div className="muted">{t('form_attachments_note')}</div>
      </div>

      <div className="card">
        <SectionHeader badge="C" color="#0284c7" bg="#e0f2fe" title={t('form_structured_class')} />
        <div className="grid grid-3" style={{ gap: 12 }}>
          <Field label={t('form_project_type')}>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {projectTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('form_product_area')}>
            <select
              value={form.productArea}
              onChange={(e) => setForm({ ...form, productArea: e.target.value, productModel: '' })}
            >
              <option value="">-</option>
              <option value="C_ARM">C_ARM</option>
              <option value="MAMMO">MAMMO</option>
              <option value="DENTAL">DENTAL</option>
              <option value="C_ARM_NEW">C_ARM_NEW</option>
              <option value="MAMMO_NEW">MAMMO_NEW</option>
              <option value="DENTAL_NEW">DENTAL_NEW</option>
              <option value="NEW_BUSINESS">NEW_BUSINESS</option>
            </select>
          </Field>
          {!isNewProduct && (
            <Field label={t('form_product_model')}>
              <select value={form.productModel} onChange={(e) => setForm({ ...form, productModel: e.target.value })}>
                <option value="">-</option>
                {applicableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t('form_customer_deadline')}>
            <input
              type="date"
              value={form.customerDeadline}
              onChange={(e) => setForm({ ...form, customerDeadline: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <SectionHeader badge="C2" color="#0ea5e9" bg="#e0f7ff" title="Technical requirements" />
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Usage scenario">
            <input
              value={form.usageScenario}
              onChange={(e) => setForm({ ...form, usageScenario: e.target.value })}
              placeholder="e.g., mobile capture, 15 cases/day"
            />
          </Field>
          <Field label="Desired outputs">
            <CheckboxChips
              options={['Hardware change', 'SW UI', 'Imaging algorithm', 'Data/Interface', 'Position tracking']}
              values={form.desiredOutputs}
              onChange={(vals) => setForm({ ...form, desiredOutputs: vals })}
            />
          </Field>
          <Field label="Performance goals">
            <input
              value={form.performanceGoals}
              onChange={(e) => setForm({ ...form, performanceGoals: e.target.value })}
              placeholder="e.g., +20% quality, exposure 5s->3s"
            />
          </Field>
          <Field label="Regulatory impact">
            <select
              value={form.regulatoryImpact}
              onChange={(e) => setForm({ ...form, regulatoryImpact: e.target.value })}
            >
              <option value="">-</option>
              <option value="NONE">No impact</option>
              <option value="CE_FDA">CE/FDA impact possible</option>
              <option value="MFDS">Domestic MFDS impact</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </Field>
          <Field label="Interface/data needs">
            <input
              value={form.interfaceNeeds}
              onChange={(e) => setForm({ ...form, interfaceNeeds: e.target.value })}
              placeholder="e.g., data format export, PACS send"
            />
          </Field>
          <Field label="Mechanical constraints">
            <input
              value={form.mechanicalConstraints}
              onChange={(e) => setForm({ ...form, mechanicalConstraints: e.target.value })}
              placeholder="e.g., under 1kg, anti-vibration"
            />
          </Field>
          <Field label="Power constraints">
            <input
              value={form.powerConstraints}
              onChange={(e) => setForm({ ...form, powerConstraints: e.target.value })}
              placeholder="e.g., 220V, 10% headroom"
            />
          </Field>
          <Field label="SW scope">
            <CheckboxChips
              options={['UI/UX', 'Microservices', 'Imaging', 'AI/Analytics', 'Network/Security', 'Database']}
              values={form.softwareScope}
              onChange={(vals) => setForm({ ...form, softwareScope: vals })}
            />
          </Field>
          <Field label="Data log needs">
            <CheckboxChips
              options={['Live video', 'Processing log', 'Event log', 'Traffic history']}
              values={form.dataLogNeeds}
              onChange={(vals) => setForm({ ...form, dataLogNeeds: vals })}
            />
          </Field>
          <Field label="Operating environment constraints">
            <input
              value={form.environmentConstraints}
              onChange={(e) => setForm({ ...form, environmentConstraints: e.target.value })}
              placeholder="e.g., hospital network restrictions"
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <SectionHeader badge="D" color="#0f766e" bg="#e2f8f0" title={t('form_related_groups')} />
        {!groupedRdGroups.length ? (
          <div style={{ padding: '24px 12px', color: '#475569' }}>R&D groups are loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {groupedRdGroups.map((section) => (
              <div
                key={section.title}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                  background: '#fff',
                  boxShadow: '0 6px 16px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>{section.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {section.items.map((group) => {
                    const checked = form.rdGroupIds.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: checked ? '1px solid #2563eb' : '1px solid #e5e7eb',
                          background: checked ? 'linear-gradient(135deg, #eef2ff 0%, #ffffff 70%)' : '#f8fafc',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#111827' }}>{group.name}</span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const set = new Set(form.rdGroupIds);
                              if (e.target.checked) set.add(group.id);
                              else set.delete(group.id);
                              setForm({ ...form, rdGroupIds: Array.from(set) });
                            }}
                            style={{ width: 18, height: 18 }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <SectionHeader badge="E" color="#b45309" bg="#fff4e5" title={t('form_sales_impact')} />
        <div className="grid grid-3" style={{ gap: 12 }}>
          <Field label={t('form_importance')}>
            <select value={form.importanceFlag} onChange={(e) => setForm({ ...form, importanceFlag: e.target.value })}>
              <option value="MUST">MUST</option>
              <option value="SHOULD">SHOULD</option>
              <option value="NICE">NICE</option>
            </select>
          </Field>
          <Field label={t('form_expected_revenue')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.expectedRevenue}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  setForm((prev: any) => ({ ...prev, expectedRevenue: digits }));
                }}
                disabled={form.expectedRevenueUnknown}
                placeholder={t('form_comma_sep') || 'Digits only e.g., 300000000'}
              />
              <div style={{ fontSize: 12, color: '#475569' }}>
                {form.expectedRevenueUnknown
                  ? t('form_estimate_hard') || 'Skipping numeric entry because estimation is unclear.'
                  : formattedRevenue
                  ? `= ${formattedRevenue} KRW`
                  : 'Numbers only (KRW).'}
              </div>
            </div>
          </Field>
          <Field label="Estimation status">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={form.expectedRevenueUnknown}
                onChange={(e) => setForm({ ...form, expectedRevenueUnknown: e.target.checked })}
              />
              Hard to estimate
            </label>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              If unclear, check and leave a note below.
            </div>
          </Field>
          {form.expectedRevenueUnknown && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Estimation note">
                <textarea
                  value={form.expectedRevenueNote}
                  onChange={(e) => setForm({ ...form, expectedRevenueNote: e.target.value })}
                  rows={3}
                  placeholder="e.g., new market entry so cannot estimate"
                />
              </Field>
            </div>
          )}
          <Field label="Expected quantity / rollout">
            <input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="e.g., 10 units/year, phased"
            />
          </Field>
          <Field label="Service/training impact">
            <CheckboxChips
              options={['Manual update', 'Training needed', 'Service effort increase']}
              values={form.serviceImpact}
              onChange={(vals) => setForm({ ...form, serviceImpact: vals })}
            />
          </Field>
          <Field label={t('form_keywords') || 'Keywords'}>
            <input
              placeholder={t('form_comma_sep') || 'comma-separated'}
              value={form.keywords?.join(',') || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  keywords: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <SectionHeader badge="E2" color="#0ea5e9" bg="#e0f7ff" title="고객 영향력 점수" />
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="매출 규모 (0-3점)">
            <select value={form.influenceRevenue} onChange={(e) => setForm({ ...form, influenceRevenue: e.target.value })}>
              <option value="">-</option>
              <option value="0">0: 미확정/영향 없음</option>
              <option value="1">1: &lt; 1억</option>
              <option value="2">2: 1~5억</option>
              <option value="3">3: 5억 이상</option>
            </select>
          </Field>
          <Field label="고객 영향력 (0-2점)">
            <select value={form.influenceKol} onChange={(e) => setForm({ ...form, influenceKol: e.target.value })}>
              <option value="">-</option>
              <option value="0">0: 제한적 영향</option>
              <option value="1">1: 지역 주요 고객</option>
              <option value="2">2: 국내/글로벌 KOL</option>
            </select>
          </Field>
          <Field label="커스터마이징 확장성 (0-2점)">
            <select value={form.influenceReuse} onChange={(e) => setForm({ ...form, influenceReuse: e.target.value })}>
              <option value="">-</option>
              <option value="0">0: 특정 고객 전용</option>
              <option value="1">1: 일부 고객 재사용</option>
              <option value="2">2: 다수 고객/제품 확장 가능</option>
            </select>
          </Field>
          <Field label="전략 연관성 (0-2점)">
            <select value={form.influenceStrategic} onChange={(e) => setForm({ ...form, influenceStrategic: e.target.value })}>
              <option value="">-</option>
              <option value="0">0: 전략과 무관</option>
              <option value="1">1: 전략과 부분 연관</option>
              <option value="2">2: 핵심 전략/신사업과 직접 연관</option>
            </select>
          </Field>
          <Field label="입찰 대응 여부 (0-1점)">
            <select value={form.influenceTender} onChange={(e) => setForm({ ...form, influenceTender: e.target.value })}>
              <option value="">-</option>
              <option value="0">0: 입찰 아님</option>
              <option value="1">1: 입찰/제안 필수</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: 800 }}>
          고객 영향력 총점: {influenceScore} / 10
        </div>
      </div>

      <div className="card">
        <SectionHeader badge="F" color="#111827" bg="#e5e7eb" title={t('form_detail_duplicate')} />
        <Field label={t('form_sales_summary')}>
          <textarea value={form.salesSummary} onChange={(e) => setForm({ ...form, salesSummary: e.target.value })} />
        </Field>
        <Field label="Risks / concerns">
          <textarea
            value={form.risks}
            onChange={(e) => setForm({ ...form, risks: e.target.value })}
            placeholder="e.g., mechanical change needs certification"
          />
        </Field>
        <Field label="Reference links">
          <input
            value={form.referenceLinks}
            onChange={(e) => setForm({ ...form, referenceLinks: e.target.value })}
            placeholder="e.g., drive link or public URL"
          />
        </Field>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={doSimilarSearch}>
            {t('form_search_similar')}
          </button>
          <span className="muted">{t('form_search_hint')}</span>
        </div>
        {similar.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="section-title">{t('form_similar') || 'Similar requests'}</div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('th_title')}</th>
                  <th>{t('th_area')}</th>
                  <th>{t('form_submitted') || 'Submitted'}</th>
                  <th>{t('th_stage')}</th>
                </tr>
              </thead>
              <tbody>
                {similar.map((it) => (
                  <tr key={it.id}>
                    <td>{it.id}</td>
                    <td>{it.title}</td>
                    <td>{it.productArea}</td>
                    <td>{new Date(it.submittedAt).toLocaleDateString()}</td>
                    <td>{it.currentStage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <div className="card" style={{ borderColor: '#ef4444' }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button disabled={!canSubmit || submitting} onClick={submit}>
          {t('form_submit_request') || 'Submit request'}
        </button>
        {!canSubmit && <span className="muted">{t('form_fill_required') || 'Fill required fields'}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ badge, title, color, bg }: { badge: string; title: string; color: string; bg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span
        style={{
          padding: '6px 10px',
          borderRadius: 12,
          background: bg,
          color,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {badge}
      </span>
      <div className="section-title" style={{ margin: 0 }}>
        {title}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontWeight: 600, color: '#334155' }}>{label}</label>
      {children}
    </div>
  );
}

function CheckboxChips({
  options,
  values = [],
  onChange,
}: {
  options: string[];
  values?: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggle = (opt: string) => {
    const set = new Set(values || []);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set));
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const selected = (values || []).includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: selected ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: selected ? 'linear-gradient(135deg, #e0e7ff 0%, #ffffff 70%)' : '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
