# IngenieroDocente — DevSecOps & OWASP Top 10 2023 Edition

[![DevSecOps CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](.github/workflows/devsecops.yml)
[![Mutation Testing](https://img.shields.io/badge/StrykerJS-Mutation%20Score%20%3E65%25-brightgreen)](stryker.config.json)
[![OWASP Top 10 2023](https://img.shields.io/badge/Security-OWASP%20Top%2010%202023-critical)](server.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Full--Stack-3178C6?logo=typescript&logoColor=white)](tsconfig.json)

**IngenieroDocente** is a full-stack pedagogical Software Engineering tutoring platform built with **React, Vite, Express, TypeScript, and the Google GenAI SDK (`@google/genai`)**, hardened with **JWT authentication**, **Role-Based Access Control (RBAC)**, **OWASP Top 10 2023 controls**, **Vitest unit testing**, **StrykerJS mutation testing**, **SonarQube Cloud quality compliance**, **CodeQL-safe patterns**, and **Dependabot**.

---

## OWASP Top 10 (2023) Security Controls Implemented

| OWASP Category | Control Implemented | File(s) & Function(s) |
| --- | --- | --- |
| **A01:2023 – Broken Access Control** | Strict JWT Bearer authentication and Role-Based Access Control (`USER`, `ADMIN`) separating public, user, and admin-only endpoints. | `server.ts` (`authenticateJWT`, `authorizeRole`), `src/security/authAndValidation.ts` (`hasRequiredRole`, `extractBearerToken`) |
| **A02:2023 – Cryptographic Failures** | Server-side environment variable management (`JWT_SECRET`, `GEMINI_API_KEY`) with runtime cryptographic fallback (`crypto.randomBytes`) and SHA-256 `timingSafeEqual` credential digest verification. | `server.ts` (`dotenv.config`), `src/security/authAndValidation.ts` (`getJwtSecret`, `verifyPassphraseDigest`) |
| **A03:2023 – Injection** | Strict payload type/length validation, control-character sanitization, ReDoS-free JSON parsing, prototype-pollution-free `Map` telemetry, and strict Gemini `responseSchema`. | `src/security/authAndValidation.ts` (`sanitizeText`, `validateLoginBody`, `validateStructuredRequestBody`, `validateChallengeRequestBody`, `validateChatRequestBody`, `cleanAndParseJson`), `server.ts` (`buildPedagogicalConfig`) |
| **A04:2023 – Insecure Design** | Resilience via exponential backoff retry logic (`callGeminiWithRetry`), multi-model fallback, and safe error responses (`sendSafeServerError`) that never leak stack traces in production. | `server.ts` (`callGeminiWithRetry`, `generateContentWithFallback`, `sendSafeServerError`) |
| **A05:2023 – Security Misconfiguration** | Hardened HTTP security headers via `helmet()`, restrictive `cors()` origin whitelist, and strict JSON body size limits (`1mb`). | `server.ts` (`helmet(...)`, `cors(...)`, `express.json({ limit: '1mb' })`) |
| **A07:2023 – Identification and Authentication Failures** | Short-lived signed JWTs (`expiresIn: '1h'`), signature and claim verification, and dedicated brute-force rate limiting on `/api/auth/login`. | `server.ts` (`loginRateLimiter`, `/api/auth/login`), `src/security/authAndValidation.ts` (`generateJwtToken`, `verifyJwtToken`, `authenticateCredentials`) |
| **A09:2023 – Security Logging and Monitoring Failures** | Structured security audit middleware logging timestamp, HTTP method, sanitized path, authenticated role, status code, and latency without ever logging tokens or credentials, exposed via `/api/admin/security-audit`. | `server.ts` (`securityAuditMiddleware`, `handleAdminSecurityAudit`, `/api/admin/security-audit`) |

---

## Testing & Mutation Testing

Run TypeScript typecheck, build, Vitest unit tests, and StrykerJS mutation testing:

```bash
npm run lint
npm run build
npm test
npm run test:mutation
```

StrykerJS is configured in `stryker.config.json` with `thresholds: { high: 80, low: 60, break: 50 }`, ensuring the CI/CD pipeline automatically fails if the mutation score drops below 50%.

---

## Testing the 3 JWT & RBAC Endpoint Tiers

Start the server (`npm run dev`) and test the three access tiers:

### 1. Public Endpoint — Authenticate (`POST /api/auth/login`)

Obtain a `USER` token (`student`):
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"quickRole":"USER"}'
```

Obtain an `ADMIN` token (`admin`):
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"quickRole":"ADMIN"}'
```

*(You can also authenticate with `username` and `password` using `DEMO_USER_PASSPHRASE` / `DEMO_ADMIN_PASSPHRASE` configured in your environment, or default demo passphrases `student` -> `Student#DevSecOps2026` and `admin` -> `Admin#DevSecOps2026`.)*

### 2. User & Admin Protected Endpoints (`POST /api/assist/structured`, `POST /api/assist/chat`)

Accessible with either a `USER` or `ADMIN` Bearer token (returns `401 Unauthorized` without a valid token):
```bash
curl -s -X POST http://localhost:3000/api/assist/structured \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <USER_OR_ADMIN_JWT>" \
  -d '{"query":"Explain Single Responsibility Principle","studentLevel":"intermedio","preferredLanguage":"typescript"}'
```

```bash
curl -s -X POST http://localhost:3000/api/assist/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <USER_OR_ADMIN_JWT>" \
  -d '{"messages":[{"role":"user","content":"What is a pure function?"}]}'
```

### 3. Admin-Only Protected Endpoints (`POST /api/assist/challenge`, `GET /api/admin/security-audit`)

Returns `403 Forbidden` for `USER` tokens and `200 OK` for `ADMIN` tokens:
```bash
curl -s -X GET http://localhost:3000/api/admin/security-audit \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

```bash
curl -s -X POST http://localhost:3000/api/assist/challenge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -d '{"topic":"SOLID Principles","studentLevel":"intermedio"}'
```
