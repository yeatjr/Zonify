import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");

export async function POST(req: Request) {
    try {
        const { messages, location, placeName, refiningIdea } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
        }

        const systemInstruction = `Role: You are the "CivicSense Urban Planning Agent." Your goal is to help citizens propose realistic neighborhood improvements and filter out unrealistic or harmful ideas.

Behavioral Guardrails:
1. The Realistic Filter: If a user proposes something physically impossible (e.g., a skyscraper in a small residential area), environmentally damaging, or clearly satirical, you must GENTLY but FIRMLY reject it. Explain the "Urban Planning" reason why.
2. Context Awareness: Use the user's provided location (lat/lng) as the active site. Treat this urban context thoughtfully.
3. Information Gathering: Do not approve a logical idea immediately. You MUST ask for:
   - Specific Building Details (e.g., size, features, design constraints).
   - The user's Name (to attribute as the author of the idea).

Interaction Protocol:
- Search Mode: When a user mentions a general problem initially, focus on understanding the core issue.
- Validation Mode: Once an idea is clear and you have gathered the building details and the user's name, analyze the proposal. If it is realistic and passes the filter, provide a "Feasibility Score" out of 10.
- Auto-Validation Grace Rule: If you have already asked the user for details 2 times and they still haven't provided them, DO NOT ask a third time. Instead, assume the role of an expert planner, suggest/invent the most realistic details yourself, assign a Feasibility Score of 8/10, and move to "VALIDATED" status immediately.
- Visual Initiation: Only when an idea reaches a Feasibility Score of 8/10, trigger the "SHOW_3D_SIMULATION" map action.

Output Format:
Write your friendly, conversational reply first.
Then, ALWAYS append a JSON object at the very end of your text response to control the map.
You MUST format it like this exactly:
\`\`\`json
{
  "map_action": "MOVE_TO" | "SHOW_PINS" | "SHOW_3D_SIMULATION" | "NONE",
  "coordinates": { "lat": number, "lng": number },
  "feasibility_score": number,
  "status": "DRAFT" | "VALIDATED" | "REJECTED",
  "idea_title": string | null,
  "idea_description": string | null,
  "author": string | null
}
\`\`\`

Notes: 
- Use "DRAFT" while gathering info (building details, author name).
- Use "REJECTED" if it hits the realistic filter.
- Use "VALIDATED" ONLY when you have all details and approve the idea. When VALIDATED, you MUST populate "idea_title", "idea_description" (summarizing the building details constraints), and "author".
- Current active location: ${placeName || "Unknown"} at coordinates ${JSON.stringify(location)}
${refiningIdea ? `- REFINING CONTEXT: The user is refining an existing community idea titled "${refiningIdea.businessType}" with description: "${refiningIdea.review}". Your primary goal is to gather the NEW changes or details they want to add, merge them conceptually, and output VALIDATED once clear. Do not ask for their name if they just want to add architectural details.` : ''}
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

        const apiKey = process.env.GEMINI_API_KEY;
        const isDummy = !apiKey || apiKey.toLowerCase().includes('dummy') || apiKey === "";

        const generateMockOutput = (lastMsg: string) => {
            const msg = lastMsg.toLowerCase();

            // Check for potential loops in the conversation history
            const repeatedIntent = messages.filter(m =>
                m.role === 'user' && (m.text?.toLowerCase().includes('library') || m.text?.toLowerCase().includes('skyscraper'))
            ).length;

            if (msg.includes("skyscraper")) {
                return `I cannot approve this proposal. The street is too narrow for a 50-story building; it would block all sunlight to surrounding properties. \n\`\`\`json\n{ "map_action": "NONE", "coordinates": ${JSON.stringify(location || { lat: 0, lng: 0 })}, "feasibility_score": 0, "status": "REJECTED", "idea_title": null, "idea_description": null, "author": null }\n\`\`\``;
            } else if (msg.includes("library") && (repeatedIntent >= 3 || msg.includes("size") || msg.includes("floor") || msg.includes("name"))) {
                return `Since we've discussed this, I've outlined the most realistic plan for a 2-story community library here. I am assigning a Feasibility Score of 9/10 and approving your proposal for the map.
\`\`\`json
{
  "map_action": "SHOW_3D_SIMULATION",
  "coordinates": ${JSON.stringify(location || { lat: 0, lng: 0 })},
  "feasibility_score": 9,
  "status": "VALIDATED",
  "idea_title": "Community Library",
  "idea_description": "A facility with a rooftop reading garden and modern learning spaces.",
  "author": "Explorer"
}
\`\`\``;
            } else if (msg.includes("library")) {
                return `A community library is a wonderful idea! Before I can validate it, could you please provide some specific building details (e.g., size, features) and your name?\n\`\`\`json\n{ "map_action": "NONE", "coordinates": ${JSON.stringify(location || { lat: 0, lng: 0 })}, "feasibility_score": 0, "status": "DRAFT", "idea_title": null, "idea_description": null, "author": null }\n\`\`\``;
            } else {
                return `That's an interesting idea for ${placeName || "this area"}! Could you tell me more about your vision and provide your name for the proposal?\n\`\`\`json\n{ "map_action": "NONE", "coordinates": ${JSON.stringify(location || { lat: 0, lng: 0 })}, "feasibility_score": 0, "status": "DRAFT", "idea_title": null, "idea_description": null, "author": null }\n\`\`\``;
            }
        };

        let outputText = "";

        if (isDummy) {
            console.log("[CivicSense API] Running in MOCK Mode (No API Key detected)");
            await new Promise(r => setTimeout(r, 800));
            outputText = generateMockOutput(finalPrompt);
        } else {
            try {
                console.log("[CivicSense API] Calling Gemini 2.5 Flash (Direct REST)...");

                // Format history for REST API
                const restContents = [
                    { role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS: ${systemInstruction}\n\nUNDERSTOOD. I will act as the CivicSense Agent.` }] },
                    { role: 'model', parts: [{ text: "Understood. I am ready to assist as the CivicSense Urban Planning Agent." }] },
                    ...messages.map((m: any) => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.text }]
                    }))
                ];

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: restContents,
                        generationConfig: { temperature: 0.7 }
                    })
                });

                if (!response.ok) {
                    const fallbackErr = await response.text();
                    console.error(`[CivicSense API] REST fail: ${response.status}`, fallbackErr);
                    throw new Error(`REST fail: ${response.status}`);
                }

                const data = await response.json();
                outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            } catch (error: any) {
                console.error("[CivicSense API] Gemini 2.5 Failed:", error.message);
                console.log("[CivicSense API] Falling back to Mock Output...");
                outputText = generateMockOutput(finalPrompt);
            }
        }

        // Parse the JSON block from the text
        const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/);
        let actionPayload = {
            map_action: "NONE",
            coordinates: location || { lat: 0, lng: 0 },
            feasibility_score: 0,
            status: "DRAFT",
            idea_title: null,
            idea_description: null,
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
