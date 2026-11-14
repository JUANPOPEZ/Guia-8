import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  UserRole,
  JwtUserPayload,
  getJwtSecret,
  authenticateCredentials,
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
} from './src/security/authAndValidation';

// OWASP A02 (Cryptographic Failures): Carga centralizada de secretos (GEMINI_API_KEY, JWT_SECRET) desde .env en servidor, sin exponerlos al cliente.
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust reverse proxy headers (Cloud Run / Nginx) so express-rate-limit identifies client IPs safely
app.set('trust proxy', 1);

// Extend Express Request with authenticated user context
interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

// In-memory security telemetry for OWASP A09 & GET /api/admin/metrics
const serverStartTime = Date.now();
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
  endpointHits: {} as Record<string, number>,
  recentAuditLogs: [] as Array<{
    timestamp: string;
    method: string;
    path: string;
    role: string;
    statusCode: number;
    durationMs: number;
  }>,
};

function recordAuditEntry(entry: {
  timestamp: string;
  method: string;
  path: string;
  role: string;
  statusCode: number;
  durationMs: number;
}) {
  metricsState.recentAuditLogs.unshift(entry);
  if (metricsState.recentAuditLogs.length > 25) {
    metricsState.recentAuditLogs.pop();
  }
}

// OWASP A05 (Security Misconfiguration): Cabeceras HTTP seguras con helmet() y deshabilitación de X-Powered-By.
// Nota: Se ajusta CSP/xFrameOptions para permitir la ejecución de React/Vite dentro de entornos de previsualización en iframe.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
  })
);

// OWASP A05 (Security Misconfiguration): Configuración restrictiva de CORS mediante lista blanca de orígenes permitidos.
const allowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : []),
  ...(process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
    : []),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-side calls without Origin header, or explicitly whitelisted origins
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por la política CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  })
);

// Limit JSON payload size to mitigate DoS / oversized body injection
app.use(express.json({ limit: '1mb' }));

// OWASP A09 (Security Logging and Monitoring Failures): Middleware de auditoría que registra método, ruta, rol autenticado, código HTTP y timestamp sin exponer tokens ni contraseñas.
app.use('/api', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startMs = Date.now();
  const requestPath = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const role: string = req.user?.role ?? 'ANONYMOUS';
    const timestamp = new Date().toISOString();

    metricsState.totalRequests += 1;
    if (role === 'ADMIN') metricsState.requestsByRole.ADMIN += 1;
    else if (role === 'USER') metricsState.requestsByRole.USER += 1;
    else metricsState.requestsByRole.ANONYMOUS += 1;

    metricsState.endpointHits[requestPath] = (metricsState.endpointHits[requestPath] || 0) + 1;

    if (res.statusCode === 401) metricsState.securityEvents.unauthorized401 += 1;
    if (res.statusCode === 403) metricsState.securityEvents.forbidden403 += 1;
    if (res.statusCode === 429) metricsState.securityEvents.rateLimited429 += 1;

    const auditEntry = {
      timestamp,
      method: req.method,
      path: requestPath,
      role,
      statusCode: res.statusCode,
      durationMs,
    };

    recordAuditEntry(auditEntry);
    console.info(
      `[SECURITY AUDIT] ${timestamp} | ${req.method} ${requestPath} | role=${role} | status=${res.statusCode} | ${durationMs}ms`
    );
  });

  next();
});

// OWASP A07 (Identification and Authentication Failures): Rate-limiting específico en /api/auth/login para prevenir ataques de fuerza bruta.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 intentos por ventana por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
  },
});

// General API rate limiter to prevent abuse
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Límite de solicitudes excedido. Espera un momento antes de reintentar.',
  },
});

app.use('/api', apiRateLimiter);

// OWASP A01 (Broken Access Control) & A07 (Identification and Authentication Failures):
// Middleware de autenticación JWT que valida firma, expiración y estructura del token Bearer.
function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado. Se requiere header Authorization: Bearer <token>.',
    });
  }

  const verification = verifyJwtToken(token, getJwtSecret());
  if (!verification.valid) {
    return res.status(401).json({
      success: false,
      error: verification.error,
    });
  }

  req.user = verification.payload;
  return next();
}

