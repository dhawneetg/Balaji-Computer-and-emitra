import fs from 'fs';
import path from 'path';

const ANNOUNCED_FILE = path.join(process.cwd(), 'announced_exams.json');
const BOT_API_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001/api/send-update';
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || 'balaji_secret_123';

export async function checkAndNotifyExams(exams: any[]) {
  // Existing auto-notify logic if needed
  // ... for now focus on the manual trigger
}

export async function sendManualUpdate(exam: any) {
  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': BOT_SECRET
      },
      body: JSON.stringify({
        name: exam.name,
        postName: exam.post,
        vacancy: exam.vacancy,
        date: exam.endDate,
        qual: exam.qualification,
        link: exam.link
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  } catch (error) {
    console.error('Error in sendManualUpdate:', error);
    throw error;
  }
}
