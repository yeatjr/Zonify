import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildImagePrompt, resolvePlaceScene } from '@/lib/vision';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { text, location, streetView, satellite, placeTypes, placeName, placeAddress } = await req.json();

        if (!text || !location) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Resolve Scene
        const placeScene = resolvePlaceScene(placeTypes || []);

        // 2. Environmental Analysis (Direct Fetch like IdealCity)
        let envAnalysis = null;
        if (streetView) {
            try {
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: 'Analyze this Street View image. In 2–3 concise sentences: (1) architectural style of surroundings, (2) urban density, (3) visible vegetation or climate clues.' },
                                { inlineData: { mimeType: 'image/jpeg', data: streetView } }
                            ]
                        }]
                    })
                });
                if (r.ok) {
                    const j = await r.json();
                    envAnalysis = j?.candidates?.[0]?.content?.parts?.[0]?.text || null;
                }
            } catch (err) { console.warn('Street View analysis failed:', err); }
        }

        // 3. Satellite Analysis (Direct Fetch)
        let satelliteAnalysis = null;
        if (satellite) {
            try {
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: 'This is a satellite map. In 2–3 concise factual sentences: (1) area type, (2) density/type of structures, (3) road layout.' },
                                { inlineData: { mimeType: 'image/jpeg', data: satellite } }
                            ]
                        }]
                    })
                });
                if (r.ok) {
                    const j = await r.json();
                    satelliteAnalysis = j?.candidates?.[0]?.content?.parts?.[0]?.text || null;
                }
            } catch (err) { console.warn('Satellite analysis failed:', err); }
        }

        // 4. Build Final Prompt
        const fullPrompt = buildImagePrompt(
            text,
            placeScene,
            envAnalysis,
            satelliteAnalysis,
            placeName || 'Unknown Place',
            placeAddress || '',
            placeTypes || [],
            location.lat,
            location.lng
        );

        // 5. Generate Vision (Image)
        // Note: Using the specialized image generation endpoint via fetch as typical SDKs might not support it directly yet for beta/flash-exp
        const genBody = {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        };

        if (streetView) {
            genBody.contents[0].parts.push({ text: 'Context A: Street View — use for style.' } as any);
            genBody.contents[0].parts.push({ inlineData: { mimeType: 'image/jpeg', data: streetView } } as any);
        }
        if (satellite) {
            genBody.contents[0].parts.push({ text: 'Context B: Satellite map — use for layout.' } as any);
            genBody.contents[0].parts.push({ inlineData: { mimeType: 'image/jpeg', data: satellite } } as any);
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genBody) }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini Vision Error:', error);
            return NextResponse.json({ error: 'Image generation failed', details: error }, { status: 500 });
        }

        const result = await response.json();
        const parts = result?.candidates?.[0]?.content?.parts || [];
        let base64Image = null;
        for (const part of parts) {
            if (part.inlineData?.data) {
                base64Image = part.inlineData.data;
                break;
            }
        }

        let visionUrl = null;
        if (base64Image) {
            try {
                const visionsDir = path.join(process.cwd(), 'public', 'visions');

                // Ensure the directory exists
                if (!fs.existsSync(visionsDir)) {
                    fs.mkdirSync(visionsDir, { recursive: true });
                }

                const filename = `${Date.now()}_generated.jpg`;
                const filePath = path.join(visionsDir, filename);

                // Convert base64 to buffer and save to file
                const buffer = Buffer.from(base64Image, 'base64');
                fs.writeFileSync(filePath, buffer);

                // The URL that will be stored in Firestore and loaded by the browser
                visionUrl = `/visions/${filename}`;

                console.log(`[CivicSense Vision] Image saved locally: ${filePath}`);
            } catch (err: any) {
                console.error('[CivicSense Vision] Local save failed:', err);
                visionUrl = null;
            }
        }

        return NextResponse.json({
            success: true,
            visionUrl: visionUrl,
            error: !visionUrl && base64Image ? "Local save failed - Check server logs" : null,
            analysis: { envAnalysis, satelliteAnalysis }
        });

    } catch (error: any) {
        console.error('Vision API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