// OWASP A01 (Broken Access Control): Middleware RBAC estricto para restringir rutas según roles autorizados.
function authorizeRole(roles: readonly UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Sesión no autenticada.',
      });
    }

    if (!hasRequiredRole(req.user.role, roles)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado (403 Forbidden). Rol '${req.user.role}' no autorizado; se requiere: ${roles.join(' o ')}.`,
      });
    }

    return next();
  };
}

// OWASP A02 (Cryptographic Failures): Uso exclusivo de GEMINI_API_KEY en el servidor.
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

// OWASP A04 (Insecure Design): Lógica de resiliencia con Exponential Backoff para mitigar picos 503/429 sin saturar el upstream.
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
    } catch (err: any) {
      attempt++;
      const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (attempt <= maxRetries && isTransient) {
        console.warn(`[Gemini Retry] Intento ${attempt}/${maxRetries} debido a saturación temporal (503/429). Reintentando en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

// Multi-model fallback runner to ensure availability during regional demand spikes
async function generateContentWithFallback(prompt: string, config: any) {
  const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      return await callGeminiWithRetry(
        () =>
          ai.models.generateContent({
            model,
            contents: prompt,
            config,
          }),
        2,
        800
      );
    } catch (err: any) {
      console.warn(`[Model Fallback] Modelo ${model} no disponible. Probando modelo alternativo...`);
      lastErr = err;
    }
  }
  throw lastErr;
}

// OWASP A04 (Insecure Design): Helper para respuestas de error seguras sin filtrar stack traces internos en producción.
function sendSafeServerError(res: Response, publicMessage: string, error: unknown) {
  console.error(`[Server Error] ${publicMessage}`, error instanceof Error ? error.message : 'Unknown error');
  return res.status(500).json({
    success: false,
    error: publicMessage,
    ...(isProduction
      ? {}
      : { details: error instanceof Error ? error.message : 'Error interno desconocido' }),
  });
}

