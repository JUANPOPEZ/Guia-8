import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel, Schema } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  UserRole,
  JwtUserPayload,
  getJwtSecret,
  authenticateCredentials,
  authenticateDemoRole,
  generateJwtToken,
  extractBearerToken,
  verifyJwtToken,
  hasRequiredRole,
  validateLoginBody,
  validateStructuredRequestBody,
  validateChallengeRequestBody,
  validateChatRequestBody,
  cleanAndParseJson,
  sanitizeStructuredExplanation,
  sanitizeText,
} from './src/security/authAndValidation';

// OWASP A02:2023 – Cryptographic Failures:
// Load secrets (GEMINI_API_KEY, JWT_SECRET) exclusively from server environment variables; never expose them to clients.
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust reverse proxy headers (Cloud Run / Nginx) so express-rate-limit identifies client IPs accurately
app.set('trust proxy', 1);

interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

interface AuditLogRecord {
  timestamp: string;
  method: string;
  path: string;
  role: string;
  statusCode: number;
  durationMs: number;
}

// OWASP A09:2023 – Security Logging and Monitoring Failures:
// In-memory security telemetry using Map to prevent Prototype Pollution (CodeQL safe).
const serverStartTime = Date.now();
const endpointHitsMap = new Map<string, number>();
const metricsState = {
  totalRequests: 0,
  requestsByRole: {
    ADMIN: 0,
    USER: 0,
    ANONYMOUS: 0,
  },
  securityEvents: {
    unauthorized401: 0,
    forbidden403: 0,
    rateLimited429: 0,
    loginSuccess: 0,
    loginFailure: 0,
  },
  recentAuditLogs: [] as AuditLogRecord[],
};

function recordAuditEntry(entry: AuditLogRecord): void {
  metricsState.recentAuditLogs.unshift(entry);
  if (metricsState.recentAuditLogs.length > 25) {
    metricsState.recentAuditLogs.pop();
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown internal error';
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// OWASP A05:2023 – Security Misconfiguration:
// Enforce hardened HTTP security headers via helmet() with explicit Content-Security-Policy directives.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.usercontent.goog'],
      },
    },
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
  })
);

// OWASP A05:2023 – Security Misconfiguration:
// Restrictive CORS policy using an explicit origin allowlist.
const allowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.APP_URL ? [stripTrailingSlash(process.env.APP_URL)] : []),
  ...(process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
        .map((o) => stripTrailingSlash(o.trim()))
        .filter((o) => Boolean(o) && o !== '*')
    : []),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = stripTrailingSlash(origin);
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  })
);

// Limit JSON payload size to mitigate DoS and oversized body injection
app.use(express.json({ limit: '1mb' }));

// OWASP A09:2023 – Security Logging and Monitoring Failures:
// Structured security audit middleware logging method, sanitized path, authenticated role, status code, and timestamp.
// Never logs Authorization headers, JWT tokens, or passwords.
function securityAuditMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const startMs = Date.now();
  const safePath = sanitizeText(req.originalUrl.split('?')[0], 200).replace(/[\r\n]/g, '');

  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const role: string = req.user?.role ?? 'ANONYMOUS';
    const timestamp = new Date().toISOString();

    metricsState.totalRequests += 1;
    if (role === 'ADMIN') {
      metricsState.requestsByRole.ADMIN += 1;
    } else if (role === 'USER') {
      metricsState.requestsByRole.USER += 1;
    } else {
      metricsState.requestsByRole.ANONYMOUS += 1;
    }

    endpointHitsMap.set(safePath, (endpointHitsMap.get(safePath) ?? 0) + 1);

    if (res.statusCode === 401) metricsState.securityEvents.unauthorized401 += 1;
    if (res.statusCode === 403) metricsState.securityEvents.forbidden403 += 1;
    if (res.statusCode === 429) metricsState.securityEvents.rateLimited429 += 1;

    const auditEntry: AuditLogRecord = {
      timestamp,
      method: req.method,
      path: safePath,
      role,
      statusCode: res.statusCode,
      durationMs,
    };

    recordAuditEntry(auditEntry);
    console.info(
      `[SECURITY AUDIT] ${timestamp} | ${req.method} ${safePath} | role=${role} | status=${res.statusCode} | ${durationMs}ms`
    );
  });

  next();
}

app.use('/api', securityAuditMiddleware);

// OWASP A07:2023 – Identification and Authentication Failures:
// Dedicated brute-force rate limiter for /api/auth/login.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded. Please wait before retrying.',
  },
});

const spaRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiRateLimiter);

