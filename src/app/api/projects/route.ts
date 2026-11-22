import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { randomUUID } from 'node:crypto';

// In-memory active project store for demo & API contracts
const projectsStore: any[] = [
  {
    id: 'proj-verma',
    studioId: 'studio-aarav-001',
    name: 'Verma Wedding',
    clientId: 'client-verma',
    eventType: 'Wedding',
    venueLocation: 'Delhi',
    primaryContactPerson: 'Kavita Verma',
    targetAlbumDeliveryDate: '2026-12-15',
    stage: 'Shoot Completed',
    financialStatus: 'Partially Settled',
    contractValuePaise: 15000000n,
    collectedPaise: 6000000n, // ₹60,000 collected (₹45k booking + ₹15k partial shoot)
    outstandingPaise: 9000000n, // ₹90,000 remaining
    overduePaise: 4500000n, // ₹45,000 overdue by 10 days
    vendorCostsPaise: 4200000n, // ₹42,000 total vendor commitments
    expectedProfitPaise: 10800000n, // ₹1,08,000 net profit (72% margin)
    profitMarginPercentage: 72,
    nextDeadline: '2026-11-10',
    daysOverdue: 10,
    financialHealth: 'Critical Risk',
    financialHealthReason: 'Milestone 2 is 10 days overdue. Deliverable downloads on hold.',
    milestones: [
      {
        id: 'ms-v1',
        title: 'Booking Advance',
        percentage: 30,
        amountPaise: 4500000n,
        collectedPaise: 4500000n,
        remainingPaise: 0n,
        dueDate: '2026-10-01',
        status: 'Paid',
        linkedVendorObligation: 'Lead Photographer Booking & Date Lock',
        paymentHistory: [
          { id: 'pay-v1', amountPaise: 4500000n, method: 'UPI', date: '2026-10-01', utr: 'UPI/6301/ADVANCE' },
        ],
      },
      {
        id: 'ms-v2',
        title: 'Shoot Completed (Post-Shoot Cut)',
        percentage: 40,
        amountPaise: 6000000n,
        collectedPaise: 1500000n,
        remainingPaise: 4500000n,
        dueDate: '2026-11-10',
        status: 'Partially Paid',
        linkedVendorObligation: 'Editor Collective (₹15,000) & Crew Assist (₹12,000)',
        paymentHistory: [
          { id: 'pay-v2-part', amountPaise: 1500000n, method: 'NEFT', date: '2026-11-12', utr: 'NEFT/5541/PARTIAL' },
        ],
      },
      {
        id: 'ms-v3',
        title: 'Final Album & High-Res Delivery',
        percentage: 30,
        amountPaise: 4500000n,
        collectedPaise: 0n,
        remainingPaise: 4500000n,
        dueDate: '2026-12-04',
        status: 'Unpaid',
        linkedVendorObligation: 'Canvera Print Lab Binding & Delivery (₹15,000)',
        paymentHistory: [],
      },
    ],
    vendorExpenses: [
      { id: 've-1', category: 'Crew & Lighting', vendor: 'Crew Assist Co', amountPaise: 1200000n, status: 'Paid', linkedMilestone: 'Shoot Completed' },
      { id: 've-2', category: 'Cinematic Editing', vendor: 'Editor Collective', amountPaise: 1500000n, status: 'Pending Payout', linkedMilestone: 'Shoot Completed' },
      { id: 've-3', category: 'Print & Binding', vendor: 'Canvera Print Lab', amountPaise: 1500000n, status: 'Committed', linkedMilestone: 'Final Album' },
    ],
  },
  {
    id: 'proj-kapoor',
    studioId: 'studio-aarav-001',
    name: 'Kapoor Engagement',
    clientId: 'client-kapoor',
    eventType: 'Engagement',
    venueLocation: 'Mumbai',
    primaryContactPerson: 'Rohan Kapoor',
    targetAlbumDeliveryDate: '2026-11-28',
    stage: 'Digital Proofs Ready',
    financialStatus: 'Pending',
    contractValuePaise: 8000000n,
    collectedPaise: 4000000n, // ₹40,000 collected (50%)
    outstandingPaise: 4000000n,
    overduePaise: 0n,
    vendorCostsPaise: 2200000n, // ₹22,000 vendor costs
    expectedProfitPaise: 5800000n, // ₹58,000 net profit (72.5% margin)
    profitMarginPercentage: 72.5,
    nextDeadline: '2026-11-25',
    daysOverdue: 0,
    financialHealth: 'Healthy',
    financialHealthReason: 'All collections on schedule. Digital proofs pending client review.',
    milestones: [
      {
        id: 'ms-k1',
        title: 'Advance & Date Reservation',
        percentage: 50,
        amountPaise: 4000000n,
        collectedPaise: 4000000n,
        remainingPaise: 0n,
        dueDate: '2026-10-15',
        status: 'Paid',
        linkedVendorObligation: 'Venue & Equipment Rental',
        paymentHistory: [
          { id: 'pay-k1', amountPaise: 4000000n, method: 'UPI', date: '2026-10-15', utr: 'UPI/9921/KAPOOR' },
        ],
      },
      {
        id: 'ms-k2',
        title: 'Proofs & Digital Gallery Release',
        percentage: 50,
        amountPaise: 4000000n,
        collectedPaise: 0n,
        remainingPaise: 4000000n,
        dueDate: '2026-11-25',
        status: 'Unpaid',
        linkedVendorObligation: 'Retoucher Guild (₹12,000) & Cloud Hosting (₹2,000)',
        paymentHistory: [],
      },
    ],
    vendorExpenses: [
      { id: 've-k1', category: 'Equipment Rental', vendor: 'Prime Camera Rentals', amountPaise: 800000n, status: 'Paid', linkedMilestone: 'Advance' },
      { id: 've-k2', category: 'Color Grading & Proofs', vendor: 'Retoucher Guild', amountPaise: 1200000n, status: 'Pending Payout', linkedMilestone: 'Proofs' },
      { id: 've-k3', category: 'Gallery Hosting', vendor: 'CloudVault Media', amountPaise: 200000n, status: 'Committed', linkedMilestone: 'Proofs' },
    ],
  },
  {
    id: 'proj-mehta',
    studioId: 'studio-aarav-001',
    name: 'Mehta Corporate Brand Shoot',
    clientId: 'client-mehta',
    eventType: 'Corporate',
    venueLocation: 'Bangalore',
    primaryContactPerson: 'Anil Mehta',
    targetAlbumDeliveryDate: '2026-12-05',
    stage: 'Booking',
    financialStatus: 'Pending',
    contractValuePaise: 6000000n,
    collectedPaise: 2000000n, // ₹20,000 booking
    outstandingPaise: 4000000n,
    overduePaise: 0n,
    vendorCostsPaise: 1800000n,
    expectedProfitPaise: 4200000n, // ₹42,000 (70% margin)
    profitMarginPercentage: 70,
    nextDeadline: '2026-11-30',
    daysOverdue: 0,
    financialHealth: 'Healthy',
    financialHealthReason: 'Commercial agreement executed. Pre-production planning underway.',
    milestones: [
      {
        id: 'ms-m1',
        title: 'Project Initiation & Retainer',
        percentage: 33.3,
        amountPaise: 2000000n,
        collectedPaise: 2000000n,
        remainingPaise: 0n,
        dueDate: '2026-11-01',
        status: 'Paid',
        linkedVendorObligation: 'Studio Space Booking',
        paymentHistory: [
          { id: 'pay-m1', amountPaise: 2000000n, method: 'Bank Transfer', date: '2026-11-01', utr: 'IMPS/3312/MEHTA' },
        ],
      },
      {
        id: 'ms-m2',
        title: 'Production Shoot Day',
        percentage: 33.3,
        amountPaise: 2000000n,
        collectedPaise: 0n,
        remainingPaise: 2000000n,
        dueDate: '2026-11-30',
        status: 'Unpaid',
        linkedVendorObligation: 'Lighting Gaffer & Assistant Crew',
        paymentHistory: [],
      },
      {
        id: 'ms-m3',
        title: 'Brand Asset Handoff',
        percentage: 33.4,
        amountPaise: 2000000n,
        collectedPaise: 0n,
        remainingPaise: 2000000n,
        dueDate: '2026-12-05',
        status: 'Unpaid',
        linkedVendorObligation: 'Commercial Audio & Asset Master',
        paymentHistory: [],
      },
    ],
    vendorExpenses: [
      { id: 've-m1', category: 'Studio Hire', vendor: 'Loft 44 Bangalore', amountPaise: 800000n, status: 'Committed', linkedMilestone: 'Initiation' },
      { id: 've-m2', category: 'Commercial Crew', vendor: 'Gaffer Collective', amountPaise: 1000000n, status: 'Committed', linkedMilestone: 'Production' },
    ],
  },
];

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  const result = projectsStore.map((p) => {
    if (user!.role === 'Team Member') {
      // Operations view: money fields scrubbed per LLD §8
      const {
        contractValuePaise,
        collectedPaise,
        outstandingPaise,
        overduePaise,
        vendorCostsPaise,
        expectedProfitPaise,
        profitMarginPercentage,
        milestones,
        financialStatus,
        vendorExpenses,
        ...opsView
      } = p;
      return opsView;
    }
    return {
      ...p,
      contractValuePaise: p.contractValuePaise.toString(),
      collectedPaise: p.collectedPaise ? p.collectedPaise.toString() : '0',
      outstandingPaise: p.outstandingPaise ? p.outstandingPaise.toString() : '0',
      overduePaise: p.overduePaise ? p.overduePaise.toString() : '0',
      vendorCostsPaise: p.vendorCostsPaise ? p.vendorCostsPaise.toString() : '0',
      expectedProfitPaise: p.expectedProfitPaise ? p.expectedProfitPaise.toString() : '0',
      milestones: (p.milestones || []).map((m: any) => ({
        ...m,
        amountPaise: m.amountPaise.toString(),
        collectedPaise: m.collectedPaise ? m.collectedPaise.toString() : '0',
        remainingPaise: m.remainingPaise ? m.remainingPaise.toString() : m.amountPaise.toString(),
        paymentHistory: (m.paymentHistory || []).map((ph: any) => ({
          ...ph,
          amountPaise: ph.amountPaise.toString(),
        })),
      })),
      vendorExpenses: (p.vendorExpenses || []).map((ve: any) => ({
        ...ve,
        amountPaise: ve.amountPaise.toString(),
      })),
    };
  });

  return apiSuccess(result);
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner', 'Team Member']);
  if (authErr) return authErr;

  // Enforce Free plan limit: max 3 active projects
  if (user!.plan === 'Free' && projectsStore.length >= 3) {
    return apiError('PLAN_LIMIT', 'Free plan limit reached: maximum 3 active projects allowed. Upgrade to Starter.', 403);
  }

  try {
    const body = await req.json();
    if (!body.name || !body.clientId || !body.contractValuePaise) {
      return apiError('VALIDATION_FAILED', 'name, clientId, and contractValuePaise are required', 400);
    }

    const contractPaise = BigInt(body.contractValuePaise);
    const newProj = {
      id: `proj-${randomUUID().slice(0, 8)}`,
      studioId: user!.studioId,
      name: body.name,
      clientId: body.clientId,
      eventType: body.eventType || 'Wedding',
      venueLocation: body.venueLocation || 'Delhi',
      primaryContactPerson: body.primaryContactPerson || 'Client',
      targetAlbumDeliveryDate: body.targetAlbumDeliveryDate || '2026-12-30',
      stage: 'Booking',
      financialStatus: 'Pending',
      contractValuePaise: contractPaise,
      collectedPaise: 0n,
      outstandingPaise: contractPaise,
      overduePaise: 0n,
      vendorCostsPaise: 0n,
      expectedProfitPaise: contractPaise,
      profitMarginPercentage: 100,
      nextDeadline: body.targetAlbumDeliveryDate || '2026-12-30',
      daysOverdue: 0,
      financialHealth: 'Healthy',
      financialHealthReason: 'Project created and initialized.',
      milestones: [],
      vendorExpenses: [],
    };
    projectsStore.push(newProj);

    return apiSuccess({
      ...newProj,
      contractValuePaise: newProj.contractValuePaise.toString(),
      collectedPaise: '0',
      outstandingPaise: contractPaise.toString(),
      overduePaise: '0',
      vendorCostsPaise: '0',
      expectedProfitPaise: contractPaise.toString(),
    }, 201);
  } catch {
    return apiError('VALIDATION_FAILED', 'Malformed request body', 400);
  }
}
