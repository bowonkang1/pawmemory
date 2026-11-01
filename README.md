# PawMemory

PawMemory is a pet memory assistant I built for a hackathon using Cognee, OpenClaw, and ClawMax. It explores how an AI agent can remember a pet's routines, preferences, and past experiences, then use that information to help someone caring for them.

For the demo, I created Momo, a four-year-old Golden Retriever, and her caregiver, Sarah. Momo has a history of daily routines, preferences, and interactions with Sarah over several months.

The goal was to see whether an agent could connect those separate memories and answer questions without needing the pet's history explained again each time.

## Features

- **Ask PawMemory:** Ask questions about Momo and receive streamed responses from the agent.
- **Suggested questions:** Try a caregiver brief, recent changes, or vet visit summary.
- **Remember this:** Send a new text memory to the agent.
- **Memory timeline:** Browse Momo's example memories and past experiences.
- **Caregiver brief:** View a summary prepared for Sarah.
- **Photo and Voice:** Shown in the interface as planned features, but not implemented yet.

## How it works

PawMemory uses ClawMax and OpenClaw to connect the frontend to Cognee's memory system.

1. The React frontend sends a question or memory to a local ClawMax agent.
2. ClawMax runs the agent through OpenClaw.
3. The agent uses Cognee to retrieve relevant memories.
4. The response streams back to the frontend.

The agent is named `pawmemory-agent-for-a-pet-personal-brain`.

Each question uses a separate session ID, while new memories are sent through the `pawmemory-ui-memory` session.

The frontend displays the agent's answer without showing its internal runtime logs.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Agent Host | ClawMax |
| Agent Runtime | OpenClaw |
| Memory | Cognee |
| Communication | REST API, Server-Sent Events (SSE) |

## Running Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the local URL provided by Vite.

The frontend expects ClawMax to be running on port `3001`. During development, Vite proxies `/api` requests to `http://localhost:3001`.

Without the agent running, Ask PawMemory and Remember this won't work, but the example memory timeline and caregiver brief will still be visible.

The production build does not include this development proxy.

## Demo Scenario

Momo's example data includes her daily schedule, favorite things, and interactions with Sarah.

She eats breakfast at 8 AM, takes walks at 9 AM and 7 PM, and has dinner at 6 PM. She loves chicken treats and her yellow tennis ball but doesn't like carrots.

Her relationship with Sarah also changes over time:

- **June 2026:** Momo was nervous and hid near the bedroom.
- **July 2026:** She became more comfortable and started playing with Sarah.
- **September 2026:** She greeted Sarah at the door.

I used these examples to test whether the agent could retrieve information across different memories and recognize changes over time.

## Current Limitations

This is a hackathon prototype, not a production application.

- Momo is the only pet in the demo. Adding another pet isn't implemented.
- The memory timeline uses local example data. New memories are sent to the agent but don't persist in the displayed timeline after a refresh.
- The caregiver share button copies `/care/momo-for-sarah`, but there is no public share page yet.
- Photo and voice uploads aren't implemented.
- There is no authentication, hosted backend, or persistent frontend database.

The main focus was testing the agent and memory integration rather than building a complete pet management application.
