import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { milestoneId, amountPaise, payerName, transactionRef } = body;

    if (!milestoneId || !amountPaise) {
      return NextResponse.json({ error: 'milestoneId and amountPaise are required' }, { status: 400 });
    }

    // Client "I have paid" claim creates an Unverified payment
    const claim = {
      id: randomUUID(),
      milestoneId,
      amountPaise: BigInt(amountPaise),
      paymentMode: 'UPI',
      payerName: payerName || 'Client Self-Claim',
      transactionRef: transactionRef || null,
      verificationStatus: 'Unverified',
      receivedOn: new Date().toISOString().split('T')[0],
      voided: false,
    };

    return NextResponse.json({
      success: true,
      message: 'Claim recorded. Your studio owner will verify and confirm.',
      claim: {
        ...claim,
        amountPaise: claim.amountPaise.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
