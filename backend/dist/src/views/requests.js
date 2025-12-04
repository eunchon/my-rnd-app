import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authMiddleware, requireRole } from './auth';
const router = Router();
const detailInclude = {
    keywords: true,
    rdGroups: { include: { rdGroup: true } },
    stageHistory: { orderBy: { enteredAt: 'asc' } },
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
        prisma.request.findMany({
            where,
            orderBy: [{ customerDeadline: 'asc' }],
            skip: Number(offset),
            take: Number(limit),
            include: {
                keywords: true,
                rdGroups: { include: { rdGroup: true } },
                stageHistory: true,
            },
        }),
        prisma.request.count({ where }),
    ]);
    res.json({ items, total });
});
// Create request with validation and related entities
const createSchema = z.object({
    title: z.string().min(1),
    customerName: z.string().min(1),
    productArea: z.string().min(1),
    productModel: z.string().optional(),
    category: z.enum(['NEW_PRODUCT', 'PRODUCT_IMPROVEMENT', 'CUSTOMIZATION']),
    expectedRevenue: z.number().nullable().optional(),
    revenueEstimateStatus: z.enum(['NUMERIC', 'UNKNOWN']).optional(),
    revenueEstimateNote: z.string().optional(),
    importanceFlag: z.enum(['MUST', 'SHOULD', 'NICE']),
    customerDeadline: z.string().transform((s) => new Date(s)),
    currentStatus: z.string().optional(),
    createdByDept: z.string().min(1).optional(),
    createdByUserId: z.string().min(1).optional(),
    region: z.string().optional(),
    rawCustomerText: z.string().min(10),
    salesSummary: z.string().min(10),
    rdGroupIds: z.array(z.string()).min(1),
    keywords: z.array(z.string()).optional(),
    techAreas: z.array(z.object({ groupName: z.string(), code: z.string(), label: z.string() })).optional(),
    attachments: z.array(z.object({ filename: z.string(), url: z.string().optional() })).optional(),
    // Option C fields
    riceReach: z.number().int().positive().optional(),
    riceImpact: z.number().int().positive().optional(),
    riceConfidence: z.number().int().positive().optional(),
    riceEffort: z.number().int().positive().optional(),
    regulatoryRequired: z.boolean().optional(),
    regulatoryRiskLevel: z.string().optional(),
    regulatoryNotes: z.string().optional(),
    strategicAlignment: z.number().int().positive().optional(),
    resourceEstimateWeeks: z.number().int().positive().optional(),
    kpiMetric: z.string().optional(),
    kpiTarget: z.number().int().positive().optional(),
});
router.post('/', authMiddleware, requireRole(['sales_user', 'executive', 'admin']), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.format() });
    const data = parsed.data;
    const authUser = req.user;
    const creatorId = authUser?.user_id || data.createdByUserId;
    const creatorDept = authUser?.organization || data.createdByDept;
    if (!creatorId || !creatorDept) {
        return res.status(400).json({ error: 'Missing creator information' });
    }
    const rdGroups = await prisma.rDGroup.findMany({ where: { id: { in: data.rdGroupIds } } });
    if (rdGroups.length !== data.rdGroupIds.length) {
        return res.status(400).json({ error: 'Invalid RD group selection' });
    }
    const request = await prisma.request.create({
        data: {
            title: data.title,
            customerName: data.customerName,
            productArea: data.productArea,
            productModel: data.productModel ?? null,
            category: data.category,
            expectedRevenue: data.expectedRevenue ?? null,
            revenueEstimateStatus: data.revenueEstimateStatus ?? null,
            revenueEstimateNote: data.revenueEstimateNote ?? null,
            importanceFlag: data.importanceFlag,
            customerDeadline: data.customerDeadline,
            currentStage: 'IDEATION',
            currentStatus: data.currentStatus ?? 'SUBMITTED',
            createdByDept: creatorDept,
            createdByUserId: creatorId,
            region: data.region ?? null,
            rawCustomerText: data.rawCustomerText,
            salesSummary: data.salesSummary,
            keywords: { create: (data.keywords ?? []).map((k) => ({ keyword: k })) },
            rdGroups: { create: data.rdGroupIds.map((id) => ({ rdGroupId: id, role: 'LEAD' })) },
            techAreas: { create: data.techAreas ?? [] },
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
    await prisma.stageHistory.create({
        data: { requestId: request.id, stage: 'IDEATION', enteredAt: new Date(), exitedAt: null },
    });
    res.status(201).json(request);
});
// Similar requests search: same productArea + LIKE title/rawCustomerText
router.get('/similar', async (req, res) => {
    const { productArea, q } = req.query;
    if (!productArea || !q)
        return res.status(400).json({ error: 'productArea and q required' });
    const items = await prisma.request.findMany({
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
    const withRevenue = await prisma.request.findMany({ where: { expectedRevenue: { not: null } } });
    if (withRevenue.length === 0)
        return res.json([]);
    const sorted = withRevenue.sort((a, b) => (b.expectedRevenue ?? 0) - (a.expectedRevenue ?? 0));
    const topCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const top = sorted.slice(0, topCount);
    const detailed = await prisma.request.findMany({
        where: { id: { in: top.map((r) => r.id) } },
        include: { stageHistory: true },
        orderBy: { customerDeadline: 'asc' },
    });
    res.json(detailed);
});
// Keyword stats for current year
router.get('/stats/keywords', async (_req, res) => {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const items = await prisma.requestKeyword.groupBy({
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
    const allGroups = await prisma.rDGroup.findMany({});
    const data = await Promise.all(allGroups.map(async (g) => {
        const count = await prisma.requestRDGroup.count({
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
    const groups = await prisma.rDGroup.findMany({ orderBy: { name: 'asc' } });
    res.json(groups);
});
// Request detail with relations
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const item = await prisma.request.findUnique({ where: { id }, include: detailInclude });
    if (!item)
        return res.status(404).json({ error: 'Not found' });
    res.json(item);
});
// Simple update of stage/status
router.patch('/:id', authMiddleware, requireRole(['executive', 'admin', 'rd_owner']), async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id } });
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
            data[k] = k === 'customerDeadline' ? new Date(body[k]) : body[k];
        }
    }
    const stageChanged = body.currentStage && body.currentStage !== existing.currentStage;
    if (Object.keys(data).length > 0) {
        await prisma.request.update({ where: { id }, data });
    }
    if (stageChanged) {
        const now = new Date();
        await prisma.stageHistory.updateMany({ where: { requestId: id, exitedAt: null }, data: { exitedAt: now } });
        await prisma.stageHistory.create({ data: { requestId: id, stage: body.currentStage, enteredAt: now, exitedAt: null } });
    }
    const updated = await prisma.request.findUnique({ where: { id }, include: detailInclude });
    res.json(updated);
});
// Delete request (admin tool)
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    await prisma.requestKeyword.deleteMany({ where: { requestId: id } });
    await prisma.requestRDGroup.deleteMany({ where: { requestId: id } });
    await prisma.requestAttachment.deleteMany({ where: { requestId: id } });
    await prisma.requestTechArea.deleteMany({ where: { requestId: id } });
    await prisma.stageHistory.deleteMany({ where: { requestId: id } });
    await prisma.request.delete({ where: { id } });
    res.json({ ok: true });
});
export default router;
