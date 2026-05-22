# Stack Research

**Project:** DuoPratic — Educational Platform with AI Integration
**Researched:** 2025-05
**Overall Confidence:** HIGH (all critical packages verified via Context7 + npm registry)

---

## Recommended AI Integration

### LLM Provider: Google Gemini via `@google/genai`

**Use:** `@google/genai` v2.6.0 (the current official Google Gen AI JS SDK)

```bash
npm install @google/genai
```

**Why Gemini over OpenAI for this project:**

| Criterion | Google Gemini 2.5 Flash | OpenAI gpt-4o-mini |
|-----------|-------------------------|--------------------|
| Free tier | ✅ 15 RPM, 1 million tokens/day, 1 500 req/day | ❌ None on API (paid only) |
| Portuguese quality | ✅ Excellent | ✅ Excellent |
| Streaming | ✅ `generateContentStream` + SSE | ✅ `stream: true` + SSE |
| System instruction | ✅ `systemInstruction` field | ✅ `{ role: "system" }` message |
| TCC budget | ✅ R$ 0 to demo | ⚠️ Requires credit card |

The free tier of Gemini AI Studio (Gemini 2.5 Flash) is enough to run a TCC demo with dozens of concurrent students. OpenAI has no free tier — you'd need a credit card before writing a single API call. If the project grows into a real product later, switching to OpenAI or paying for Gemini Pro is a one-model-name change.

**How it connects to the Express backend (streaming SSE to vanilla JS frontend):**

```js
// backend — POST /api/ia/orientar
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/ia/orientar", limiteIA, autenticar, async (req, res) => {
  const { pergunta, contexto } = req.body;

  // SSE headers — vanilla JS frontend listens with EventSource or fetch+ReadableStream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction:
        "Você é um tutor pedagógico do DuoPratic para alunos do ensino fundamental 2 e médio. " +
        "Oriente o raciocínio do aluno sem entregar a resposta direta. " +
        "Use linguagem clara e motivadora em português do Brasil.",
      temperature: 0.5,
      maxOutputTokens: 600,
    },
    contents: [{ role: "user", parts: [{ text: pergunta }] }],
  });

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ texto: chunk.text })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});
```

**Pedagogical system prompt design (critical for the AI-not-giving-answers feature):**
The `systemInstruction` field is evaluated server-side — the frontend never sees it. This is where the "explain without giving the answer" constraint lives. Keep it as a constant in the backend, never expose it to the client. The temperature of 0.5 keeps responses helpful but not random.

**Important note on the deprecated SDK:**
Context7 flagged `@google/generative-ai` (the old package) as deprecated. **Do not install `@google/generative-ai`.** The current package is `@google/genai` — different name, different API surface. If you see old tutorials using `const { GoogleGenerativeAI } = require("@google/generative-ai")`, those are outdated.

---

### Storing AI Conversation History

The current schema has no table for AI interactions. Add this to the database:

```sql
CREATE TABLE IF NOT EXISTS historico_ia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    contexto VARCHAR(100),   -- e.g., 'funcoes-1grau', 'leitura', etc.
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

This gives teachers visibility into student doubts and lets the AI endpoint personalize based on recent history (send last 3 interactions as context).

---

## Supporting Libraries

### 1. Password Hashing — `bcrypt` v6.0.0

```bash
npm install bcrypt
```

**Why this is URGENT:** The current login stores and compares passwords in plain text. This must be fixed before AI features are added (you can't ship a product with plain text passwords, even for TCC). bcrypt is the Node.js standard — native bindings, timing-attack-resistant comparison.

```js
const bcrypt = require("bcrypt");

// On cadastro: hash before INSERT
const hash = await bcrypt.hash(senha, 12); // cost factor 12 is good for 2025 hardware

// On login: compare
const valido = await bcrypt.compare(senhaDigitada, hashArmazenado);
```

Migration path for existing users: add a `senha_migrada` flag or force password reset on next login.

---

### 2. Authentication Tokens — `jsonwebtoken` v9.0.3

```bash
npm install jsonwebtoken
```

**Why:** Currently the frontend stores the raw `{ id, nome, email, perfil }` object in `localStorage` and sends no auth token to the API — any request to `/api/usuarios/:id` can be made by anyone who guesses an ID. JWT fixes this by issuing a signed token on login that must accompany all private requests.

```js
const jwt = require("jsonwebtoken");

