# Primes Teaching Agent

An AI-powered teaching platform with voice interaction capabilities, built with Next.js, Supabase, and ElevenLabs.

## Overview

This project provides an intelligent teaching agent that can interact with users through voice, manage assessments, and provide personalized learning experiences.

## Key Features

- 🎤 Voice interaction with ElevenLabs integration
- 📚 Knowledge base management with RAG (Retrieval Augmented Generation)
- 📝 Assessment and quiz system
- 👥 Multi-tenant organization support
- 🔐 Role-based authentication (Platform Owner, Admin, Employee)
- 🤖 AI-powered content generation with Gemini

## Documentation

All project documentation is organized in the [`docs/`](./docs) folder:

- **Setup & Deployment**: [`docs/SETUP.md`](./docs/SETUP.md), [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- **Architecture**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Phase Execution Plans**: [`docs/PHASE_1_EXECUTION_TASK_LIST.md`](./docs/PHASE_1_EXECUTION_TASK_LIST.md), [`docs/PHASE_2_EXECUSION_TASK_LIST.md`](./docs/PHASE_2_EXECUSION_TASK_LIST.md)
- **ElevenLabs Integration**: [`docs/ELEVENLABS_CLIENT_TOOL_SETUP.md`](./docs/ELEVENLABS_CLIENT_TOOL_SETUP.md), [`docs/ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md`](./docs/ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md)
- **Admin Guides**: [`docs/ADMIN_MANAGEMENT_GUIDE.md`](./docs/ADMIN_MANAGEMENT_GUIDE.md), [`docs/PLATFORM_OWNER_GUIDE.md`](./docs/PLATFORM_OWNER_GUIDE.md)

## Database

Supabase migrations and utility scripts are in the [`supabase/`](./supabase) folder:

- **Migrations**: [`supabase/migrations/`](./supabase/migrations)
- **Utility Scripts**: [`supabase/scripts/`](./supabase/scripts)

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini, OpenAI embeddings
- **Voice**: ElevenLabs
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see [`docs/SETUP.md`](./docs/SETUP.md))
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## License

[Add your license here]
