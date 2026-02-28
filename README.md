# Zonify 🏙️

**Zonify** is an AI-powered urban planning collaborator that bridges the gap between community ideas and formal development. By combining the **Google Maps Platform** with **Google Gemini AI**, it transforms unstructured user input into professional-grade, structured architectural proposals.

---

## 1. Technical Architecture

Zonify is built on a modular three-tier architecture designed for spatial accuracy, reasoning depth, and real-time collaboration.

### 1.1 Interaction Layer (Frontend)
The user-facing map interface designed for accessibility by non-technical users who may not be familiar with planning terminology.
* **Platform:** Google Maps Platform
* **APIs:** Google Maps JavaScript, Google Places, and Google Static Maps.
* User can select a real-world location, view contextual Street View imagery, and submit their idea through a guided input form. 

### 1.2 Intelligence Layer (AI)
The reasoning and structuring engine powered by **Google Gemini** and is responsible for transforming unstructured user input into structured urban planning components. The AI is not intended to replace professional planners or engineers; instead, it functions as a structuring and reasoning assistant that enhances clarity and supports early-stage proposal articulation.

* **AI (Chat):** Powered by **Gemini 2.5 Flash**. Implements the *Urban Planning Auditor* logic for evaluation, scoring, and analytical reasoning.
* **AI (Vision):** Powered by **Gemini 2.0 Flash Experimental**. Generates architectural simulations and visual concept renderings.
* **Functions:** Requirement extraction, contextual interpretation, feasibility triage, and structured template generation.

### 1.3 Data and Collaboration Layer
- Supported by **Firebase** services
* Cloud Firestore - Stores structured proposal records, maintains version history and supports real-time map pin storage
* Firebase Authentication - Manages user identity, handles role differentiation and provides secure sign-in
- Security rules restrict editing access to authorized users to ensures traceability, authorship recognition, and data integrity

**Data Persistence Strategy**
*  Validated “pitched” ideas use **Base64 data URLs**
*  Base64 strings stored directly in **Pins collection** and **Comments collection** in Firestore
* Proposal data and visual pitch saved together in a single database write

**PDF Report Handling**
* “Deep Analysis” PDF reports are not stored as Base64
* When downloaded, reports are saved as physical files on the server’s local filesystem
* Separate handling from Firestore-based pitch storage

Together, these layers allow community ideas to move from informal thoughts to structured, collaborative proposal drafts.

---

## 2. Implementation Details

### 2.1 AI Chat Validation & Deep Location Analysis
The architecture follows a **Model–View–API** pattern. The system utilizes a stateful chat session to evaluate proposals against a **9-Factor Scoring Rubric**:

| Factor | Description |
| :--- | :--- |
| **Urban Fit** | Alignment with neighborhood context. |
| **Sustainability** | Environmental impact and resilience. |
| **Safety** | Public safety and hazard mitigation. |
| **Accessibility** | Universal design and transport links. |
| **Practicality** | Construction and maintenance feasibility. |
| **Community Demand** | Local need and social impact. |
| **Market Viability** | Economic feasibility. |
| **AI Feasibility** | Technical simulation viability. |
| **SDG Impact** | Alignment with UN Sustainable Development Goals. |

**Classification Logic:**
* `DRAFT`: Information gathering.
* `REJECTED`: Impossible or harmful.
* `VALIDATED`: Score $\ge 75/100$.

### 2.2 Adaptive Resilience Profile (Deep Scan)
Performs a 10km search using the **Google Places API** and existing pins in **Firestore**. It calculates distances using the Haversine formula:

$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\phi_2 - \phi_1}{2}\right) + \cos(\phi_1) \cos(\phi_2) \sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)$$

Then, it generates Three Pillars Analysis which is:
* Planning Feasibility
* AI Site Audit
* Suitable Facilities

### 2.3 AI Vision & Map Engine
Uses Gemini 2.0 Flash Experimental Image Generation by integrating:
* Satellite imagery
* Street View imagery
* User idea text
Then Utilizes internal library of  Place Scene Maps and Categorized Backgrounds (Business, Civic, Nature, etc.).

---

## 3. Challenges & Mitigations

### 3.1 Output Consistency & Data Accuracy
* **Challenge:** Inconsistent JSON formatting from Gemini during early testing.
* **Solution:** Standardized system prompts, strict output schemas, and backend validation checks prior to saving.
* **Accuracy:** Implemented a hierarchical fallback strategy for geographic data: **Place Details → Geocoder → Nearby Search → Raw Coordinates**.

### 3.2 Defining Advisory Scope
* **Challenge:** Risk of users interpreting AI output as official regulatory approval.
* **Mitigation:** Engineered instructions to restrict AI tone, explicit labeling of all outputs as "advisory and preliminary," and reinforcing the system's role as a decision-support tool.

---

## 4. Future Roadmap

### 🚀 4.1 Immersive Experience (Short-Term)
* **Layout Editor:** Arrangement of benches, lighting, and greenery.
* **3D Viewport:** Integration with **Three.js** or **Spline** for "digital twin" walkthroughs.
* **AR Mobile:** Overlaying AI visions onto real-world sites via phone cameras.

### 🤝 4.2 Participatory Governance (Mid-Term)
* **Voting Mechanisms:** Ranking proposals based on community demand signals.
* **Crowdfunding:** Connecting validated visions to micro-financing platforms.
* **Squad Mode:** Real-time collaborative co-design sessions.

### 📊 4.3 Institutional Analytics (Long-Term)
* **Institutional Dashboards:** Filtering proposals for policymakers and sponsors.
* **IoT Integration:** Real-time data feeds for traffic, air quality, and noise.
* **Zoning Law API:** Automated compliance checks for height, density, and setback violations.

### 🌍 4.4 Global Expansion
* **Architectural Recognition:** Detecting regional styles (Mediterranean, Brutalist, etc.).
* **Multilingual Support:** Pitching ideas in native languages against global sustainability benchmarks.

## Getting Started
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