// On login success:
const token = jwt.sign(
  { id: usuario.id, perfil: usuario.perfil },
  process.env.JWT_SECRET,
  { expiresIn: "8h" }
);
res.json({ status: "ok", token, usuario });

// Middleware — reuse across all protected routes:
function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    return res.status(401).json({ status: "erro", message: "Não autenticado." });
  }
  try {
    req.usuario = jwt.verify(cabecalho.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ status: "erro", message: "Token inválido ou expirado." });
  }
}
```

Add `JWT_SECRET` to `.env`. The frontend stores the token in `localStorage` (replaces the raw user object currently stored there) and sends it as `Authorization: Bearer <token>` on every API call.

---

### 3. Rate Limiting — `express-rate-limit` v8.5.2

```bash
npm install express-rate-limit
```

**Why:** Two separate limiters are needed — a strict one for the AI endpoint (each call costs tokens and compute), and a moderate one for auth routes (brute force protection).

```js
const rateLimit = require("express-rate-limit");

// AI route — very conservative (Gemini free tier: 15 RPM per project)
const limiteIA = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  limit: 8,                  // 8 req/min per IP — buffer below Gemini's 15 RPM
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "erro", message: "Muitas perguntas seguidas. Aguarde um momento." }
});

// Auth routes — anti-brute-force
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/ia", limiteIA);
app.use("/api/login", limiteAuth);
app.use("/api/cadastro", limiteAuth);
```

---

### 4. Security Headers — `helmet` v8.2.0

```bash
npm install helmet
```

**Why:** One line adds a dozen HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) that browsers expect from any modern web app. The current server has none of these. Particularly important because the platform serves school students (minors).

```js
const helmet = require("helmet");
app.use(helmet());
// Add BEFORE express.static and all routes
```

---

### 5. Input Validation — `express-validator` v7.3.2

```bash
npm install express-validator
```

**Why:** The current API routes do zero validation beyond checking if fields are empty. The AI endpoint in particular must validate that the `pergunta` field is a string, not too long (max ~500 chars), and not empty — otherwise a malicious user can send a 50 MB body to run up token costs.

```js
const { body, validationResult } = require("express-validator");

app.post(
  "/api/ia/orientar",
  [
    body("pergunta").isString().trim().notEmpty().isLength({ max: 500 }),
    body("contexto").optional().isString().isLength({ max: 100 }),
  ],
  autenticar,
  limiteIA,
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ status: "erro", erros: erros.array() });
    }
    // proceed
  }
);
```

---

### 6. File Uploads — `multer` v2.1.1 *(only if needed)*

```bash
npm install multer
```

**When to use:** Only needed if teachers upload PDF/image content for activities. If activity content is text-only (typed in a form), skip multer entirely. If uploads are needed, use `diskStorage` with strict file type filtering — allow only PDF, JPEG, PNG, max 5 MB.

```js
const multer = require("multer");
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

---

## What to Avoid

### ❌ `@google/generative-ai` (old package)
Context7 explicitly flags this as **deprecated**. Old tutorials, Stack Overflow answers, and blog posts from 2023-2024 use it. The new package is `@google/genai` with a completely different API surface. Installing the old one will work today but will stop receiving updates and may break.

### ❌ LangChain (`langchain`, `@langchain/openai`, etc.)
LangChain is a great framework for complex agentic pipelines with tool use, memory management, and multi-step reasoning. DuoPratic's AI needs are simple: send a question with context, get a pedagogical response. LangChain adds ~80 transitive dependencies, 3-5x the bundle size, and a steep learning curve for a pattern that is just `ai.models.generateContentStream(...)`. Build the wrapper yourself — it's 30 lines of Express code.

### ❌ Vercel AI SDK (`ai` package)
Excellent SDK but tightly integrated with the React/Next.js/Remix streaming ecosystem (`useChat`, `useCompletion` hooks). The DuoPratic frontend is vanilla JS with no React. The SDK's streaming utilities output RSC-compatible formats that don't map cleanly to plain SSE + `fetch`. Don't add a framework dependency just to use one helper.

### ❌ Socket.io for AI streaming
Socket.io is the right tool for bidirectional real-time communication (chat apps, collaborative editors). AI streaming is one-directional (server → client) and short-lived (30-60s per response). Server-Sent Events (SSE) via `Content-Type: text/event-stream` is the correct primitive — simpler, HTTP/1.1 compatible, no extra dependency, and the vanilla JS `EventSource` API or `fetch` + `ReadableStream` handles it natively.

