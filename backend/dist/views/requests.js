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
        'revenueEstimateStatus', 'revenueEstimateNote'
    ];
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
    const stageChanged = body.currentStage && body.currentStage !== existing.currentStage;
    if (Object.keys(data).length > 0) {
        await db_1.prisma.request.update({ where: { id }, data });
    }
    if (stageChanged) {
        const now = new Date();
        await db_1.prisma.stageHistory.updateMany({ where: { requestId: id, exitedAt: null }, data: { exitedAt: now } });
        await db_1.prisma.stageHistory.create({ data: { requestId: id, stage: body.currentStage, enteredAt: now, exitedAt: null } });
    }
    const updated = await db_1.prisma.request.findUnique({ where: { id }, include: detailInclude });
    res.json(updated ? { ...updated, expectedRevenue: toNumber(updated.expectedRevenue) } : updated);
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
