**Zonify – Technical Architecture**

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



How to get Start
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

