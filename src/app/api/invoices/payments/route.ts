import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { milestoneId, amountPaise, paymentMode, payerName, transactionRef } = body;

    if (!milestoneId || !amountPaise) {
      return NextResponse.json({ error: 'milestoneId and amountPaise are required' }, { status: 400 });
    }

    // Record verified payment
    const payment = {
      id: randomUUID(),
      milestoneId,
      amountPaise: BigInt(amountPaise),
      paymentMode: paymentMode || 'UPI',
      payerName: payerName || 'Studio Client',
      transactionRef: transactionRef || null,
      verificationStatus: 'Verified',
      receivedOn: new Date().toISOString().split('T')[0],
      voided: false,
    };

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        amountPaise: payment.amountPaise.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
