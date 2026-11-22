import { apiError, apiSuccess, getSessionUser, requireRole } from '@/infrastructure/http/response';
import { composeFollowUpMessage } from '@/modules/nudges/messages';
import { createAiAdapter } from '@/adapters/ai';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser(req);
  const authErr = requireRole(user, ['Owner']);
  if (authErr) return authErr;

  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const rawTone = (body?.tone || 'formal').toLowerCase();
    const tone = ['friendly', 'formal', 'firm'].includes(rawTone) ? (rawTone as 'friendly' | 'formal' | 'firm') : 'formal';

    const clientName = body?.clientName || 'Verma Family';
    const clientPhone = body?.clientPhone || '+919494899378';
    const projectName = body?.projectName || 'Verma Wedding';
    const amountPaise = BigInt(body?.amountPaise || '4500000');
    const daysOverdue = body?.daysOverdue || 10;
    const clientPageUrl = 'https://cashpulse.studio/p/demo-verma-link';
    const upiLink = 'upi://pay?pa=aaravpixels@okhdfcbank&pn=Aarav%20Pixels&am=45000.00&cu=INR';

    const draft = composeFollowUpMessage({
      clientName,
      projectName,
      clientPhone,
      amountPaise,
      daysOverdue,
      clientPageUrl,
      upiLink,
      tone,
    });

    // AI Nudge wording integration (Gemini with deterministic template fallback)
    const aiAdapter = createAiAdapter();
    const aiResult = await aiAdapter.draftNudge({
      tone,
      clientName,
      projectName,
      invoiceReference: `INV-${projectId}`,
      invoiceAmountPaise: amountPaise,
      daysOverdue,
      clientPageUrl,
      upiLink,
    });

    if (aiResult && aiResult.source === 'gemini' && aiResult.messageText) {
      draft.messageText = aiResult.messageText;
      draft.whatsappUrl = `https://wa.me/${draft.clientPhone}?text=${encodeURIComponent(aiResult.messageText)}`;
      draft.whatsappIntentUrl = `whatsapp://send?phone=${draft.clientPhone}&text=${encodeURIComponent(aiResult.messageText)}`;
      draft.smsUrl = `sms:${draft.clientPhone}?body=${encodeURIComponent(aiResult.messageText)}`;
    }

    return apiSuccess({
      projectId,
      tone,
      draft,
      aiSource: aiResult.source,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError('VALIDATION_FAILED', err instanceof Error ? err.message : 'Malformed request body', 400);
  }
}