// ============================================================================
// PUBLIC ROUTE: POST /api/auth/login
// ============================================================================
app.post('/api/auth/login', loginRateLimiter, (req: Request, res: Response) => {
  // OWASP A03 (Injection): Validación y sanitización estricta de credenciales en req.body
  const bodyCheck = validateLoginBody(req.body);
  if (!bodyCheck.valid) {
    metricsState.securityEvents.loginFailure += 1;
    return res.status(400).json({ success: false, error: bodyCheck.error });
  }

  const authResult = authenticateCredentials(bodyCheck.username, bodyCheck.password);
  if (!authResult.valid) {
    metricsState.securityEvents.loginFailure += 1;
    return res.status(401).json({ success: false, error: authResult.error });
  }

  // OWASP A02 & A07: Token JWT firmado con secreto en entorno y expiración estricta de 1h
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
// PROTECTED ROUTES (USER & ADMIN): /api/assist/stream, /api/assist/structured, /api/assist/chat
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

    const prompt = `Contexto del estudiante:
- Nivel académico: ${studentLevel}
- Lenguaje para código: ${preferredLanguage}

Consulta del estudiante:
"${query}"

Instrucciones pedagógicas:
1. Si la consulta no cuenta con suficiente información para brindar una respuesta técnica certera, indícalo expresamente al inicio bajo una sección de aviso, solicitando los parámetros faltantes.
2. Organiza la respuesta obligatoriamente en las 4 secciones con títulos Markdown limpios:

## 📘 1. Definición Conceptual
(Definición formal y concisa del concepto)

## 🔍 2. Explicación Técnica & Funcionamiento
(Explicación detallada, funcionamiento interno, justificación y pasos numerados si aplica)

## 💻 3. Ejemplo Práctico (${preferredLanguage})
\`\`\`${preferredLanguage}
// Código fuente limpio, realista y comentado
\`\`\`
(Explicación técnica del ejemplo)

## 💡 4. Recomendación Práctica para la Industria
(Buenas prácticas para producción y trade-offs)

## ⚠️ Advertencia de Verificación Documental
(Documentación técnica oficial, especificaciones o RFCs canónicos que deben cotejarse según la versión)`;

    const config = {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };

    try {
      let stream;
      try {
        stream = await ai.models.generateContentStream({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config,
        });
      } catch {
        console.warn('Fallback streaming to gemini-3.1-flash-lite...');
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
    } catch (err: any) {
      console.error('Error in /api/assist/stream:', err?.message);
      res.write(
        `data: ${JSON.stringify({ error: isProduction ? 'Error en streaming' : err?.message || 'Error en streaming' })}\n\n`
      );
      res.end();
    }
  }
);

// Endpoint for structured pedagogical explanation (forces JSON matching the 4 required pillars)
app.post(
  '/api/assist/structured',
  authenticateJWT,
  authorizeRole(['USER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // OWASP A03 (Injection): Sanitización y validación de tipos y longitudes en req.body
      const validation = validateStructuredRequestBody(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const { query, studentLevel, preferredLanguage, conversationContext } = validation.data;

      const prompt = `Contexto del estudiante:
- Nivel académico: ${studentLevel}
- Lenguaje de programación preferido para ejemplos: ${preferredLanguage}

Consulta del estudiante:
"${query}"

${conversationContext.length > 0 ? `Contexto previo:\n${JSON.stringify(conversationContext.slice(-3))}\n` : ''}

Por favor, analiza la consulta y genera la respuesta académica estructurada.
- Mantén un tono académico riguroso pero directo, didáctico y sin redundancias innecesarias.
- Si la consulta no cuenta con suficiente información para brindar una respuesta técnica responsable (por ejemplo: "mi código no anda", "cuál es el mejor lenguaje sin contexto de uso", etc.), marca isInsufficientInfo como true y completa insufficientInfoNotice explicando amablemente qué detalles específicos faltan.
- En el campo 'example', genera SIEMPRE un ejemplo de código real, limpio y bien comentado en ${preferredLanguage} (de 15 a 35 líneas, enfocado en ilustrar el concepto o la refactorización).`;

      // OWASP A03 (Injection): Esquema JSON estricto (responseSchema) para prevenir salidas malformadas del modelo
      const config = {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.STRING,
              description:
                'El tema o concepto principal analizado (ej: Principio de Responsabilidad Única, Patrón Factory, etc.)',
            },
            isInsufficientInfo: {
              type: Type.BOOLEAN,
              description: 'Verdadero si la consulta carece de detalles esenciales para responder responsablemente',
            },
            insufficientInfoNotice: {
              type: Type.STRING,
              description:
                'Mensaje académico indicando expresamente qué datos o contexto faltan para responder con precisión',
            },
            definition: {
              type: Type.STRING,
              description: 'Definición rigurosa y formal del concepto',
            },
            explanation: {
              type: Type.STRING,
              description: 'Explicación detallada del fundamento técnico, objetivos y consideraciones de ingeniería',
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Pasos ordenados secuencialmente para aplicar el concepto o flujo de ejecución, si aplica',
            },
            example: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING, description: 'Lenguaje de programación del ejemplo' },
                code: { type: Type.STRING, description: 'Código fuente limpio y didáctico con comentarios' },
                explanation: { type: Type.STRING, description: 'Explicación técnica del ejemplo de código' },
              },
              required: ['language', 'code', 'explanation'],
            },
            practicalRecommendation: {
              type: Type.STRING,
              description: 'Recomendación práctica y buenas prácticas de ingeniería para la industria',
            },
            verificationWarning: {
              type: Type.STRING,
              description:
                'Advertencia explícita sobre qué documentación oficial debe consultarse y qué aspectos dependen de la versión',
            },
            relatedConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de 3 a 5 conceptos afines que el estudiante debería investigar a continuación',
            },
            verifiedReferences: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Referencias canónicas o especificaciones oficiales reales (únicamente libros canónicos o estándares oficiales reales, sin inventar)',
            },
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
        },
      };

      const response = await generateContentWithFallback(prompt, config);
      const text = response.text;
      if (!text) {
        throw new Error('No se recibió contenido de respuesta del modelo.');
      }

      const parsedData = cleanAndParseJson<Record<string, any>>(text);
      const sanitizedData = sanitizeStructuredExplanation(parsedData, preferredLanguage);

      return res.json({ success: true, data: sanitizedData });
    } catch (error: unknown) {
      return sendSafeServerError(
        res,
        'Ocurrió un error al procesar la explicación académica con Gemini API.',
        error
      );
    }
  }
);

