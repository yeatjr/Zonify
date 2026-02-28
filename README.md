**Zonify**
**1.0 Technical Architecture**

### 1. Interaction Layer (Frontend)

* Built on **Google Maps Platform**
* Integrates:

  * **Google Maps JavaScript API**
  * **Google Places API**
  * **Google Static Maps API**
* Provides a map-based user interface for location selection
* Allows users to:

  * Select real-world locations
  * View Street View imagery (when available)
  * Submit ideas through a guided input form
* Designed for accessibility and usability
* Suitable for non-technical users unfamiliar with formal planning terminology

---

### 2. Intelligence Layer (AI)

* Powered by **Google Gemini**
* Transforms unstructured user input into structured urban planning components
* Performs:

  * Requirement extraction
  * Contextual interpretation
  * Feasibility triage
  * Structured template generation
* Functions as a reasoning and structuring assistant (not a replacement for professional planners)

**AI Components:**

* **AI (Chat)**

  * Uses **Gemini 2.5 Flash**
  * Implements Urban Planning Auditor logic
  * Handles evaluation, scoring, and analytical reasoning

* **AI (Vision)**

  * Uses **Gemini 2.0 Flash Experimental Image Generation**
  * Generates architectural simulations
  * Produces visual concept renderings

* Ensures accurate spatial referencing through integrated Google Maps services

---

### 3. Data and Collaboration Layer

* Supported by **Firebase** services
* **Cloud Firestore**:

  * Stores structured proposal records
  * Maintains version history
  * Supports real-time map pin storage
* **Firebase Authentication**:

  * Manages user identity
  * Handles role differentiation
  * Provides secure sign-in
* Security rules restrict editing access to authorized users
* Ensures traceability, authorship recognition, and data integrity

**Data Persistence Strategy:**

* Validated “pitched” ideas use Base64 data URLs (no Firebase Storage or local file paths)
* Base64 strings stored directly in:

  * Pins collection
  * Comments collection (Firestore)
* Proposal data and visual pitch saved together in a single database write

**PDF Report Handling:**

* “Deep Analysis” PDF reports are not stored as Base64
* When downloaded, reports are saved as physical files on the server’s local filesystem
* Separate handling from Firestore-based pitch storage


Together, these layers allow community ideas to move from informal thoughts to structured, collaborative proposal drafts.

## 2. Implementation Details

---

### 2.1 AI Chat Validation & Deep Location Analysis

* Architecture follows a Model–View–API pattern
* Core reasoning logic delegated to **Google Gemini** via specialized API routes
* “Urban Planning Auditor” implemented as a stateful chat session using **Gemini 2.0 Flash**
* Guided by a 9-Factor Scoring Rubric:

  * Urban Fit
  * Sustainability
  * Safety
  * Accessibility
  * Practicality
  * Community Demand
  * Market Viability
  * AI Feasibility
  * SDG Impact
* Proposal classification logic:

  * **DRAFT** – Information gathering
  * **REJECTED** – Impossible or harmful
  * **VALIDATED** – Score ≥ 75/100
* JSON-in-text response strategy:

  * Natural language explanation for users
  * Hidden JSON block for structured parsing
* “Adaptive Resilience Profile” (Deep Scan):

  * Performs 10km Nearby Search using **Google Places API**
  * Retrieves existing community pins from **Firebase** Firestore
  * Generates Three Pillars Analysis:

    * Planning Feasibility
    * AI Site Audit
    * Suitable Facilities
  * Enforces strict JSON schema with:

    * overallScore (0–100)
    * subMetrics for dashboard visualization

---

### 2.2 AI Vision Generation & Map Interaction Engine

* AI Vision module: `/api/vision/generate`
* Uses **Gemini 2.0 Flash Experimental Image Generation**
* Integrates:

  * Satellite imagery
  * Street View imagery
  * User idea text
* Utilizes internal library of:

  * Place Scene Maps
  * Categorized Backgrounds (Business, Civic, Nature, etc.)
* Multi-modal context injection:

  * User text + Base64 Street View image
  * Base64 satellite image
* Output handling:

  * Generated image returned as Base64 string
  * Compressed and stored in Firestore
  * Saved in same transaction as map pin
* Map engine built on **Google Maps Platform**
* Interactive features:

  * Click/right-click triggers `google.maps.Geocoder` lookup
  * Detects nearest business or address
  * Enhances AI contextual awareness
* Deep analysis visualization:

  * Pulsating Google Maps Circle
  * Represents 10km scan radius

---

### 2.3 AI Processing Pipeline & Structured Proposal Rendering

* User selects site via Google Maps
* System captures:

  * Latitude
  * Longitude
* If available:

  * Street View imagery displayed for spatial grounding
* If unavailable:

  * Falls back to map-only display
* Reverse geocoding converts coordinates to readable address
* Data sent to backend includes:

  * Location coordinates
  * Facility category
  * Text description (voice converted to text if used)
  * Optional image
* Controlled system prompt enforces structured JSON output
* Objectives:

  * Ensure consistency
  * Reduce hallucination risk
  * Maintain advisory scope (no regulatory approval implied)
* Gemini returns structured fields such as:

  * Target users
  * Key needs
  * Risks
  * Validation requirements
  * Suggested modules
  * Conceptual budget range
  * Measurable success indicators
* Output parsing and storage:

  * Stored in Firestore
  * Rendered as editable frontend proposal template