// OWASP A01:2023 – Broken Access Control & A07:2023 – Identification and Authentication Failures:
// Authenticate incoming Bearer JWT and attach verified user claims to request context.
function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Authorization: Bearer <token> header.',
    });
    return;
  }

  const verification = verifyJwtToken(token, getJwtSecret());
  if (!verification.valid) {
    res.status(401).json({
      success: false,
      error: verification.error,
    });
    return;
  }

  req.user = verification.payload;
  next();
}

// OWASP A01:2023 – Broken Access Control:
// Enforce strict Role-Based Access Control (RBAC) for protected endpoints.
function authorizeRole(roles: readonly UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthenticated session.',
      });
      return;
    }

    if (!hasRequiredRole(req.user.role, roles)) {
      res.status(403).json({
        success: false,
        error: `Access denied (403 Forbidden). Role '${req.user.role}' is not authorized; required: ${roles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}

// OWASP A02:2023 – Cryptographic Failures: Server-only Gemini API client initialization.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `Eres IngenieroDocente, un asistente virtual pedagógico de nivel universitario especializado en Ingeniería de Software. Tu objetivo principal es ayudar a los estudiantes de informática y carreras afines a comprender con solidez y rigor los conceptos del desarrollo de software.

REGLAS OBLIGATORIAS:
1. Idioma: Responde siempre en español con excelente redacción, acentuación y claridad.
2. Lenguaje claro y académico: Usa una terminología técnica precisa (cohesión, acoplamiento, concurrencia, idempotencia, abstracción, mantenibilidad, latencia, etc.), explicada de forma accesible.
3. Formato estructurado obligatorio en cuatro secciones:
   - DEFINICIÓN: Concepto esencial y formal expresado con precisión.
   - EXPLICACIÓN: Mecanismo de funcionamiento, justificación de su existencia, ventajas/desventajas y organización en pasos cuando aplique.
   - EJEMPLO PRÁCTICO: Código fuente verosímil, limpio y comentado en el lenguaje solicitado (o el más representativo para el concepto) mostrando el caso de uso real.
   - RECOMENDACIÓN PRÁCTICA: Consejo práctico para el diseño o desarrollo en proyectos reales de la industria.
4. Advertencia técnica: Advierte expresamente qué documentación técnica oficial o especificación (por ejemplo: especificaciones ECMAScript, documentación oficial de Python/Java/Go, RFCs de IETF, guías de arquitectura de AWS/Microsoft) debe verificarse, indicando que las características pueden variar según la versión del lenguaje o framework.
5. Reconocimiento de información insuficiente: Si la pregunta del estudiante es vaga, carece de código, versiones o contexto esencial para dar una respuesta certera, señálalo expresamente e indica qué datos o parámetros se requieren.
6. Cero invención: Nunca inventes fuentes bibliográficas, citas académicas imaginarias, estadísticas sin sustento ni URLs falsas. Si mencionas obras canónicas (como el catálogo GoF de 1994, Clean Code de Robert C. Martin o el paper de Edgar F. Codd sobre el modelo relacional), hazlo con rigor verídico.`;

const STRUCTURED_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: 'Main concept analyzed' },
    isInsufficientInfo: { type: Type.BOOLEAN, description: 'True if context is missing' },
    insufficientInfoNotice: { type: Type.STRING, description: 'Notice detailing missing parameters' },
    definition: { type: Type.STRING, description: 'Rigorous formal definition' },
    explanation: { type: Type.STRING, description: 'Technical explanation and tradeoffs' },
    steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Sequential steps' },
    example: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING },
        code: { type: Type.STRING },
        explanation: { type: Type.STRING },
      },
      required: ['language', 'code', 'explanation'],
    },
    practicalRecommendation: { type: Type.STRING },
    verificationWarning: { type: Type.STRING },
    relatedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    verifiedReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'topic',
    'isInsufficientInfo',
    'insufficientInfoNotice',
    'definition',
    'explanation',
    'example',
    'practicalRecommendation',
    'verificationWarning',
  ],
};

const CHALLENGE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    scenario: { type: Type.STRING },
    codeSnippet: { type: Type.STRING },
    language: { type: Type.STRING },
    question: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['id', 'text', 'explanation'],
      },
    },
    correctOptionId: { type: Type.STRING },
    academicFeedback: { type: Type.STRING },
    verificationWarning: { type: Type.STRING },
  },
  required: [
    'title',
    'scenario',
    'question',
    'options',
    'correctOptionId',
    'academicFeedback',
    'verificationWarning',
  ],
};

function isTransientGeminiError(err: unknown): boolean {
  const errObj = err && typeof err === 'object' ? (err as { status?: number }) : {};
  const errMsg = getErrorMessage(err);
  return (
    errObj.status === 503 ||
    errObj.status === 429 ||
    errMsg.includes('503') ||
    errMsg.includes('429') ||
    errMsg.includes('high demand') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('RESOURCE_EXHAUSTED')
  );
}

// OWASP A04:2023 – Insecure Design:
// Exponential backoff retry wrapper to handle transient upstream saturation without cascading failures.
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await apiCall();
    } catch (err: unknown) {
      attempt += 1;
      if (attempt <= maxRetries && isTransientGeminiError(err)) {
        console.warn(
          `[Gemini Retry] Attempt ${attempt}/${maxRetries} after transient error. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

function buildPedagogicalConfig(responseSchema?: Schema, extraInstruction?: string) {
  return {
    systemInstruction: extraInstruction
      ? `${SYSTEM_INSTRUCTION}\n${extraInstruction}`
      : SYSTEM_INSTRUCTION,
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    ...(responseSchema
      ? {
          responseMimeType: 'application/json',
          responseSchema,
        }
      : {}),
  };
}

function buildStudentContextHeader(studentLevel: string, preferredLanguage: string): string {
  return `Contexto del estudiante:\n- Nivel académico: ${studentLevel}\n- Lenguaje para código: ${preferredLanguage}`;
}

async function generateContentWithFallback(
  contents: string | Array<{ role: string; parts: Array<{ text: string }> }>,
  config: ReturnType<typeof buildPedagogicalConfig>
) {
  const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr: unknown = null;

  for (const model of models) {
    try {
      return await callGeminiWithRetry(
        () =>
          ai.models.generateContent({
            model,
            contents,
            config,
          }),
        2,
        800
      );
    } catch (err: unknown) {
      console.warn(`[Model Fallback] Model ${model} unavailable; trying fallback model.`);
      lastErr = err;
    }
  }
  throw lastErr;
}

// OWASP A04:2023 – Insecure Design:
// Safe error responder that omits stack traces and internal error details in production.
function sendSafeServerError(res: Response, publicMessage: string, error: unknown): Response {
  console.error(`[Server Error] ${publicMessage}:`, getErrorMessage(error));
  return res.status(500).json({
    success: false,
    error: publicMessage,
    ...(isProduction ? {} : { details: getErrorMessage(error) }),
  });
}

// ============================================================================
// PUBLIC ROUTE: POST /api/auth/login
// ============================================================================
app.post('/api/auth/login', loginRateLimiter, (req: Request, res: Response) => {
  const bodyCheck = validateLoginBody(req.body);
  if (!bodyCheck.valid) {
    metricsState.securityEvents.loginFailure += 1;
    return res.status(400).json({ success: false, error: bodyCheck.error });
  }

  const authResult =
    bodyCheck.mode === 'quickRole'
      ? authenticateDemoRole(bodyCheck.quickRole)
      : authenticateCredentials(bodyCheck.username, bodyCheck.password);

  if (!authResult.valid) {
    metricsState.securityEvents.loginFailure += 1;
    return res.status(401).json({ success: false, error: authResult.error });
  }

  // OWASP A02 & A07: Issue signed JWT with 1h expiration
  const token = generateJwtToken(authResult.user, getJwtSecret(), '1h');
  metricsState.securityEvents.loginSuccess += 1;

  return res.json({
    success: true,
    token,
    expiresIn: '1h',
    user: authResult.user,
  });
});

// ============================================================================
// PROTECTED ROUTES (USER & ADMIN): /api/assist/structured, /api/assist/chat, /api/assist/stream
// ============================================================================

app.post(
  '/api/assist/stream',
  authenticateJWT,
  authorizeRole(['USER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateStructuredRequestBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const { query, studentLevel, preferredLanguage } = validation.data;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const prompt = `${buildStudentContextHeader(studentLevel, preferredLanguage)}

Consulta del estudiante:
"${query}"

Organiza la respuesta obligatoriamente en las 4 secciones (Definición Conceptual, Explicación Técnica, Ejemplo Práctico en ${preferredLanguage}, Recomendación Práctica) más la Advertencia de Verificación Documental.`;

    const config = buildPedagogicalConfig();

    try {
      let stream;
      try {
        stream = await ai.models.generateContentStream({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config,
        });
      } catch {
        stream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config,
        });
      }

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: unknown) {
      console.error('Error in /api/assist/stream:', getErrorMessage(err));
      res.write(
        `data: ${JSON.stringify({ error: isProduction ? 'Streaming error occurred.' : getErrorMessage(err) })}\n\n`
      );
      res.end();
    }
  }
);

app.post(
  '/api/assist/structured',
  authenticateJWT,
  authorizeRole(['USER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateStructuredRequestBody(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const { query, studentLevel, preferredLanguage, conversationContext } = validation.data;

      const prompt = `${buildStudentContextHeader(studentLevel, preferredLanguage)}

Consulta del estudiante:
"${query}"

${conversationContext.length > 0 ? `Contexto previo:\n${JSON.stringify(conversationContext.slice(-3))}\n` : ''}
Por favor, analiza la consulta y genera la respuesta académica estructurada.
- Si la consulta carece de contexto suficiente, marca isInsufficientInfo como true y explica qué parámetros faltan.
- En el campo 'example', genera un ejemplo de código limpio y comentado en ${preferredLanguage}.`;

      const response = await generateContentWithFallback(
        prompt,
        buildPedagogicalConfig(STRUCTURED_RESPONSE_SCHEMA)
      );

      if (!response.text) {
        throw new Error('Empty response payload received from AI model.');
      }

      const parsedData = cleanAndParseJson<Record<string, unknown>>(response.text);
      const sanitizedData = sanitizeStructuredExplanation(parsedData, preferredLanguage);
      return res.json({ success: true, data: sanitizedData });
    } catch (error: unknown) {
      return sendSafeServerError(
        res,
        'Failed to process structured pedagogical explanation.',
        error
      );
    }
  }
);

app.post(
  '/api/assist/chat',
  authenticateJWT,
  authorizeRole(['USER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateChatRequestBody(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const { messages, studentLevel, preferredLanguage } = validation.data;
      const formattedContents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const extraConfig = `${buildStudentContextHeader(studentLevel, preferredLanguage)}
Siempre mantén el formato claro: Definición, Explicación técnica, Ejemplo práctico y Recomendación práctica con advertencia de verificación.`;

      const response = await generateContentWithFallback(
        formattedContents,
        buildPedagogicalConfig(undefined, extraConfig)
      );

      return res.json({ success: true, reply: response.text || '' });
    } catch (error: unknown) {
      return sendSafeServerError(res, 'Failed to process conversational follow-up.', error);
    }
  }
);

// ============================================================================
// ADMIN-ONLY ROUTES: POST /api/assist/challenge, GET /api/admin/security-audit
// ============================================================================

app.post(
  '/api/assist/challenge',
  authenticateJWT,
  authorizeRole(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateChallengeRequestBody(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const { topic, studentLevel } = validation.data;
      const prompt = `Genera un desafío práctico o caso de estudio académico para un estudiante de ingeniería de software sobre el tema: "${topic}".
Nivel: ${studentLevel}.
Incluye escenario realista, pregunta detonante, 3-4 opciones técnicas y retroalimentación académica.`;

      const response = await generateContentWithFallback(
        prompt,
        buildPedagogicalConfig(CHALLENGE_RESPONSE_SCHEMA)
      );

      if (!response.text) {
        throw new Error('Empty response payload received from AI model.');
      }

      return res.json({ success: true, data: cleanAndParseJson(response.text) });
    } catch (error: unknown) {
      return sendSafeServerError(res, 'Failed to generate technical challenge.', error);
    }
  }
);

function handleAdminSecurityAudit(_req: AuthenticatedRequest, res: Response): Response {
  return res.json({
    success: true,
    data: {
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      totalRequests: metricsState.totalRequests,
      requestsByRole: { ...metricsState.requestsByRole },
      securityEvents: { ...metricsState.securityEvents },
      endpointHits: Object.fromEntries(endpointHitsMap.entries()),
      recentAuditLogs: [...metricsState.recentAuditLogs],
    },
  });
}

app.get(
  '/api/admin/security-audit',
  authenticateJWT,
  authorizeRole(['ADMIN']),
  handleAdminSecurityAudit
);

app.get(
  '/api/admin/metrics',
  authenticateJWT,
  authorizeRole(['ADMIN']),
  handleAdminSecurityAudit
);

// Global error handler (OWASP A04:2023 – Insecure Design: never expose internal stack traces)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errMsg = getErrorMessage(err);
  if (errMsg.includes('CORS')) {
    return res.status(403).json({ success: false, error: errMsg });
  }
  const errObj = err && typeof err === 'object' ? (err as { type?: string }) : {};
  if (errObj.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Malformed JSON request body.' });
  }
  return sendSafeServerError(res, 'Internal server error.', err);
});

async function startServer(): Promise<void> {
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', spaRateLimiter, async (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API route not found.' });
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(transformedHtml);
        }
        return res.status(404).send('Index HTML file not found.');
      } catch (err: unknown) {
        console.error('Routing error:', getErrorMessage(err));
        return res.status(500).send('Internal server error.');
      }
    });
  } else {
    const clientPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(clientPath));
    app.get('*', spaRateLimiter, (_req, res) => {
      res.sendFile(path.resolve(clientPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.info(`IngenieroDocente Server listening on port ${PORT}`);
  });
}

void startServer();