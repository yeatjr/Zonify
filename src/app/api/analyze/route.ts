import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key" });

export async function POST(req: Request) {
    try {
        const { review, businessType, location } = await req.json();

        if (!location || !businessType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch Competition (C) from Google Places API (500m radius)
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const { lat, lng } = location;

        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&keyword=${encodeURIComponent(businessType)}&key=${apiKey}`;

        let competitionCount = 0;
        try {
            const placesRes = await fetch(placesUrl);
            const placesData = await placesRes.json();
            competitionCount = placesData.results?.length || 0;
        } catch (e) {
            console.error("Error fetching places:", e);
        }

        // 2. Extract Demand (D, 1-10) from review via Gemini
        const prompt = `Analyze this resident review and extract a "Demand Weight" from 1 to 10 for the proposed business type: "${businessType}". Review: "${review}". Output ONLY an integer from 1 to 10 based on the urgency/desire expressed. No other text.`;

        let demandWeight = 5; // default fallback
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = response.text?.trim() || "5";
            const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                demandWeight = parsed;
            }
        } catch (e) {
            console.error("Error calling Gemini:", e);
        }

        // 3. Calculate Saturation Index: S = D / (C + 1)
        const saturationIndex = demandWeight / (competitionCount + 1);

        return NextResponse.json({
            demandWeight,
            competitionCount,
            saturationIndex
        });

    } catch (error: any) {
        console.error("Analyze API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
