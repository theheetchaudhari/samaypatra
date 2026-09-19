# SAMAYPATRA Project Rules

These rules define the permanent engineering, architectural, and development constraints for SAMAYPATRA. All agents and contributors must adhere to them strictly.

---

## 1. Core Operating Philosophy

### AI Proposes → Application Validates → User Confirms → Calendar Executes
The system operates on an uncompromising human-in-the-loop paradigm:
1. **AI Proposes**: LLM/Bedrock extraction is an *untrusted proposal*, never an authoritative instruction.
2. **Application Validates**: Deterministic application logic validates extracted data schemas, date/time consistency, sanity constraints, and required fields.
3. **User Confirms**: The user reviews, edits, and explicitly confirms the proposal via the UI.
4. **Calendar Executes**: Only after explicit user approval does the system invoke the Google Calendar API.

### Absolute Guardrails
- **Never allow raw AI output to directly create a Google Calendar event.**
- **User confirmation is strictly mandatory** before any Google Calendar creation or sync occurs.
- **Preserve explainability and source traceability**: Every extracted event field (title, deadline, time, location, prerequisites) must remain traceable to the exact source text, image bounding region, or PDF snippet that produced it.

---

## 2. Ingestion Scope (V1 MVP)

SAMAYPATRA V1 supports three input modalities only:
1. **Raw Text / Unstructured Notes**: Direct paste of syllabi, emails, announcements, or assignment prompts.
2. **Images**: Screenshots, photos of flyers, whiteboards, or assignment sheets (processed via S3 → Textract → Bedrock).
3. **Simple / Single-Page PDFs**: Notices, circulars, and single-page assignment briefs.

*Note: Multi-page batch processing, complex table extraction, and automated scrapers are out of scope for V1.*

---

## 3. Architecture & Simplicity Principles

### Avoid Over-Engineering
- **No autonomous AI agents**: Do not introduce autonomous agents, agent swarms, or background self-directing loops unless a genuine requirement emerges that deterministic logic cannot solve.
- **No unnecessary databases**: Do not introduce DynamoDB, PostgreSQL, or other persistence layers unless cross-session persistence becomes strictly necessary.
- **No unnecessary AWS services**: Only utilize AWS services that directly serve an active flow (e.g., S3 for uploads, Textract for OCR, Bedrock for LLM inference, Lambda for compute, API Gateway for routing). Do not add services speculatively.
- **Hackathon MVP focus**: Favor clear, simple, robust solutions over theoretical scalability abstractions.
- **Minimal dependencies**: Do not add npm packages or Python libraries without a documented, clear justification.

---

## 4. Frontend Architecture Standards

### Layered Modular Structure
Maintain a clean separation of concerns:
```
src/
├── pages/                # High-level route/view containers
├── features/             # Feature-specific logic and compound components
│   ├── ingestion/        # Text, image, PDF upload & input
│   ├── extraction/       # Extraction status & raw evidence view
│   ├── validation/       # Validation rules, warnings & error display
│   ├── review/           # Event edit, confirmation & approval modal/card
│   └── calendar/         # Google OAuth & Calendar sync triggers
├── components/           # Generic, reusable UI primitives (buttons, cards, inputs)
├── services/             # API clients, HTTP calls, OAuth handlers
└── hooks/                # Reusable stateful React logic
```

### Critical Frontend Constraints
- **Do not put the application in `App.jsx`**: `App.jsx` must remain a lean routing or top-level orchestrator. Giant monolithic files are prohibited.
- **Separate API calls from presentation**: Presentation components must not contain inline `fetch` or SDK calls. Encapsulate all backend and Google Calendar interactions in dedicated service modules (`services/`) or custom hooks (`hooks/`).
- **Strict component boundaries**: Pages orchestrate features; features combine reusable components; reusable components handle styling and direct user input.

---

## 5. Development Workflow & Discipline

### Incremental Execution
Always follow this strict sequential lifecycle:
$$\text{Task} \longrightarrow \text{Implementation} \longrightarrow \text{Test} \longrightarrow \text{Verification} \longrightarrow \text{Next Task}$$
- Never tackle multiple unrelated features in a single step.
- Never declare a task complete without empirical verification (build check, test run, or DOM verification).
- Do not modify files unrelated to the task at hand.
- Preserve existing working code and comments unless explicitly directed to change them.
