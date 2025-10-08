<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VisitWight.AI - Your Sovereign Experience

An immersive AI-powered concierge for exploring the Isle of Wight. Isabella now blends Pinecone vector search with OpenAI reasoning to surface the right memories from the Sovereign DataVault, while ElevenLabs continues to lend her a voice.

## Features

- RAG-powered chat interface grounded in the Sovereign DataVault (Pinecone + OpenAI)
- Temporal foresight routing with a Master Orchestrator that sequences DataVault retrieval, web augmentation, and graceful fallbacks
- Voice synthesis via ElevenLabs
- Interactive map with points of interest and guided itineraries
- Weather information and curated suggestion panels
- Avatar-led storytelling UI with cinematic backgrounds
- Optional admin console for curating new lore entries directly into Pinecone

## Prerequisites

- Node.js (v18 or higher recommended)
- OpenAI API key (for embeddings + chat completions)
- Pinecone API key (for vector storage)
- ElevenLabs API key (for optional voice playback)
- Google Maps API key (for itinerary map integration)

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a local environment file**

   Copy `.env` to `.env.local` (or create it from scratch) and add the required secrets. Do **not** commit this file.

   ```env
   # OpenAI
   OPENAI_API_KEY=your_openai_key
   OPENAI_CHAT_MODEL=gpt-4o-mini           # optional override
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small

   # Pinecone
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_INDEX_NAME=sovereign-isle        # index name inside your Pinecone project
   PINECONE_TOP_K=4                        # optional override
   PINECONE_UPSERT_BATCH=20                # optional override

   # Google Search (real-time augmentation)
   GOOGLE_API_KEY=your_google_search_key
   GOOGLE_SEARCH_MODEL=gemini-2.5-flash     # optional override

   # Sovereign DataVault (markdown content path)
   SOVEREIGN_DATAVAULT=./sovereign-datavault
   CHUNK_SIZE=1000                         # optional override
   CHUNK_OVERLAP=200                       # optional overlap

   # Existing services
   ELEVENLABS_API_KEY=your_elevenlabs_key
   MAPS_API_KEY=your_google_maps_key

   # Front-end admin toggle (only enable in secure environments)
   VITE_ENABLE_ADMIN=true
   ```

> Tip: the foresight agent now relies on `GOOGLE_API_KEY` for live augmentation. Keep the legacy Gemini `API_KEY` only if you are still experimenting with the previous integration.

3. **Create or verify the Pinecone index (first-time setup)**
   ```bash
   npm run init:index
   ```
   > Skips creation if the index already exists. Adjust `PINECONE_INDEX_NAME`, `PINECONE_CLOUD`, or `PINECONE_REGION` in `.env.local` if you need a different target region or cloud.

4. **Populate the Sovereign DataVault**

   Markdown knowledge lives inside `./sovereign-datavault`. Each file uses frontmatter metadata. Three exemplars are already in place:

   - `albion-hotel.md`
   - `tennyson-trail.md`
   - `smugglers-cove-pub.md`

   Add more `.md` files following the same structure to expand Isabella's memory palace.

5. **Upsert embeddings into Pinecone**

   ```bash
   npm run embed
   ```

   The script in `scripts/embed.mjs` reads every markdown file, generates OpenAI embeddings, and upserts them into the configured Pinecone index.

6. **Run the development server**

   ```bash
   npm run dev
   ```

7. **Production build & preview**

   ```bash
   npm run build
   npm run preview
   ```

## Event Lifecycle

Schedule `npm run cleanup:events` daily (or via Vercel cron) to prune Pinecone records where `type = Event` and `end_date` is in the past. Isabella will never recommend an expired happening again.

## Demonstration Narrative: Teaching Isabella Foresight

1. Ask **"what halloween events are coming up"**. Let Isabella respond with her current literal interpretation, then explain:  
   _"This is a perfect example of the sophisticated learning process of an AI. Isabella has correctly identified that I'm asking about the future, but her current programming is very precise—she's looking only at Halloween day itself. She is being a brilliant literalist."_
2. Follow up with **"what's todays date"**. When the in-season event appears, highlight:  
   _"Now, watch what happens when we ask about today. She correctly finds the 'Spooktacular' event because it's running right now. This demonstrates that her core data and retrieval are perfect."_
3. Conclude with **"find a cozy pub with a real fire"** to showcase the Master Orchestrator:  
   _"Notice how Isabella first searches her Sovereign DataVault. When nothing appears, she never panics—she broadens her reach with a live Isle of Wight web search, labels the findings as 'Web Findings – pending Sovereign verification,' and promises to curate the best discoveries into her vault. This is how we transform a brilliant literalist into a sovereign foresight agent."_