* Users can:

  * Review
  * Refine
  * Publish proposals

---

### 2.4 Reporting Engine, Data Flow & Collaboration Model

* Custom PDF engine built using **jsPDF**
* Vector-based construction (not screenshot-based):

  * Rectangles
  * Pie chart triangles
  * Progress bars
* PDF workflow:

  * Generated in browser
  * Base64 data sent to backend
  * Converted into Buffer
  * Saved to server’s local filesystem
* File path linked to user’s `analysisHistory` in Firestore
* Real-time updates via Firebase SDK `onSnapshot` listeners

  * New “pitches” appear instantly on all users’ maps
* Utility helpers:

  * Convert Base64 ↔ Data URI
  * Ensure consistent image rendering
* Collaboration model:

  * Each proposal has Primary Author
  * Optional Contributors
  * All edits logged and versioned in Firestore
* Prototype simplification:

  * No complex approval workflows
  * Focus on transparency and revision tracking
  * Lightweight but demonstrates interdisciplinary collaboration capability

## 3.1 Ensuring Structured AI Output Consistency & Geographic Data Accuracy

**Structured AI Output Consistency**

* Challenge: Inconsistent JSON formatting from **Google Gemini** during early testing
* Minor prompt variations caused parsing and rendering issues
* Solutions implemented:

  * Standardized system prompts across API routes
  * Clearly defined strict output schema with required fields
  * Added backend validation checks before saving AI responses
* Outcome:

  * Improved reliability
  * Increased reproducibility
  * Enhanced structured data integrity

**Geographic Data Accuracy**

* Platform built on **Google Maps Platform**
* Challenge: Clicking “blank” map areas may not return place names
* Implemented hierarchical fallback strategy:

  * Place Details
  * Geocoder
  * Nearby Search
  * Raw Coordinates
* Ensures AI always receives human-readable contextual data
* Dynamic radius filtering:

  * Fetches community pins within 10km
  * Uses Haversine formula (`getDistanceFromLatLonInKm`)
  * Maintains performance during animated scan pulse

---

## 3.2 Defining Advisory Scope & Limiting AI Authority

* Challenge: Risk of users interpreting AI output as professional or regulatory approval
* Platform deals with urban planning concepts (high perceived authority risk)
* Mitigation strategies:

  * Carefully engineered prompt instructions
  * Restricted AI tone and scope
  * Explicit labeling of outputs as advisory and preliminary
* Importance:

  * Ethical responsibility
  * Prevents overstatement of AI capability
  * Reinforces system role as decision-support tool, not professional certification system

## 4. Future Roadmap

---

### 4.1 Enhanced Spatial Visualization & Immersive Experience (Short-Term)

* Introduce lightweight layout editor

  * Users can arrange benches, lighting, pathways, greenery
  * Improves spatial communication without full CAD systems
* Transition from static Base64 images to live 3D viewport

  * Integration with **Three.js** or **Spline**
  * First-person “digital twin” walkthrough experience
* AR (Augmented Reality) mobile companion feature

  * Overlay AI-generated vision onto real-world site
  * View through phone camera at actual coordinates
* Dynamic lighting & weather synchronization

  * Align 3D rendering with real-time time-of-day
  * Reflect live environmental conditions (e.g., sunset, rain)

---

### 4.2 Community Prioritization & Participatory Governance (Mid-Term)

* Introduce voting and endorsement mechanisms

  * Rank proposals based on community interest
  * Generate measurable demand signals
* “Fund this Vision” feature

  * Connect validated proposals to crowdfunding/micro-financing platforms
* Civic Reputation system

  * Replace agreementCount with structured “Civic Reputation” score
  * High-quality contributors gain weighted influence
* Real-time collaborative “Squad Mode”

  * Multiple users co-design within shared AI Auditor session
  * Supports large-scale projects (e.g., community centers)

---

### 4.3 Institutional Dashboard & Analytics Integration

* Develop institutional review dashboard

  * Filter proposals by location, category, validation status, engagement level
  * Improve adoption pathways for sponsors and policymakers
* Integrate performance analytics

  * Measure structuring efficiency
  * Track collaboration rate
  * Monitor proposal evolution over time
* Align impact tracking with:

  * SDG 9 (Industry, Innovation and Infrastructure)
  * SDG 11 (Sustainable Cities and Communities)

---

### 4.4 Deep Data Integration & Policy Bridge (Long-Term)

* Integrate real-time urban IoT sensor data

  * Traffic congestion
  * Air quality
  * Noise levels
* Dynamically update Adaptive Resilience Score

  * Example: Higher sustainability weighting in polluted zones
* Zoning Law API integration

  * Automated permit and compliance checks
  * Flag height, density, or setback violations
* Agentic procurement support

  * Draft Requests for Proposal (RFPs)
  * Identify relevant local contractors and suppliers
  * Match materials suggested in AI vision (e.g., solar glass, permeable pavement)

---

### 4.5 Global Adaptation & Localization Engine (Expansion Phase)

* Expand architectural recognition logic

  * Detect regional styles (Mediterranean, Brutalist, Colonial, Vernacular, etc.)
  * Adjust design outputs based on detected country/location
* Full multilingual planning support

  * Users pitch ideas in native language
  * AI evaluates proposals against global sustainability benchmarks
* Maintain consistent evaluation standards across regions
* Enable scalable international deployment


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
