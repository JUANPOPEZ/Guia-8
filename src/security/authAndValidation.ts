import jwt from 'jsonwebtoken';

export type UserRole = 'ADMIN' | 'USER';

export interface JwtUserPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface DemoUserRecord {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export const ALLOWED_STUDENT_LEVELS = ['principiante', 'intermedio', 'avanzado'] as const;
export const ALLOWED_LANGUAGES = [
  'typescript',
  'python',
  'java',
  'csharp',
  'go',
  'cpp',
  'sql',
  'rust',
] as const;

export const MAX_QUERY_LENGTH = 4000;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_MESSAGES_COUNT = 20;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CONTEXT_ITEMS = 6;
export const MAX_USERNAME_LENGTH = 64;
export const MAX_PASSWORD_LENGTH = 128;

const DEV_JWT_FALLBACK_SECRET = 'ingenierodocente-dev-jwt-secret-key-2026';

export const DEMO_USERS: readonly DemoUserRecord[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    password: 'AdminPassword2026!',
    role: 'ADMIN',
    displayName: 'Docente Administrador',
  },
  {
    id: 'usr-student-01',
    username: 'student',
    password: 'StudentPassword2026!',
    role: 'USER',
    displayName: 'Estudiante Universitario',
  },
];

export function getJwtSecret(envSecret: string | undefined = process.env.JWT_SECRET): string {
  if (typeof envSecret === 'string' && envSecret.trim().length >= 16) {
    return envSecret.trim();
  }
  return DEV_JWT_FALLBACK_SECRET;
}

export function sanitizeText(input: unknown, maxLength: number = MAX_QUERY_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Strip null bytes and ASCII control characters except tab, LF, CR
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength);
  }
  return cleaned;
}

export function authenticateCredentials(
  usernameInput: unknown,
  passwordInput: unknown
): { valid: true; user: { id: string; username: string; role: UserRole; displayName: string } } | { valid: false; error: string } {
  if (typeof usernameInput !== 'string' || typeof passwordInput !== 'string') {
    return { valid: false, error: 'Credenciales con formato inválido.' };
  }

  const username = sanitizeText(usernameInput, MAX_USERNAME_LENGTH).toLowerCase();
  const password = sanitizeText(passwordInput, MAX_PASSWORD_LENGTH);

  if (!username || !password) {
    return { valid: false, error: 'Usuario y contraseña requeridos.' };
  }

  const matched = DEMO_USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!matched) {
    return { valid: false, error: 'Credenciales inválidas.' };
  }

  return {
    valid: true,
    user: {
      id: matched.id,
      username: matched.username,
      role: matched.role,
      displayName: matched.displayName,
    },
  };
}

export function generateJwtToken(
  user: { id: string; username: string; role: UserRole },
  secret: string = getJwtSecret(),
  expiresIn: jwt.SignOptions['expiresIn'] = '1h'
): string {
  if (!user || !user.id || !user.username || (user.role !== 'ADMIN' && user.role !== 'USER')) {
    throw new Error('Payload de usuario inválido para generar JWT.');
  }

  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

export function extractBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string') {
    return null;
  }
  const trimmed = authHeader.trim();
  if (!trimmed.startsWith('Bearer ')) {
    return null;
  }
  const token = trimmed.slice(7).trim();
  if (!token || token.includes(' ')) {
    return null;
  }
  return token;
}

export function verifyJwtToken(
  token: unknown,
  secret: string = getJwtSecret()
): { valid: true; payload: JwtUserPayload } | { valid: false; error: string } {
  if (typeof token !== 'string' || !token.trim()) {
    return { valid: false, error: 'Token de autenticación ausente.' };
  }

  try {
    const decoded = jwt.verify(token.trim(), secret);
    if (!decoded || typeof decoded === 'string') {
      return { valid: false, error: 'Estructura de token JWT inválida.' };
    }

    const role = (decoded as Record<string, unknown>).role;
    const username = (decoded as Record<string, unknown>).username;
    const sub = (decoded as Record<string, unknown>).sub;

    if (
      typeof sub !== 'string' ||
      !sub ||
      typeof username !== 'string' ||
      !username ||
      (role !== 'ADMIN' && role !== 'USER')
    ) {
      return { valid: false, error: 'Claims RBAC inválidos en el token.' };
    }

    return {
      valid: true,
      payload: {
        sub,
        username,
        role,
        iat: typeof decoded.iat === 'number' ? decoded.iat : undefined,
        exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
      },
    };
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token JWT expirado.' };
    }
    return { valid: false, error: 'Token JWT inválido o firma corrupta.' };
  }
}

