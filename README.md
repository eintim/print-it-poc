# Print it

**From a rough idea to a 3D model you can spin — and a path to a real print.**  
Print it is a web app for people who want personalized physical objects without CAD: describe (or sketch) what you want, refine it in a back-and-forth with AI, preview the result in the browser, then request a print order.

---

## Why it exists

- **Personalization** — People want unique things; the default path is still generic mass-produced goods.
- **Friction** — Custom 3D usually means unfamiliar tools, file formats, and handoffs between apps.
- **Skills gap** — Turning a sketch into something printable often needs CAD expertise.

Print it keeps the pipeline in one place: **refine → generate → preview → order**, with no CAD required.

---

## What you can do

| Area | What it does |
|------|----------------|
| **Studio (`/create`)** | Chat-style refinement of your prompt (and optional sketch uploads), then kick off 3D generation. |
| **3D preview** | Inspect generated models in the browser (GLB), with downloads when available. |
| **Ideas** | Signed-in users keep refinement sessions and generated models synced. |
| **Orders** | Submit print requests (size, shipping details) tied to a generated model. |
| **Showcase** | Public examples for visitors who are not signed in. |
| **Admin** | Restricted view of generated models (emails allowlisted via `ADMIN_EMAILS`). |

---

## Stack

- **[Next.js](https://nextjs.org/)** — App router, UI, API routes for generation/refinement orchestration  
- **[Convex](https://convex.dev/)** — Realtime data, auth tables, sessions, jobs, models, orders  
- **[Convex Auth](https://labs.convex.dev/auth)** — Sign-in and user identity  
- **[OpenAI-compatible APIs](https://platform.openai.com/docs/api-reference/chat)** — Prompt refinement (chat completions)  
- **[Meshy](https://www.meshy.ai/)** — Text / image → 3D (preview + refine pipeline)  
- **[Three.js](https://threejs.org/)** — In-browser model viewing  
- **Tailwind CSS** — Styling  

---

## Pitch deck

A standalone slide deck lives at [`pitch-print-it.html`](./pitch-print-it.html) (Reveal.js). Open it in a browser for problem / solution / business / GTM context.

---

## Local development

### Prerequisites

- Node.js (LTS recommended)  
- A [Convex](https://dashboard.convex.dev/) project  
- API keys: OpenAI-compatible provider for refinement, Meshy for 3D (see env vars below)

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in .env.local (Convex URLs, keys — see comments in .env.example)
npm run dev
```

`npm run dev` runs the Next.js app and Convex dev together. The `predev` script wires Convex and a one-time Convex Auth setup helper when appropriate.

### Environment variables

Copy [`.env.example`](./.env.example) → `.env.local` and set at least:

- **Convex** — `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_SITE_URL`  
- **App URL** — `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)  
- **Refinement** — `OPENAI_API_KEY` (and optionally `OPENAI_BASE_URL`, `OPENAI_MODEL`)  
- **3D generation** — `MESHY_API_KEY` (and optionally `MESHY_*` overrides; `MESHY_USE_MOCK=true` for local testing without Meshy)

For production-style Convex deploys, set the same values in the Convex dashboard where noted in `.env.example` (e.g. `ADMIN_EMAILS`).

### Other scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build |
| `npm start` | Run production server (after `build`) |
| `npm run lint` | ESLint |
| `npm run showcase:fetch-meshy` | Helper script for showcase assets |

---

## Learn more

- [Convex docs](https://docs.convex.dev/)  
- [Convex Auth](https://labs.convex.dev/auth)  
- [Next.js docs](https://nextjs.org/docs)  

---

*Private project — see `package.json` for the package name and scripts.*
