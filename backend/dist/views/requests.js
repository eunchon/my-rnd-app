"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
const toNumber = (v) => (v === null || v === undefined ? null : Number(v));
const detailInclude = {
    keywords: true,
    rdGroups: { include: { rdGroup: true } },
    stageHistory: { orderBy: [{ enteredAt: 'asc' }] },
    techAreas: true,
    stageTargets: true,
    stageTargetHistory: { orderBy: [{ changedAt: 'desc' }] },
    attachments: true,
};
// List requests with filters for dashboard
router.get('/', async (req, res) => {
    const { productArea, productAreas, stage, stages, fromDate, toDate, q, keyword, rdGroupId, limit = '50', offset = '0', } = req.query;
    const where = {};
    const toList = (val) => {
        if (!val)
            return [];
        if (Array.isArray(val))
            return val.flatMap((v) => v.split(',')).map((s) => s.trim()).filter(Boolean);
        return val.split(',').map((s) => s.trim()).filter(Boolean);
    };
    const stageList = toList(stages || stage);
    const areaList = toList(productAreas || productArea);
    if (areaList.length === 1)
        where.productArea = areaList[0];
    if (areaList.length > 1)
        where.productArea = { in: areaList };
    if (stageList.length === 1)
        where.currentStage = stageList[0];
    if (stageList.length > 1)
        where.currentStage = { in: stageList };
    if (fromDate || toDate) {
        where.submittedAt = {};
        if (fromDate)
            where.submittedAt.gte = new Date(fromDate);
        if (toDate)
            where.submittedAt.lte = new Date(toDate);
    }
    if (q) {
        where.OR = [
            { title: { contains: q } },
            { rawCustomerText: { contains: q } },
            { salesSummary: { contains: q } },
        ];
    }
    if (keyword) {
        where.keywords = { some: { keyword: { contains: keyword } } };
    }
    if (rdGroupId) {
        where.rdGroups = { some: { rdGroupId } };
    }
    const [items, total] = await Promise.all([
        db_1.prisma.request.findMany({
            where,
            orderBy: [{ customerDeadline: 'asc' }],
            skip: Number(offset),
            take: Number(limit),
            include: {
                keywords: true,
                rdGroups: { include: { rdGroup: true } },
                stageHistory: true,
                techAreas: true,
            },
        }),
        db_1.prisma.request.count({ where }),
    ]);
    const decorated = items.map((r) => ({
        ...r,
        expectedRevenue: toNumber(r.expectedRevenue),
        technicalNotes: r.techAreas?.find((t) => t.code === 'NOTE')?.label ?? null,
        customerInfluenceScore: (() => {
            const raw = r.techAreas?.find((t) => t.code === 'INF_SCORE')?.label;
            const num = raw ? Number(raw) : null;
            return Number.isFinite(num) ? num : null;
        })(),
    }));
    res.json({ items: decorated, total });
});
// Create request with validation and related entities
const createSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    customerName: zod_1.z.string().min(1),
    productArea: zod_1.z.string().min(1),
    productModel: zod_1.z.string().optional(),
    category: zod_1.z.enum(['NEW_PRODUCT', 'PRODUCT_IMPROVEMENT', 'CUSTOMIZATION']).optional(),
    expectedRevenue: zod_1.z
        .preprocess((v) => {
        if (v === '' || v === null || v === undefined)
            return null;
        const num = Number(v);
        return Number.isFinite(num) ? num : null;
    }, zod_1.z.number().nullable().optional())
        .optional(),
    revenueEstimateStatus: zod_1.z
        .preprocess((v) => (v === null || v === '' ? undefined : v), zod_1.z.enum(['NUMERIC', 'UNKNOWN']).optional())
        .optional(),
    revenueEstimateNote: zod_1.z.preprocess((v) => (v === null ? undefined : v), zod_1.z.string().optional()).optional(),
    technicalNotes: zod_1.z.preprocess((v) => (v === null ? undefined : v), zod_1.z.string().optional()).optional(),
    influenceRevenue: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), zod_1.z.number().optional()).optional(),
    influenceKol: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), zod_1.z.number().optional()).optional(),
    influenceReuse: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), zod_1.z.number().optional()).optional(),
    influenceStrategic: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), zod_1.z.number().optional()).optional(),
    influenceTender: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), zod_1.z.number().optional()).optional(),
    importanceFlag: zod_1.z.enum(['MUST', 'SHOULD', 'NICE']).optional(),
    customerDeadline: zod_1.z.preprocess((s) => (s ? new Date(s) : null), zod_1.z.date().nullable().optional()),
    currentStatus: zod_1.z.string().optional(),
    createdByDept: zod_1.z.string().optional(),
    createdByUserId: zod_1.z.string().optional(),
    createdByName: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    rawCustomerText: zod_1.z.string().min(1),
    salesSummary: zod_1.z.string().min(1),
    rdGroupIds: zod_1.z.array(zod_1.z.string()).default([]),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    techAreas: zod_1.z.array(zod_1.z.object({ groupName: zod_1.z.string(), code: zod_1.z.string(), label: zod_1.z.string() })).optional(),
    attachments: zod_1.z.array(zod_1.z.object({ filename: zod_1.z.string(), url: zod_1.z.string().optional() })).optional(),
    // Option C fields
    riceReach: zod_1.z.number().int().positive().optional(),
    riceImpact: zod_1.z.number().int().positive().optional(),
    riceConfidence: zod_1.z.number().int().positive().optional(),
    riceEffort: zod_1.z.number().int().positive().optional(),
    regulatoryRequired: zod_1.z.boolean().optional(),
    regulatoryRiskLevel: zod_1.z.string().optional(),
    regulatoryNotes: zod_1.z.string().optional(),
    strategicAlignment: zod_1.z.number().int().positive().optional(),
    resourceEstimateWeeks: zod_1.z.number().int().positive().optional(),
    kpiMetric: zod_1.z.string().optional(),
    kpiTarget: zod_1.z.number().int().positive().optional(),
});
router.post('/', auth_1.authMiddleware, (0, auth_1.requireRole)(['SALES', 'EXEC', 'ADMIN']), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const data = parsed.data;
    const authUser = req.user;
    const creatorId = authUser?.user_id || data.createdByUserId || 'unknown-user';
    const creatorDept = authUser?.organization || data.createdByDept || 'unknown-dept';
    const creatorName = authUser?.name || data.createdByName || null;
    const influenceNumbers = [
        data.influenceRevenue ?? 0,
        data.influenceKol ?? 0,
        data.influenceReuse ?? 0,
        data.influenceStrategic ?? 0,
        data.influenceTender ?? 0,
    ].map((n) => (Number.isFinite(n) ? Number(n) : 0));
    const influenceScore = influenceNumbers.reduce((a, b) => a + b, 0);
    const rdGroups = await db_1.prisma.rDGroup.findMany({ where: { id: { in: data.rdGroupIds } } });
    if (rdGroups.length !== data.rdGroupIds.length) {
        return res.status(400).json({ error: 'Invalid RD group selection' });
    }
    const techAreasCreate = [...(data.techAreas ?? [])];
    if (data.technicalNotes && data.technicalNotes.trim().length > 0) {
        techAreasCreate.push({ groupName: 'Notes', code: 'NOTE', label: data.technicalNotes.trim() });
    }
    if (influenceScore > 0) {
        techAreasCreate.push({ groupName: 'Influence', code: 'INF_SCORE', label: influenceScore.toString() });
        techAreasCreate.push({
            groupName: 'Influence',
            code: 'INF_DETAIL',
            label: `①${data.influenceRevenue ?? 0} ②${data.influenceKol ?? 0} ③${data.influenceReuse ?? 0} ④${data.influenceStrategic ?? 0} ⑤${data.influenceTender ?? 0}`,
        });
    }
    const request = await db_1.prisma.request.create({
        data: {
            title: data.title,
            customerName: data.customerName,
            productArea: data.productArea,
            productModel: data.productModel ?? null,
            category: data.category ?? 'CUSTOMIZATION',
            expectedRevenue: data.expectedRevenue !== null && data.expectedRevenue !== undefined ? BigInt(data.expectedRevenue) : null,
            revenueEstimateStatus: data.revenueEstimateStatus ?? null,
            revenueEstimateNote: data.revenueEstimateNote ?? null,
            importanceFlag: data.importanceFlag ?? 'MUST',
            customerDeadline: data.customerDeadline ?? new Date(),
            currentStage: 'IDEATION',
            currentStatus: data.currentStatus ?? 'SUBMITTED',
            createdByDept: creatorDept,
            createdByUserId: creatorId,
            createdByName: creatorName,
            region: data.region ?? null,
            rawCustomerText: data.rawCustomerText,
            salesSummary: data.salesSummary,
            keywords: { create: (data.keywords ?? []).map((k) => ({ keyword: k })) },
            rdGroups: { create: data.rdGroupIds.map((id) => ({ rdGroupId: id, role: 'LEAD' })) },
            techAreas: { create: techAreasCreate },
            attachments: { create: data.attachments ?? [] },
            riceReach: data.riceReach ?? null,
            riceImpact: data.riceImpact ?? null,
            riceConfidence: data.riceConfidence ?? null,
            riceEffort: data.riceEffort ?? null,
            riceScore: data.riceReach && data.riceImpact && data.riceConfidence && data.riceEffort
                ? (data.riceReach * data.riceImpact * data.riceConfidence) / data.riceEffort
                : null,
            regulatoryRequired: data.regulatoryRequired ?? false,
            regulatoryRiskLevel: data.regulatoryRiskLevel ?? null,
            regulatoryNotes: data.regulatoryNotes ?? null,
            strategicAlignment: data.strategicAlignment ?? null,
            resourceEstimateWeeks: data.resourceEstimateWeeks ?? null,
            kpiMetric: data.kpiMetric ?? null,
            kpiTarget: data.kpiTarget ?? null,
        },
    });
    await db_1.prisma.stageHistory.create({
        data: { requestId: request.id, stage: 'IDEATION', enteredAt: new Date(), exitedAt: null },
    });
    res.status(201).json({
        ...request,
        expectedRevenue: toNumber(request.expectedRevenue),
    });
});
// Similar requests search: same productArea + LIKE title/rawCustomerText
router.get('/similar', async (req, res) => {
    const { productArea, q } = req.query;
    if (!productArea || !q)
        return res.status(400).json({ error: 'productArea and q required' });
    const items = await db_1.prisma.request.findMany({
        where: {
            productArea: productArea,
            OR: [
                { title: { contains: q } },
                { rawCustomerText: { contains: q } },
            ],
        },
        orderBy: [{ submittedAt: 'desc' }],
        take: 10,
        select: { id: true, title: true, productArea: true, submittedAt: true, currentStage: true },
    });
    res.json(items);
});
// High-value requests (top 20% by expectedRevenue)
router.get('/high-value', async (_req, res) => {
    const withRevenue = await db_1.prisma.request.findMany({ where: { expectedRevenue: { not: null } } });
    if (withRevenue.length === 0)
        return res.json([]);
    const sorted = withRevenue.sort((a, b) => Number(b.expectedRevenue ?? 0) - Number(a.expectedRevenue ?? 0));
    const topCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const top = sorted.slice(0, topCount);
    const detailed = await db_1.prisma.request.findMany({
        where: { id: { in: top.map((r) => r.id) } },
        include: { stageHistory: true },
        orderBy: { customerDeadline: 'asc' },
    });
    res.json(detailed.map((r) => ({ ...r, expectedRevenue: toNumber(r.expectedRevenue) })));
});
// Keyword stats for current year
router.get('/stats/keywords', async (_req, res) => {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const items = await db_1.prisma.requestKeyword.groupBy({
        by: ['keyword'],
        where: { request: { submittedAt: { gte: start } } },
        _count: { keyword: true },
        orderBy: { _count: { keyword: 'desc' } },
    });
    res.json(items);
});
// RD group load chart: active requests per RD group
router.get('/stats/rd-groups', async (_req, res) => {
    const activeStages = ['IDEATION', 'REVIEW', 'CONFIRM', 'PROJECT'];
    const allGroups = await db_1.prisma.rDGroup.findMany({});
    const data = await Promise.all(allGroups.map(async (g) => {
        const count = await db_1.prisma.requestRDGroup.count({
            where: {
                rdGroupId: g.id,
                request: { currentStage: { in: activeStages } },
            },
        });
        return { id: g.id, group: g.name, category: g.category, activeRequests: count };
    }));
    res.json(data);
});
// Stage transition stats over recent window
router.get('/stats/updates', async (req, res) => {
    const daysParam = Number(req.query.days || 7);
    // allow up to 1 year window so the "last 1 year" dropdown option works
    const windowDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(365, Math.max(1, daysParam)) : 7;
    const start = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    // Normalize stage naming inconsistencies: COMPLETE was used interchangeably with RELEASE
    const normalizeStage = (stage) => {
        if (!stage)
            return stage;
        return stage === 'COMPLETE' ? 'RELEASE' : stage;
    };
    const recentHistories = await db_1.prisma.stageHistory.findMany({
        where: { enteredAt: { gte: start } },
        orderBy: [{ requestId: 'asc' }, { enteredAt: 'asc' }],
        include: {
            request: { select: { id: true, title: true, customerName: true, productArea: true, currentStage: true } },
        },
    });
    const requestIds = Array.from(new Set(recentHistories.map((h) => h.requestId)));
    if (requestIds.length === 0)
        return res.json({ windowDays, transitions: [] });
    const allHistories = await db_1.prisma.stageHistory.findMany({
        where: { requestId: { in: requestIds } },
        orderBy: [{ requestId: 'asc' }, { enteredAt: 'asc' }],
    });
    const buckets = {
        IDEATION_TO_REVIEW: [],
        REVIEW_TO_CONFIRM: [],
        CONFIRM_TO_PROJECT: [],
        PROJECT_TO_RELEASE: [],
        ANY_TO_REJECTED: [],
    };
    const byRequest = new Map();
    for (const h of allHistories) {
        if (!byRequest.has(h.requestId))
            byRequest.set(h.requestId, []);
        byRequest.get(h.requestId).push(h);
    }
    for (const [reqId, histories] of byRequest.entries()) {
        histories.sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime());
        let prevStage = null;
        for (const h of histories) {
            const enteredAt = new Date(h.enteredAt);
            const normalizedCurrent = normalizeStage(h.stage);
            if (enteredAt < start) {
                prevStage = normalizedCurrent;
                continue;
            }
            const from = normalizeStage(prevStage);
            const to = normalizedCurrent;
            const info = recentHistories.find((x) => x.id === h.id)?.request;
            const record = {
                requestId: reqId,
                title: info?.title || '',
                customerName: info?.customerName || '',
                productArea: info?.productArea || '',
                currentStage: info?.currentStage || to,
                fromStage: from,
                toStage: to,
                enteredAt,
            };
            if (from === 'IDEATION' && to === 'REVIEW')
                buckets.IDEATION_TO_REVIEW.push(record);
            if (from === 'REVIEW' && to === 'CONFIRM')
                buckets.REVIEW_TO_CONFIRM.push(record);
            if (from === 'CONFIRM' && to === 'PROJECT')
                buckets.CONFIRM_TO_PROJECT.push(record);
            if (from === 'PROJECT' && to === 'RELEASE')
                buckets.PROJECT_TO_RELEASE.push(record);
            if (to === 'REJECTED')
                buckets.ANY_TO_REJECTED.push(record);
            prevStage = to;
        }
    }
    // keep only the latest transition per request for each bucket
    const keepLatest = (items) => {
        const byReq = new Map();
        for (const item of items) {
            const ts = new Date(item.enteredAt).getTime();
            const existing = byReq.get(item.requestId);
            if (!existing || ts > new Date(existing.enteredAt).getTime()) {
                byReq.set(item.requestId, item);
            }
        }
        return Array.from(byReq.values()).sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
    };
    const transitions = [
        { key: 'IDEATION_TO_REVIEW', label: 'Ideation \u2192 Review', items: keepLatest(buckets.IDEATION_TO_REVIEW) },
        { key: 'REVIEW_TO_CONFIRM', label: 'Review \u2192 Confirm', items: keepLatest(buckets.REVIEW_TO_CONFIRM) },
        { key: 'CONFIRM_TO_PROJECT', label: 'Confirm \u2192 Project', items: keepLatest(buckets.CONFIRM_TO_PROJECT) },
        { key: 'PROJECT_TO_RELEASE', label: 'Project \u2192 Complete', items: keepLatest(buckets.PROJECT_TO_RELEASE) },
        { key: 'ANY_TO_REJECTED', label: 'Rejected (any stage)', items: keepLatest(buckets.ANY_TO_REJECTED) },
    ];
    res.json({ windowDays, transitions });
});
// RD groups list (for frontend to render checkboxes with IDs)
router.get('/rd-groups', async (_req, res) => {
    const groups = await db_1.prisma.rDGroup.findMany({ orderBy: { name: 'asc' } });
    res.json(groups);
});
// Request detail with relations
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const item = await db_1.prisma.request.findUnique({ where: { id }, include: detailInclude });
    if (!item)
        return res.status(404).json({ error: 'Not found' });
    res.json({
        ...item,
        expectedRevenue: toNumber(item.expectedRevenue),
        technicalNotes: item.techAreas?.find((t) => t.code === 'NOTE')?.label ?? null,
        customerInfluenceScore: (() => {
            const raw = item.techAreas?.find((t) => t.code === 'INF_SCORE')?.label;
            const num = raw ? Number(raw) : null;
            return Number.isFinite(num) ? num : null;
        })(),
    });
});
// Simple update of stage/status
// Allow all authenticated roles to update stage/status (wider for simplicity)
router.patch('/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['ADMIN', 'EXEC', 'RD', 'SALES', 'VIEWER']), async (req, res) => {
    const { id } = req.params;
    const existing = await db_1.prisma.request.findUnique({ where: { id } });
    if (!existing)
        return res.status(404).json({ error: 'Not found' });
    // Allow updating key fields; ignore unknown keys
    const body = req.body;
    const data = {};
    const allowedKeys = [
        'title', 'customerName', 'productArea', 'productModel', 'category', 'expectedRevenue', 'importanceFlag',
        'customerDeadline', 'currentStage', 'currentStatus', 'region', 'rawCustomerText', 'salesSummary',
        'revenueEstimateStatus', 'revenueEstimateNote', 'createdByDept', 'createdByName'
    ];
    const keywords = Array.isArray(body.keywords) ? body.keywords : undefined;
    const techAreas = Array.isArray(body.techAreas) ? body.techAreas : undefined;
    const attachments = Array.isArray(body.attachments)
        ? body.attachments
        : undefined;
    const technicalNotesProvided = Object.prototype.hasOwnProperty.call(body, 'technicalNotes');
    const technicalNotes = typeof body.technicalNotes === 'string' ? body.technicalNotes : null;
    for (const k of allowedKeys) {
        if (body[k] !== undefined && body[k] !== null) {
            if (k === 'customerDeadline')
                data[k] = new Date(body[k]);
            else if (k === 'expectedRevenue')
                data[k] = body[k] === '' ? null : BigInt(body[k]);
            else
                data[k] = body[k];
        }
    }
    // Keep createdByUserId stable to avoid breaking the relation; only update display name
    if (typeof body.createdByName === 'string') {
        const name = body.createdByName.trim();
        data.createdByName = name.length ? name : existing.createdByName;
    }
    const newRdGroups = Array.isArray(body.rdGroupIds) ? body.rdGroupIds : undefined;
    const stageChanged = body.currentStage && body.currentStage !== existing.currentStage;
    await db_1.prisma.$transaction(async (tx) => {
        if (Object.keys(data).length > 0) {
            await tx.request.update({ where: { id }, data });
        }
        if (stageChanged) {
            const now = new Date();
            await tx.stageHistory.updateMany({ where: { requestId: id, exitedAt: null }, data: { exitedAt: now } });
            await tx.stageHistory.create({ data: { requestId: id, stage: body.currentStage, enteredAt: now, exitedAt: null } });
        }
        if (keywords) {
            await tx.requestKeyword.deleteMany({ where: { requestId: id } });
            if (keywords.length) {
                await tx.requestKeyword.createMany({
                    data: keywords.filter(Boolean).map((k) => ({ requestId: id, keyword: k })),
                });
            }
        }
        if (attachments) {
            await tx.requestAttachment.deleteMany({ where: { requestId: id } });
            if (attachments.length) {
                await tx.requestAttachment.createMany({
                    data: attachments.map((a) => ({
                        requestId: id,
                        filename: a.filename,
                        url: a.url ?? null,
                    })),
                });
            }
        }
        if (techAreas || technicalNotesProvided) {
            await tx.requestTechArea.deleteMany({ where: { requestId: id } });
            const techAreasCreate = [...(techAreas ?? [])];
            const note = technicalNotes?.trim();
            if (note) {
                techAreasCreate.push({ groupName: 'Notes', code: 'NOTE', label: note });
            }
            if (techAreasCreate.length) {
                await tx.requestTechArea.createMany({
                    data: techAreasCreate.map((t) => ({
                        requestId: id,
                        groupName: t.groupName ?? 'Notes',
                        code: t.code ?? 'NOTE',
                        label: t.label ?? '',
                    })),
                });
            }
        }
        if (newRdGroups) {
            await tx.requestRDGroup.deleteMany({ where: { requestId: id } });
            if (newRdGroups.length) {
                await tx.requestRDGroup.createMany({
                    data: newRdGroups.map((g) => ({ requestId: id, rdGroupId: g, role: 'LEAD' })),
                });
            }
        }
    });
    const updated = await db_1.prisma.request.findUnique({ where: { id }, include: detailInclude });
    res.json(updated
        ? {
            ...updated,
            expectedRevenue: toNumber(updated.expectedRevenue),
            technicalNotes: updated.techAreas?.find((t) => t.code === 'NOTE')?.label ?? null,
            customerInfluenceScore: (() => {
                const raw = updated.techAreas?.find((t) => t.code === 'INF_SCORE')?.label;
                const num = raw ? Number(raw) : null;
                return Number.isFinite(num) ? num : null;
            })(),
        }
        : updated);
});
// Set/update target completion date for a stage (RD/EXEC/ADMIN)
router.patch('/:id/stage-target', auth_1.authMiddleware, (0, auth_1.requireRole)(['ADMIN', 'EXEC', 'RD']), async (req, res) => {
    const { id } = req.params;
    const { stage, targetDate } = req.body || {};
    if (!stage || !targetDate)
        return res.status(400).json({ error: 'stage and targetDate required' });
    const parsed = new Date(targetDate);
    if (Number.isNaN(parsed.getTime()))
        return res.status(400).json({ error: 'Invalid targetDate' });
    const request = await db_1.prisma.request.findUnique({ where: { id } });
    if (!request)
        return res.status(404).json({ error: 'Not found' });
    const authUser = req.user || {};
    const setByUserId = authUser.user_id ?? null;
    const setByName = authUser.name ?? null;
    const normalizedStage = stage === 'COMPLETE' ? 'RELEASE' : stage;
    const existing = await db_1.prisma.requestStageTarget.findUnique({
        where: { requestId_stage: { requestId: id, stage: normalizedStage } },
    });
    await db_1.prisma.$transaction(async (tx) => {
        await tx.requestStageTarget.upsert({
            where: { requestId_stage: { requestId: id, stage: normalizedStage } },
            update: { targetDate: parsed, setByUserId, setByName },
            create: { requestId: id, stage: normalizedStage, targetDate: parsed, setByUserId, setByName },
        });
        await tx.requestStageTargetHistory.create({
            data: {
                requestId: id,
                stage: normalizedStage,
                previousTarget: existing?.targetDate ?? null,
                newTarget: parsed,
                changedByUserId: setByUserId,
                changedByName: setByName,
            },
        });
    });
    const targets = await db_1.prisma.requestStageTarget.findMany({ where: { requestId: id } });
    const history = await db_1.prisma.requestStageTargetHistory.findMany({
        where: { requestId: id },
        orderBy: { changedAt: 'desc' },
    });
    res.json({ target: targets.find((t) => t.stage === normalizedStage), targets, history });
});
// Delete request (admin tool)
router.delete('/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    await db_1.prisma.requestKeyword.deleteMany({ where: { requestId: id } });
    await db_1.prisma.requestRDGroup.deleteMany({ where: { requestId: id } });
    await db_1.prisma.requestAttachment.deleteMany({ where: { requestId: id } });
    await db_1.prisma.requestTechArea.deleteMany({ where: { requestId: id } });
    await db_1.prisma.stageHistory.deleteMany({ where: { requestId: id } });
    await db_1.prisma.request.delete({ where: { id } });
    res.json({ ok: true });
});
exports.default = router;