export function hasRequiredRole(
  userRole: unknown,
  allowedRoles: readonly UserRole[]
): boolean {
  if (userRole !== 'ADMIN' && userRole !== 'USER') {
    return false;
  }
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.includes(userRole);
}

export function validateLoginBody(
  body: unknown
): { valid: true; username: string; password: string } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Cuerpo de solicitud JSON inválido.' };
  }

  const record = body as Record<string, unknown>;
  const username = sanitizeText(record.username, MAX_USERNAME_LENGTH);
  const password = sanitizeText(record.password, MAX_PASSWORD_LENGTH);

  if (!username || !password) {
    return { valid: false, error: 'Debes proporcionar usuario y contraseña.' };
  }

  return { valid: true, username, password };
}

export function validateStructuredRequestBody(body: unknown):
  | {
      valid: true;
      data: {
        query: string;
        studentLevel: (typeof ALLOWED_STUDENT_LEVELS)[number];
        preferredLanguage: (typeof ALLOWED_LANGUAGES)[number];
        conversationContext: string[];
      };
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Cuerpo de solicitud inválido.' };
  }

  const record = body as Record<string, unknown>;
  const rawQuery = record.query;

  if (typeof rawQuery !== 'string') {
    return { valid: false, error: 'La consulta debe ser una cadena de texto válida.' };
  }

  const sanitizedQuery = sanitizeText(rawQuery, MAX_QUERY_LENGTH);
  if (!sanitizedQuery) {
    return { valid: false, error: 'La consulta no puede estar vacía.' };
  }

  const rawLevel = record.studentLevel;
  const studentLevel =
    typeof rawLevel === 'string' &&
    (ALLOWED_STUDENT_LEVELS as readonly string[]).includes(rawLevel)
      ? (rawLevel as (typeof ALLOWED_STUDENT_LEVELS)[number])
      : 'intermedio';

  const rawLang = record.preferredLanguage;
  const preferredLanguage =
    typeof rawLang === 'string' &&
    (ALLOWED_LANGUAGES as readonly string[]).includes(rawLang)
      ? (rawLang as (typeof ALLOWED_LANGUAGES)[number])
      : 'typescript';

  let conversationContext: string[] = [];
  if (Array.isArray(record.conversationContext)) {
    conversationContext = record.conversationContext
      .slice(-MAX_CONTEXT_ITEMS)
      .map((item) => sanitizeText(typeof item === 'string' ? item : JSON.stringify(item), 500))
      .filter((item) => item.length > 0);
  }

  return {
    valid: true,
    data: {
      query: sanitizedQuery,
      studentLevel,
      preferredLanguage,
      conversationContext,
    },
  };
}

export function validateChallengeRequestBody(body: unknown):
  | {
      valid: true;
      data: {
        topic: string;
        studentLevel: (typeof ALLOWED_STUDENT_LEVELS)[number];
      };
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Cuerpo de solicitud inválido.' };
  }

  const record = body as Record<string, unknown>;
  let topic = 'Patrones de Diseño';

  if (record.topic !== undefined) {
    if (typeof record.topic !== 'string') {
      return { valid: false, error: 'El tema debe ser una cadena de texto válida.' };
    }
    const sanitizedTopic = sanitizeText(record.topic, MAX_TOPIC_LENGTH);
    if (!sanitizedTopic) {
      return { valid: false, error: 'El tema no puede estar vacío.' };
    }
    topic = sanitizedTopic;
  }

  const rawLevel = record.studentLevel;
  const studentLevel =
    typeof rawLevel === 'string' &&
    (ALLOWED_STUDENT_LEVELS as readonly string[]).includes(rawLevel)
      ? (rawLevel as (typeof ALLOWED_STUDENT_LEVELS)[number])
      : 'intermedio';

  return {
    valid: true,
    data: { topic, studentLevel },
  };
}