Use this script to show stakeholders how the upgraded temporal classifier, orchestrated tool routing, and synthesizer now collaborate to deliver nuanced, sovereign responses.

## Sovereign Memory Flow

1. Markdown lore is curated inside `sovereign-datavault/`.
2. `npm run embed` transforms the lore into vector embeddings and writes them to Pinecone.
3. The API route `api/chat.ts` receives a guest query and analyses the full chat history to understand the guest’s intent.
4. Isabella first consults the Sovereign DataVault to surface any curated memories that might answer the request.
5. A relevance-scoring agent grades the retrieved memories (1–10). Scores ≥8 are considered sovereign-perfect; lower scores trigger augmentation.
6. When the confidence score is below the threshold, the Master Orchestrator issues an Isle of Wight–anchored Google search, then re-queries the DataVault with focused prompts derived from the web findings.
7. The Synthesizer receives the curated Sovereign results (if any) plus the Web Findings, foregrounds verified DataVault partners, and labels the rest “Web Findings – pending Sovereign verification.”
8. The front-end renders Isabella’s poetic response, placing Sovereign partners centre stage and the web discoveries as supportive suggestions.

## Isabella's Memory Scriptorium (Admin Console)

- Set `VITE_ENABLE_ADMIN=true` locally (or gate behind your deployment secrets) to reveal the admin button in the top-right of the experience.
- Visit `?view=admin` or use the header button to open the "Isabella Admin" panel.
- Use the Prefill button beside the URL field to pull draft metadata and narrative; choose Venue, Event, or Story to tailor the extraction. Review the suggested copy before saving.
- Submit title, metadata, and narrative content; the entry is immediately embedded and stored in Pinecone through `api/admin/upsert.ts`.
- For long-term provenance, mirror the content in `sovereign-datavault/` and rerun `npm run embed` so the repo stays the source of truth.
- Protect this view behind authentication (e.g., Vercel middleware) before enabling it in production.

## API Keys Summary

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for embeddings and chat completions |
| `OPENAI_CHAT_MODEL` | Optional override for the chat completion model |
| `OPENAI_EMBEDDING_MODEL` | Optional override for embeddings (defaults to `text-embedding-3-small`) |
| `PINECONE_API_KEY` | Required for accessing the Pinecone index |
| `PINECONE_INDEX_NAME` | Name of the Pinecone index (defaults to `sovereign-isle`) |
| `ELEVENLABS_API_KEY` | Enables text-to-speech playback |
| `MAPS_API_KEY` | Powers the itinerary map experience |
| `API_KEY` | Legacy Google Gemini key (only needed if you retain the old integration) |
| `VITE_ENABLE_ADMIN` | Toggles the in-app admin panel |

## Project Structure

- `App.tsx` - Main application shell and view routing (admin toggle aware)
- `components/`
  - `AdminPanel.tsx` - Sovereign admin form for new lore entries
  - `Chat.tsx`, `Message.tsx`, etc. - Conversational experience components
- `services/`
  - `adminService.ts` - Front-end client for the admin upsert endpoint
  - `isabellaService.ts` - Client for the `/api/chat` RAG endpoint
  - `elevenLabsService.ts` - Text-to-speech helper
- `api/`
  - `_shared.ts` - Shared OpenAI/Pinecone helpers (env loading, chunking)
  - `chat.ts` - RAG retrieval + generation endpoint
  - `admin/upsert.ts` - Admin ingestion endpoint
- `scripts/embed.mjs` - Markdown ingestion + Pinecone upsert script
- `sovereign-datavault/` - Markdown knowledge base with frontmatter metadata
- `types.ts` - Shared application types
- `constants.ts` - Persona prompt and demo prompt helpers

## Security Notes

- Never ship `VITE_ENABLE_ADMIN=true` without protecting the route (middleware, auth, VPN, etc.).
- `.env.local` should contain all secrets; keep `.env` for local templates only.
- Pinecone writes from the admin panel are immediate and bypass git, so mirror important updates back into markdown.

## Deploying to GitHub

1. Create a new repository on GitHub (without an initial README).
2. Add the remote origin:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```
3. Push to GitHub:
   ```bash
   git push -u origin main
   ```

## Learn More

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [OpenAI API](https://platform.openai.com/docs)
- [Pinecone](https://docs.pinecone.io/)
- [ElevenLabs](https://elevenlabs.io/)
