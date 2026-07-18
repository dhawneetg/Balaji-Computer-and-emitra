import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // You should ideally put this in .env.local
    const API_KEY = process.env.REMOVE_BG_API_KEY || 'INSERT_YOUR_API_KEY_HERE';

    if (API_KEY === 'INSERT_YOUR_API_KEY_HERE') {
      return NextResponse.json({ error: 'API Key not configured. Please add REMOVE_BG_API_KEY to your environment variables.' }, { status: 500 });
    }

    const apiFormData = new FormData();
    apiFormData.append('image_file', imageFile);
    apiFormData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Remove.bg API error: ${errorText}` }, { status: response.status });
    }

    const blob = await response.blob();
    
    return new Response(blob, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: any) {
    console.error('Remove BG Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
