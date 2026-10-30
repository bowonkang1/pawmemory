# PawMemory

PawMemory is a demo I built for one idea: a pet’s moments should stay connected, so the next person caring for them does not start from zero.

The demo pet is Momo, a four-year-old Golden Retriever. Sarah is the person who looks after her.

---

## Why

The useful facts about a pet are usually scattered. Breakfast time is in one note. A bad first visit with a sitter is in another. By the time someone asks “what should Sarah know?”, a person has to reassemble that by hand.

PawMemory keeps those moments and answers from them. The path is:

separate moments → Momo’s Personal Brain → one answer someone can use

---

## What you can do in the demo

- Ask a question about Momo and watch the answer stream in
- Fill the question from three prompts: caregiver brief, recent changes, vet visit summary
- Read the answer as formatted text. Runtime logs from the agent are hidden
- Save a written note with Remember this
- Look through Momo’s memories as a short timeline
- Open the caregiver brief prepared for Sarah, and copy a share link

Photo and Voice are on the Add Memory screen and labeled Soon. They do not upload or record anything.

---

## What happens when you ask

The page does not answer by itself.

1. Ask PawMemory, or Remember this, sends the text to a local ClawMax agent named `pawmemory-agent-for-a-pet-personal-brain`.
2. ClawMax runs that agent with OpenClaw.
3. Cognee is the memory store that agent searches.
4. The reply streams back onto the page.

Each question gets its own session id. Remember this always uses the session `pawmemory-ui-memory`.

Cognee shows up in the interface as the system that connected the memories. The thing a person uses is still PawMemory.

---

## Stack

- Interface: React and Vite, in this repo
- Agent host: ClawMax, local, not in this repo
- Agent runtime: OpenClaw
- Memory: Cognee, through the agent

`vite.config.js` proxies `/api` to `http://localhost:3001` during `npm run dev`. A production build does not proxy, so live Ask and Remember this need the dev server.

---

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints.

ClawMax has to be up on port 3001 or the question will fail with a short error. The Sarah brief and the memory list still show without it.

---

## What is still a demo

- One real pet. Momo is hardcoded. Add another pet closes the menu and does not create a pet.
- Share with Sarah copies `/care/momo-for-sarah`. There is no public page behind that link.
- The timeline on screen is local. Remember this does send the note to the agent, but a refresh puts the original Momo stories back in the list.
- No accounts, no hosted site, no photo or voice storage.

---

## The story on screen

Momo eats breakfast at 8:00 AM, walks at 9:00 AM, eats dinner at 6:00 PM, and walks again at 7:00 PM. She likes chicken treats and a yellow tennis ball, and she dislikes carrots.

Sarah’s visits are the relationship the brief is built from. In June 2026 Momo hid near the bedroom. In July she played. In September she met Sarah at the door.
