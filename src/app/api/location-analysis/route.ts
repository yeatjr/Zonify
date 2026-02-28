import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key" });

export async function POST(req: Request) {
    try {
        const { lat, lng, nearbyPins = [] } = await req.json();

        if (!lat || !lng) {
            return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        let contextData = "";

        // First, detect surroundings in 10km radius (approx 10000m)
        // Here we can fetch some major landmarks or just pass the coordinates to AI.
        // We will fetch nearby places to give the AI some real context.
        try {
            const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=point_of_interest&key=${apiKey}`;
            const placesRes = await fetch(placesUrl);
            const placesData = await placesRes.json();

            if (placesData.results) {
                const placesNames = placesData.results.slice(0, 20).map((p: any) => `${p.name} (${p.types?.join(', ') || 'place'})`);
                contextData = `Places found within 10km: ${placesNames.join("; ")}`;
            }
        } catch (e) {
            console.error("Error fetching places context:", e);
        }

        let communityContext = "";
        if (nearbyPins.length > 0) {
            const pinSummaries = nearbyPins.map((p: any) => `- A ${p.businessType} idea: "${p.review}"`).join('\n');
            communityContext = `There are ACTUAL community members who have proposed ideas within 10km of this spot:\n${pinSummaries}\nUse this real community data to heavily influence the "User Suggestion" section.`;
        } else {
            communityContext = `No community ideas found nearby yet. You must set "User Suggestion" to null because there are no actual user suggestions tagged.`;
        }

        const prompt = `You are the Zonify AI Architect. Analyze the geographic location at Latitude: ${lat}, Longitude: ${lng}.
Context of surroundings (10km radius): ${contextData || "Assume a mix of urban/suburban layout."}
${communityContext}

Provide a deep location analysis separated exactly into 4 parts, plus a quantifiable global scores array for graph visualization.
1. "Planning Feasibility": Analyze the feasibility of developing this area (zoning, economic potential, community value).
2. "AI Site Audit": A detailed description of the detected surroundings, buildings, and environment within a 10km radius.
3. "Suitable Facilities": Analyze what equipment, buildings, or infrastructure (like a gym room, football court, community center, etc.) would be highly suitable for this specific place and demographics.
Return the response STRICTLY as a JSON object with keys:
"overallScore", "planningFeasibility", "aiSiteAudit", "suitableFacilities", "userSuggestion", and "scores" (array).
The "overallScore" must be a number from 0-100 representing the "Adaptive Resilience Score" of this area.
CRITICAL: The "overallScore" must be calculated ONLY based on the first 3 pillars (Planning, Site Audit, Facilities). Do NOT include "userSuggestion" (Priority Intervention) in this mathematical average; it serves as an independent validation.

EACH of the first 3 section keys (planningFeasibility, aiSiteAudit, suitableFacilities) MUST be an object containing:
- "summary": A concise (1-2 sentence) executive summary of the innovation potential in this category.
- "adaptiveResilienceScore": A score from 0-100 for this specific category's innovation contribution.
- "narrative": String containing the Markdown-formatted detailed text analysis.
- "subMetrics": Array of exactly 3 objects mapping specific granular factors to a score. Use precise terminology (e.g., "Zoning Compatibility", "Market Catalyst Potential", "Social Cohesion Impact").

"userSuggestion": If present, it MUST follow the SAME object structure as the first 3 sections (summary, adaptiveResilienceScore, narrative, subMetrics). Change "Community Sentiment" heading in narrative to "Public Demand Analysis".
The "scores" array should contain at least 5 relevant metrics from the 9 core pillars.

Do not include markdown blocks or any other text outside the JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
                responseMimeType: 'application/json'
            }
        });

        let outputText = response.text || "{}";

        try {
            const parsed = JSON.parse(outputText);
            return NextResponse.json(parsed);
        } catch (e) {
            // Strip markdown if AI ignored responseMimeType
            const cleanText = outputText.replace(/```json\n([\s\S]*?)\n```/g, '$1').trim();
            return NextResponse.json(JSON.parse(cleanText));
        }

    } catch (error: any) {
        console.error("Location Analysis API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
