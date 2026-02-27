import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key" });

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get('lat') || '40.7128');
        const lng = parseFloat(searchParams.get('lng') || '-74.0060');

        // Fetch all pins and filter by 1km radius
        const pinsSnapshot = await getDocs(collection(db, 'pins'));
        const nearbyPins: any[] = [];

        pinsSnapshot.forEach((doc) => {
            const pin = doc.data();
            // Haversine formula approximation (1 deg lat ~ 111km)
            const dLat = (pin.lat - lat) * 111;
            const dLng = (pin.lng - lng) * 111 * Math.cos(lat * (Math.PI / 180));
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            if (dist <= 1.0) {
                nearbyPins.push({ id: doc.id, ...pin });
            }
        });

        if (nearbyPins.length === 0) {
            return NextResponse.json({
                report: { topRecommendation: "None", communitySentiment: "Not enough data", marketGaps: [] },
                pinsAnalyzed: 0
            });
        }

        const pinDescriptions = nearbyPins.map(p => `Business Type: ${p.businessType}, Review: "${p.review}", Saturation Index: ${p.saturationIndex}`).join('\n');

        const prompt = `Analyze these community requests within a 1km radius and generate a "Neighborhood Needs Report". 
Requests:
${pinDescriptions}

Provide the output strictly as a valid JSON object matching this structure:
{
  "topRecommendation": "A short sentence describing the most needed business/renovation.",
  "communitySentiment": "A summary of why people want these things.",
  "marketGaps": ["gap 1 classification", "gap 2 classification"]
}`;

        let reportData = {};
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            reportData = JSON.parse(response.text || "{}");
        } catch (aiError) {
            console.error("Gemini Parse Error:", aiError);
            reportData = { error: "Failed to generate report from Gemini." };
        }

        return NextResponse.json({ report: reportData, pinsAnalyzed: nearbyPins.length });

    } catch (error: any) {
        console.error("Report API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