export function validateChatRequestBody(body: unknown):
  | {
      valid: true;
      data: {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        studentLevel: (typeof ALLOWED_STUDENT_LEVELS)[number];
        preferredLanguage: (typeof ALLOWED_LANGUAGES)[number];
      };
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Cuerpo de solicitud inválido.' };
  }

  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.messages) || record.messages.length === 0) {
    return { valid: false, error: 'Lista de mensajes inválida.' };
  }

  if (record.messages.length > MAX_MESSAGES_COUNT) {
    return { valid: false, error: `Máximo ${MAX_MESSAGES_COUNT} mensajes por consulta.` };
  }

  const sanitizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of record.messages) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return { valid: false, error: 'Formato de mensaje inválido.' };
    }
    const msgObj = msg as Record<string, unknown>;
    if (msgObj.role !== 'user' && msgObj.role !== 'assistant') {
      return { valid: false, error: 'Rol de mensaje no permitido.' };
    }
    const content = sanitizeText(msgObj.content, MAX_MESSAGE_LENGTH);
    if (!content) {
      return { valid: false, error: 'Contenido de mensaje vacío o inválido.' };
    }
    sanitizedMessages.push({ role: msgObj.role, content });
  }

  const rawLevel = record.studentLevel;
  const studentLevel =
    typeof rawLevel === 'string' &&
    (ALLOWED_STUDENT_LEVELS as readonly string[]).includes(rawLevel)
      ? (rawLevel as (typeof ALLOWED_STUDENT_LEVELS)[number])
      : 'intermedio';

  const rawLang = record.preferredLanguage;
  const preferredLanguage =
    typeof rawLang === 'string' &&
    (ALLOWED_LANGUAGES as readonly string[]).includes(rawLang)
      ? (rawLang as (typeof ALLOWED_LANGUAGES)[number])
      : 'typescript';

  return {
    valid: true,
    data: {
      messages: sanitizedMessages,
      studentLevel,
      preferredLanguage,
    },
  };
}

export function cleanAndParseJson<T = Record<string, unknown>>(text: string): T {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Texto JSON vacío o inválido.');
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  return JSON.parse(cleaned) as T;
}

export function sanitizeStructuredExplanation(
  parsedData: Record<string, any>,
  preferredLanguage: string = 'typescript'
) {
  const exampleObj = parsedData?.example;
  const hasValidExample =
    exampleObj && typeof exampleObj === 'object' && typeof exampleObj.code === 'string' && exampleObj.code.trim().length > 0;

  return {
    topic:
      typeof parsedData?.topic === 'string' && parsedData.topic.trim()
        ? parsedData.topic.trim()
        : 'Concepto de Ingeniería de Software',
    isInsufficientInfo: Boolean(parsedData?.isInsufficientInfo),
    insufficientInfoNotice:
      typeof parsedData?.insufficientInfoNotice === 'string'
        ? parsedData.insufficientInfoNotice
        : '',
    definition:
      typeof parsedData?.definition === 'string' && parsedData.definition.trim()
        ? parsedData.definition
        : 'Definición no disponible.',
    explanation:
      typeof parsedData?.explanation === 'string' ? parsedData.explanation : '',
    steps: Array.isArray(parsedData?.steps)
      ? parsedData.steps.filter((s): s is string => typeof s === 'string')
      : [],
    example: hasValidExample
      ? {
          language:
            typeof exampleObj.language === 'string' && exampleObj.language.trim()
              ? exampleObj.language
              : preferredLanguage,
          code: exampleObj.code,
          explanation:
            typeof exampleObj.explanation === 'string' && exampleObj.explanation.trim()
              ? exampleObj.explanation
              : 'Análisis del ejemplo práctico.',
        }
      : {
          language: preferredLanguage,
          code: '// Para generar un ejemplo de código específico, por favor incluye más contexto en tu consulta.',
          explanation:
            'Se requiere mayor contexto de implementación para proveer un ejemplo adecuado.',
        },
    practicalRecommendation:
      typeof parsedData?.practicalRecommendation === 'string' &&
      parsedData.practicalRecommendation.trim()
        ? parsedData.practicalRecommendation
        : 'Consulta las especificaciones de diseño y convenciones del proyecto.',
    verificationWarning:
      typeof parsedData?.verificationWarning === 'string' &&
      parsedData.verificationWarning.trim()
        ? parsedData.verificationWarning
        : 'Verifica la documentación técnica oficial del lenguaje y librerías utilizadas.',
    relatedConcepts: Array.isArray(parsedData?.relatedConcepts)
      ? parsedData.relatedConcepts.filter((c): c is string => typeof c === 'string')
      : [],
    verifiedReferences: Array.isArray(parsedData?.verifiedReferences)
      ? parsedData.verifiedReferences.filter((r): r is string => typeof r === 'string')
      : [],
  };
}