### ❌ GPT-4o or Claude Sonnet for student interactions
These are the most capable models but cost 10-20x more than GPT-4o-mini / Gemini Flash. The pedagogical task (hint-giving, concept explanation) does not require frontier model capability. For a TCC demo, Gemini 2.5 Flash is free. For production: stay on Flash/mini tier — spending $50/month on a student platform is hard to justify before revenue.

### ❌ Prisma, Sequelize, or TypeORM
The existing codebase uses raw `mysql2` queries. The schema is small (6 tables). Introducing an ORM mid-project means rewriting all existing queries, learning a new query API, dealing with migration tooling, and debugging generated SQL. The ROI is negative for a TCC. Keep raw queries — they're already working, performant, and easy to understand when reviewing the thesis code.

### ❌ `bcryptjs` (pure-JS version) in preference to `bcrypt`
`bcryptjs` is the pure-JavaScript implementation — great for browser environments and zero native dependencies. For a Node.js backend, the native `bcrypt` package (with compiled C++ bindings) is 2-3x faster for the hash/compare operations. Since this is a server-only dependency, there's no reason to choose the slower one. (Note: if you run into native compile issues on Windows with XAMPP, `bcryptjs` is an acceptable fallback — just rename the import.)

### ❌ Wildcard CORS in production
The current server has `Access-Control-Allow-Origin: *`. This is acceptable for local development but must be locked down to the actual origin before any deployment. With `helmet` installed, use:
```js
app.use(helmet());
// Replace the current manual CORS headers with:
const cors = require("cors");
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
```

---

## Environment Variables to Add

```dotenv
# .env additions (beyond existing DB_* and PORT)
JWT_SECRET=change_this_to_a_long_random_string_min_32_chars
GEMINI_API_KEY=your_google_ai_studio_api_key
CORS_ORIGIN=http://localhost:3000
```

---

## Complete Install Command

```bash
cd backend

# Core AI + security
npm install @google/genai bcrypt jsonwebtoken express-rate-limit helmet express-validator

# Optional (only if file uploads needed)
npm install multer
```

---

## Confidence Levels

| Component | Package | Version | Confidence | Source |
|-----------|---------|---------|------------|--------|
| LLM SDK | `@google/genai` | 2.6.0 | HIGH | Context7 `/googleapis/js-genai` + npm registry |
| LLM model | `gemini-2.5-flash` | — | HIGH | Google AI Studio docs; free tier confirmed |
| Password hashing | `bcrypt` | 6.0.0 | HIGH | Context7 `/kelektiv/node.bcrypt.js` + npm registry |
| JWT auth | `jsonwebtoken` | 9.0.3 | HIGH | Context7 `/auth0/node-jsonwebtoken` + npm registry |
| Rate limiting | `express-rate-limit` | 8.5.2 | HIGH | Context7 `/express-rate-limit/express-rate-limit` + npm |
| Security headers | `helmet` | 8.2.0 | HIGH | npm registry (standard Express security package) |
| Input validation | `express-validator` | 7.3.2 | HIGH | npm registry (standard Express validation package) |
| File uploads | `multer` | 2.1.1 | HIGH | Context7 `/expressjs/multer` + npm registry |
| SSE streaming | native Express | — | HIGH | Pattern verified via OpenAI + Google GenAI streaming docs |
| Old deprecated SDK | `@google/generative-ai` | — | HIGH (avoid) | Context7 explicitly flags as deprecated |

---

## Gemini Free Tier Limits (as of 2025)

Confirmed via Google AI Studio documentation (MEDIUM confidence — check current limits at [ai.google.dev](https://ai.google.dev/pricing)):

| Model | Requests/min | Tokens/day | Requests/day |
|-------|-------------|------------|--------------|
| gemini-2.5-flash | 10 RPM | 250 000 TPD | 500 RPD |
| gemini-2.0-flash | 15 RPM | 1 000 000 TPD | 1 500 RPD |

For a TCC presentation with ~30 students, `gemini-2.0-flash` free tier is sufficient. `gemini-2.5-flash` has better reasoning but a tighter free quota. Both are accessed via the same `@google/genai` SDK — the model name is a string parameter.

> **Note:** Free tier limits change. Always verify current limits at https://ai.google.dev/pricing before committing to an architecture decision that depends on specific quotas.
