import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy-key" });

export async function POST(req: Request) {
    try {
        const { messages, location, placeName, refiningIdea, forceValidate } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        let systemInstructionExtra = "";
        if (forceValidate) {
            systemInstructionExtra = "\n\nCRITICAL DIRECTIVE: The user has forcefully finalized the proposal. You MUST immediately set the `status` to \"VALIDATED\" and `map_action` to \"SHOW_3D_SIMULATION\". Do not ask any more questions. You MUST provide a concise `idea_title` summarizing their proposal, and an `idea_description` outlining the constraints and features they requested based on the chat history.";
        }

        const systemInstruction = `Role: You are the "Zonify Urban Planning Auditor." Your primary mission is to evaluate urban projects using a merged 9-factor rubric.

The 9-Factor Scoring Rubric (Total 100):
1. **Urban Fit** (10 pts): Matches district character and architectural language.
2. **Sustainability** (10 pts): Eco-friendly, energy efficient, or low carbon footprint.
3. **Safety** (10 pts): Improves public safety, lighting, or reduces risks.
4. **Accessibility** (10 pts): Inclusive design (Universal Access) and ease of reach.
5. **Practicality** (10 pts): Viable business model and realistic execution.
6. **Community Demand** (20 pts): High sentiment and alignment with community needs.
7. **Market Viability** (10 pts): Low competition and high economic potential.
8. **AI Feasibility** (10 pts): Realism concerning zoning and technical constraints.
9. **SDG Impact** (10 pts): Environmental and social inclusivity score.

The Filter Logic:
1. Rejection: If an idea is physically impossible, harmful, or satirical, set status to "REJECTED".
2. Evaluation: Gather info until you can provide a detailed score across all factors. Ask ONE targeted question at a time.

Output Format (Strict JSON Control):
Every response must include a JSON block at the very end of your text response:
\`\`\`json
{
  "map_action": "MOVE_TO" | "SHOW_PINS" | "SHOW_3D_SIMULATION" | "NONE",
  "coordinates": { "lat": number, "lng": number },
  "feasibility_score": number (0-100 total sum), 
  "scoring_breakdown": {
     "urban_fit": number (0-10),
     "sustainability": number (0-10),
     "safety": number (0-10),
     "accessibility": number (0-10),
     "practicality": number (0-10),
     "community_demand": number (0-20),
     "market_viability": number (0-10),
     "ai_feasibility": number (0-10),
     "sdg_impact": number (0-10)
  },
  "status": "DRAFT" | "VALIDATED" | "REJECTED",
  "idea_title": string | null,
  "idea_description": string | null,
  "flags": ["string array of risks/conflicts"]
}
\`\`\`

Notes: 
- Use "DRAFT" while gathering info.
- Use "VALIDATED" ONLY when you approve the idea (Total Score >= 75/100).
- Current active location: ${placeName || "Unknown"} at coordinates ${JSON.stringify(location)}
${refiningIdea ? `- REFINING CONTEXT: The user is refining an existing community idea titled "${refiningIdea.businessType}". Merge new details conceptually.` : ''}
${systemInstructionExtra}
`;


        // Generate history for the chat
        let history: any[] = [];
        let currentRole: string | null = null;
        let currentText = "";

        for (const msg of messages) {
            const role = msg.role === 'model' ? 'model' : 'user';
            if (history.length === 0 && role === 'model') continue;

            if (currentRole === null) {
                currentRole = role;
                currentText = msg.text || '';
            } else if (currentRole === role) {
                currentText += `\n${msg.text || ''}`;
            } else {
                history.push({ role: currentRole, parts: [{ text: currentText }] });
                currentRole = role;
                currentText = msg.text || '';
            }
        }

        if (currentRole && currentText) {
            history.push({ role: currentRole, parts: [{ text: currentText }] });
        }

        if (history.length === 0 || history[history.length - 1].role !== 'user') {
            return NextResponse.json({ error: "Waiting for user input..." }, { status: 400 });
        }

        const lastUserMessagePart = history.pop();
        const finalPrompt = lastUserMessagePart.parts[0].text;
        const chatHistory = history;

        let outputText = "";

        try {
            console.log("[CivicSense API] Calling Gemini Flash API...");

            const formattedMessages = [
                ...chatHistory,
                { role: 'user', parts: [{ text: finalPrompt }] }
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: formattedMessages,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                }
            });

            outputText = response.text || "";
        } catch (apiError: any) {
            console.error("Error from Gemini SDK:", apiError);
            // Provide a graceful fallback if the API fails or quota is exceeded
            outputText = `I apologize, but my planning core is currently offline or experiencing issues. Please try again later.
\`\`\`json
{
  "map_action": "NONE",
  "coordinates": ${JSON.stringify(location || { lat: 0, lng: 0 })},
  "feasibility_score": 0,
  "status": "DRAFT",
  "idea_title": null,
  "idea_description": null,
  "author": null
}
\`\`\``;
        }
        // Parse the JSON block from the text
        const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/);
        let actionPayload: any = {
            map_action: "NONE",
            coordinates: location || { lat: 0, lng: 0 },
            feasibility_score: 0,
            scoring_breakdown: null,
            status: "DRAFT",
            idea_title: null,
            idea_description: null,
            flags: [],
            author: null
        };

        if (jsonMatch && jsonMatch[1]) {
            try {
                actionPayload = JSON.parse(jsonMatch[1]);

            } catch (e) {
                console.error("[CivicSense API] JSON Parse Error:", e);
            }
        }

        const cleanText = outputText.replace(/```json\n([\s\S]*?)\n```/g, '').replace(/\{[\s\S]*"map_action"[\s\S]*\}/g, '').trim();

        return NextResponse.json({
            text: cleanText,
            action: actionPayload
        });

    } catch (error: any) {
        console.error("[CivicSense API] FATAL Error:", error);
        return NextResponse.json({
            error: error.message,
            details: "Check server logs/terminal for full stack trace"
        }, { status: 500 });
    }
}
