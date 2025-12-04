import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    // Users
    const defaultUsers = [
        { id: 'sales_user', name: 'Sales User', dept: 'Domestic Sales', role: 'SALES', email: 'sales@example.com', organization: 'Sales HQ', password: 'password' },
        { id: 'rd_owner', name: 'RD Owner', dept: 'R&D Program', role: 'RD', email: 'rd@example.com', organization: 'R&D', password: 'password' },
        { id: 'exec_user', name: 'Executive', dept: 'Executive Office', role: 'EXEC', email: 'exec@example.com', organization: 'Executive', password: 'password' },
        { id: 'admin_user', name: 'Admin', dept: 'Operations', role: 'ADMIN', email: 'admin@example.com', organization: 'Operations', password: 'password' },
    ];
    const userRecords = await Promise.all(defaultUsers.map(async (u) => {
        const passwordHash = await bcrypt.hash(u.password, 10);
        return prisma.user.upsert({
            where: { id: u.id },
            update: {
                name: u.name,
                dept: u.dept,
                role: u.role,
                email: u.email,
                organization: u.organization,
                passwordHash,
            },
            create: {
                id: u.id,
                name: u.name,
                dept: u.dept,
                role: u.role,
                email: u.email,
                organization: u.organization,
                passwordHash,
            },
        });
    }));
    const salesUser = userRecords.find((u) => u.id === 'sales_user');
    if (!salesUser)
        throw new Error('Seed: sales_user not created');
    // RD Groups
    const rdGroupsData = [
        { name: '시스템 아키텍처', category: 'Core' },
        { name: '임베디드 펌웨어', category: 'Core' },
        { name: '전자 하드웨어', category: 'Core' },
        { name: '기구 설계', category: 'Core' },
        { name: '영상/알고리즘', category: 'Platform' },
        { name: 'AI/딥러닝', category: 'Platform' },
        { name: '소프트웨어 플랫폼', category: 'Platform' },
        { name: 'UI/UX', category: 'Platform' },
        { name: '클라우드/연동', category: 'Platform' },
        { name: '인증/규제', category: 'Compliance' },
        { name: '품질/검증(QA)', category: 'Quality' },
    ];
    const rdGroups = await Promise.all(rdGroupsData.map(g => prisma.rDGroup.upsert({
        where: { name: g.name },
        update: {},
        create: g,
    })));
    // Requests with stages, keywords, tech areas
    const now = new Date();
    const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const requests = [];
    for (let i = 1; i <= 20; i++) {
        const area = ['C_ARM', 'MAMMO', 'DENTAL', 'NEW_BUSINESS'][i % 4];
        const imp = ['MUST', 'SHOULD', 'NICE'][i % 3];
        const cat = ['NEW_PRODUCT', 'PRODUCT_IMPROVEMENT', 'CUSTOMIZATION'][i % 3];
        const expectedRevenue = i % 5 === 0 ? (i * 100000000) : null;
        const req = await prisma.request.create({
            data: {
                title: `Request ${i}: Improvement #${i}`,
                customerName: i % 2 === 0 ? '서울병원' : '부산병원',
                productArea: area,
                productModel: area === 'C_ARM' ? 'Oscar 15' : area === 'MAMMO' ? 'Hestia' : area === 'DENTAL' ? 'Papaya Plus' : null,
                category: cat,
                expectedRevenue,
                importanceFlag: imp,
                submittedAt: addDays(-30 - i),
                customerDeadline: addDays(15 + i),
                currentStage: ['IDEATION', 'REVIEW', 'CONFIRM', 'PROJECT'][i % 4],
                currentStatus: i % 4 === 2 ? 'CTO_APPROVAL_PENDING' : i % 4 === 3 ? 'CEO_APPROVAL_PENDING' : 'IN_REVIEW',
                createdByDept: salesUser.dept,
                createdByUserId: salesUser.id,
                region: i % 2 === 0 ? 'KR' : 'US',
                rawCustomerText: `원문 요구사항 ${i}: UI 개선과 기능 추가 요청.`,
                salesSummary: `영업 요약 ${i}: 고객 UX 불만과 경쟁사 대비 기능 부족 보완 필요`,
                keywords: {
                    create: [
                        { keyword: 'UI 개선' },
                        ...(i % 3 === 0 ? [{ keyword: 'Dose reduction' }] : []),
                        ...(i % 4 === 0 ? [{ keyword: 'Footswitch' }] : []),
                    ],
                },
                rdGroups: {
                    create: [
                        { rdGroupId: rdGroups[i % rdGroups.length].id, role: 'LEAD' },
                        { rdGroupId: rdGroups[(i + 3) % rdGroups.length].id, role: 'SUPPORT' },
                    ],
                },
                techAreas: {
                    create: [
                        { groupName: '덴탈SW그룹', code: 'SW_UI', label: '촬영 UI/워크플로우 변경' },
                        { groupName: '전자그룹', code: 'PCB_CHANGE', label: 'PCB/보드 변경' },
                    ],
                },
                // Option C sample values
                riceReach: (i % 5) + 5,
                riceImpact: (i % 4) + 6,
                riceConfidence: (i % 3) + 7,
                riceEffort: (i % 6) + 3,
                riceScore: null, // will be computed below
                regulatoryRequired: i % 4 === 0,
                regulatoryRiskLevel: i % 4 === 0 ? (i % 8 === 0 ? 'HIGH' : 'MEDIUM') : 'LOW',
                regulatoryNotes: i % 4 === 0 ? '의료기기 변경 신고 필요 가능성' : null,
                strategicAlignment: (i % 5) + 1,
                resourceEstimateWeeks: (i % 8) + 4,
                kpiMetric: i % 2 === 0 ? 'Install base retention' : 'New logo win rate',
                kpiTarget: i % 2 === 0 ? 5 : 3,
            },
        });
        // compute RICE score after create
        if (req.riceReach && req.riceImpact && req.riceConfidence && req.riceEffort) {
            const riceScore = (req.riceReach * req.riceImpact * req.riceConfidence) / req.riceEffort;
            await prisma.request.update({ where: { id: req.id }, data: { riceScore } });
        }
        const ideationStart = addDays(-30 - i);
        const reviewStart = addDays(-20 - i);
        const confirmStart = addDays(-10 - i);
        const projectStart = addDays(0 - i);
        await prisma.stageHistory.create({ data: { requestId: req.id, stage: 'IDEATION', enteredAt: ideationStart, exitedAt: reviewStart } });
        await prisma.stageHistory.create({ data: { requestId: req.id, stage: 'REVIEW', enteredAt: reviewStart, exitedAt: confirmStart } });
        await prisma.stageHistory.create({ data: { requestId: req.id, stage: 'CONFIRM', enteredAt: confirmStart, exitedAt: projectStart } });
        await prisma.stageHistory.create({ data: { requestId: req.id, stage: 'PROJECT', enteredAt: projectStart, exitedAt: null } });
        requests.push(req);
    }
    console.log(`Seeded ${requests.length} requests`);
}
main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
