import { NextResponse } from 'next/server';
import { sendManualUpdate } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const exam = await request.json();
    const result = await sendManualUpdate(exam);
    return NextResponse.json(result);
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: 'Failed to send update' }, { status: 500 });
  }
}
