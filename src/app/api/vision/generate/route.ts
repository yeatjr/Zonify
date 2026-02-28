import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildImagePrompt, resolvePlaceScene, generateArchitecturalBrief } from '@/lib/vision';

const VISION_KEY = process.env.GEMINI_VISION_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(VISION_KEY);

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
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${VISION_KEY}`, {
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
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${VISION_KEY}`, {
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

        // 4. Generate Architectural Brief (NEW CONSOLIDATION STEP)
        const designBrief = await generateArchitecturalBrief(
            VISION_KEY,
            text,
            placeName || 'Unknown Place',
            envAnalysis,
            satelliteAnalysis
        );

        // 5. Build Final Prompt
        const fullPrompt = buildImagePrompt(
            designBrief, // Use the synthesized brief instead of raw user text
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

        console.log(`[CivicSense Vision] Starting generation for: ${placeName}`);
        if (!VISION_KEY) {
            console.error('[CivicSense Vision] CRITICAL: GEMINI_API_KEY is missing in environment variables!');
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        // ... existing code ...
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${VISION_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genBody) }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error(`[CivicSense Vision] API Request Failed (${response.status}):`, error);

            if (response.status === 429) {
                return NextResponse.json({
                    success: false,
                    error: 'QUOTA_EXCEEDED',
                    message: 'AI Generation Quota Reached. Please try again in 1 minute or check Google AI Studio.'
                }, { status: 429 });
            }

            return NextResponse.json({ error: 'Image generation failed', details: error }, { status: response.status });
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
            // Prepend data URI prefix for direct browser rendering and Firestore storage
            visionUrl = `data:image/jpeg;base64,${base64Image}`;
            console.log(`[CivicSense Vision] Image generated as base64 data URI`);
        }

        return NextResponse.json({
            success: true,
            visionUrl: visionUrl,
            base64: base64Image,
            error: !visionUrl && base64Image ? "Local save failed - Check server logs" : null,
            analysis: { envAnalysis, satelliteAnalysis }
        });

    } catch (error: any) {
        console.error('Vision API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
