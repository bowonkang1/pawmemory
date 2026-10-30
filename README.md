# PawMemory

PawMemory is a personal memory for a pet. Small moments are kept over time, connected into one Personal Brain, and turned into a useful answer when someone needs to care for that pet.

This repository is the demo interface. It follows one dog, Momo, a four-year-old Golden Retriever.

---

## Overview

Pet details usually live in scattered notes, texts, and memory. A sitter or a vet visit then starts from scratch.

PawMemory keeps those moments in one place and answers from them. A question such as “What should Sarah know about Momo?” can draw on routine, preferences, people, and past visits instead of a single note.

The demo shows that loop with Momo and Sarah:

separate moments over time → Momo's Personal Brain → one useful answer

---

## Current features

- Ask PawMemory, with a live streamed answer
- Quick prompts for a caregiver brief, recent changes, and a vet visit summary
- Markdown answers, with internal runtime logs hidden
- Remember this, for a written note about Momo
- A memory timeline for routine, preferences, people, and new moments
- A caregiver brief prepared for Sarah
- A share sheet that copies a care-guide link
- A pet profile for Momo

Photo and voice notes are visible and marked “Soon.” They do not save anything.

---

## How a question is answered

1. The owner asks about Momo, or saves a written memory.
2. The interface sends that turn to a local ClawMax agent, `pawmemory-agent-for-a-pet-personal-brain`.
3. ClawMax runs the agent through OpenClaw.
4. Cognee is the memory layer the agent uses to connect relevant moments.
5. The answer streams back into the PawMemory page.

Cognee is named in the interface as the technology behind the Personal Brain. The product the person sees is PawMemory.

---

## Architecture

- **Interface (`src/`)**: React pages for Ask, Add Memory, and Memories. There is no router. Views switch in the page.
- **Dev proxy (`vite.config.js`)**: `/api` is forwarded to `http://localhost:3001` while `npm run dev` is running.
- **Agent runtime**: ClawMax and OpenClaw, running locally. They are not included in this repository.
- **Memory**: Cognee, reached through that agent. This repository does not store the brain itself.

Ask uses a new session id for each question. Remember this uses one session, `pawmemory-ui-memory`.

---

## Tech stack

- Frontend: React, Vite
- Agent host: ClawMax
- Agent runtime: OpenClaw
- Memory: Cognee

---

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints.

ClawMax must be running at `http://localhost:3001` for Ask PawMemory and Remember this. The caregiver brief, memory list, and the rest of the screen still render if it is not.

`npm run build` creates a static site. That build does not proxy `/api`, so live answers require the dev server.

---

## What this demo does not do yet

- Accounts, or more than one real pet. “Add another pet” only closes the menu.
- A public share page. Share with Sarah copies a link. It does not publish the brief.
- Photo or voice capture.
- A hosted URL. The interface and the agent both run on your machine.

The memory list in the browser is the demo’s local view. A saved note is sent to the agent first. Refreshing the page restores the original Momo stories in the list.

---

## Demo story

Momo has a morning and evening routine, likes chicken treats and a yellow tennis ball, and dislikes carrots. Sarah’s visits run from a nervous first meeting in June 2026 to an excited greeting in September 2026. The caregiver brief is what someone would hand a pet sitter before leaving Momo with her.