// Endpoint for conversational follow-ups (USER & ADMIN)
app.post(
  '/api/assist/chat',
  authenticateJWT,
  authorizeRole(['USER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // OWASP A03 (Injection): Validación y sanitización del arreglo de mensajes
      const validation = validateChatRequestBody(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const { messages, studentLevel, preferredLanguage } = validation.data;

      const formattedContents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: formattedContents,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: `${SYSTEM_INSTRUCTION}
Configuración actual:
- Nivel de estudiante: ${studentLevel}
- Lenguaje para código: ${preferredLanguage}
Siempre mantén el formato claro: Definición (si aplica), Explicación técnica, Ejemplo práctico y Recomendación práctica con advertencia de verificación. Si faltan datos o contexto, decláralo abiertamente.`,
          },
        });
      });

      return res.json({ success: true, reply: response.text || '' });
    } catch (error: unknown) {
      return sendSafeServerError(res, 'Error en la conversación académica con Gemini.', error);
    }
  }
);

// ============================================================================
// ADMIN-ONLY ROUTES: POST /api/assist/challenge, GET /api/admin/metrics
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

El desafío debe presentar:
1. Un escenario realista de software (ej. un problema de arquitectura, un fragmento de código que viola un principio SOLID, o un dilema de concurrencia).
2. La pregunta detonante para que el estudiante reflexione.
3. Tres o cuatro opciones de solución técnica con justificación.
4. La opción correcta con explicación detallada y recomendación práctica.`;

      const config = {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      };

      const response = await generateContentWithFallback(prompt, config);
      const text = response.text;
      if (!text) throw new Error('Respuesta vacía del modelo.');

      return res.json({ success: true, data: cleanAndParseJson(text) });
    } catch (error: unknown) {
      return sendSafeServerError(res, 'Error al generar el desafío técnico.', error);
    }
  }
);

app.get(
  '/api/admin/metrics',
  authenticateJWT,
  authorizeRole(['ADMIN']),
  (_req: AuthenticatedRequest, res: Response) => {
    return res.json({
      success: true,
      data: {
        uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
        totalRequests: metricsState.totalRequests,
        requestsByRole: { ...metricsState.requestsByRole },
        securityEvents: { ...metricsState.securityEvents },
        endpointHits: { ...metricsState.endpointHits },
        recentAuditLogs: [...metricsState.recentAuditLogs],
      },
    });
  }
);

// Global error handler (OWASP A04: evita filtrar stack traces en respuestas HTTP, incluyendo errores de CORS/JSON)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.message?.includes('CORS')) {
    return res.status(403).json({ success: false, error: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON malformado en el cuerpo de la petición.' });
  }
  return sendSafeServerError(res, 'Error interno del servidor.', err);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
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

    // Fallback for SPA routing in development
    app.use('*', async (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Ruta API no encontrada' });
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(transformedHtml);
        } else {
          return res.status(404).send(`Not Found: No se encontró index.html en ${indexPath}`);
        }
      } catch (err: any) {
        console.error('Error en enrutamiento:', err?.message);
        return res.status(500).send('Error interno del servidor');
      }
    });
  } else {
    const clientPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(clientPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(clientPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`IngenieroDocente Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();