import crypto from 'crypto';
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
  passphraseDigestHex: string;
  envOverrideKey: 'DEMO_ADMIN_PASSPHRASE' | 'DEMO_USER_PASSPHRASE';
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
export const MAX_PASSPHRASE_LENGTH = 128;

// OWASP A02:2023 – Cryptographic Failures:
// Runtime-generated fallback secret cached in memory when JWT_SECRET is not provided in environment.
// Avoids hardcoding static secret strings in source code.
let cachedRuntimeSecret: string | null = null;

// Precomputed SHA-256 digests for demo accounts so plaintext credentials are never hardcoded in source.
export const DEMO_USERS: readonly DemoUserRecord[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    passphraseDigestHex: '5cbe57894b74b17653c2debdddde82c88489635fc7aa14a94cc53c075b1aef3f',
    envOverrideKey: 'DEMO_ADMIN_PASSPHRASE',
    role: 'ADMIN',
    displayName: 'Administrator',
  },
  {
    id: 'usr-student-01',
    username: 'student',
    passphraseDigestHex: 'a0b8514a7f13d99d302dea7e4f7eb441a8a7eeea6e4ebe6efece4d743059b480',
    envOverrideKey: 'DEMO_USER_PASSPHRASE',
    role: 'USER',
    displayName: 'Student User',
  },
];

// OWASP A02:2023 – Cryptographic Failures: Retrieve JWT signing secret from environment variables.
export function getJwtSecret(envSecret: string | undefined = process.env.JWT_SECRET): string {
  if (typeof envSecret === 'string' && envSecret.trim().length >= 16) {
    return envSecret.trim();
  }
  if (!cachedRuntimeSecret) {
    cachedRuntimeSecret = crypto.randomBytes(32).toString('hex');
  }
  return cachedRuntimeSecret;
}

// OWASP A02:2023 – Cryptographic Failures: Constant-time SHA-256 digest verification.
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function verifyPassphraseDigest(candidate: string, expectedHexDigest: string): boolean {
  const candidateBuf = Buffer.from(sha256Hex(candidate), 'hex');
  const expectedBuf = Buffer.from(expectedHexDigest, 'hex');
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

// OWASP A03:2023 – Injection: Strip dangerous ASCII control characters and enforce maximum length.
export function sanitizeText(input: unknown, maxLength: number = MAX_QUERY_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Linear O(n) character filtering without backtracking regexes (ReDoS-safe)
  let cleaned = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const isAllowedControl = code === 9 || code === 10 || code === 13;
    const isPrintable = code >= 32 && code !== 127;
    if (isAllowedControl || isPrintable) {
      cleaned += input[i];
    }
  }
  cleaned = cleaned.trim();
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength);
  }
  return cleaned;
}

// OWASP A07:2023 – Identification and Authentication Failures: Authenticate user credentials or quick demo role.
export function authenticateCredentials(
  usernameInput: unknown,
  passphraseInput: unknown
):
  | { valid: true; user: { id: string; username: string; role: UserRole; displayName: string } }
  | { valid: false; error: string } {
  if (typeof usernameInput !== 'string' || typeof passphraseInput !== 'string') {
    return { valid: false, error: 'Invalid credential payload format.' };
  }

  const username = sanitizeText(usernameInput, MAX_USERNAME_LENGTH).toLowerCase();
  const passphrase = sanitizeText(passphraseInput, MAX_PASSPHRASE_LENGTH);

  if (!username || !passphrase) {
    return { valid: false, error: 'Username and password are required.' };
  }

  const matched = DEMO_USERS.find((u) => u.username === username);
  if (!matched) {
    return { valid: false, error: 'Invalid username or password.' };
  }

  const envPass = process.env[matched.envOverrideKey];
  const expectedDigest =
    typeof envPass === 'string' && envPass.trim().length > 0
      ? sha256Hex(envPass.trim())
      : matched.passphraseDigestHex;

  if (!verifyPassphraseDigest(passphrase, expectedDigest)) {
    return { valid: false, error: 'Invalid username or password.' };
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

export function authenticateDemoRole(
  roleInput: unknown
):
  | { valid: true; user: { id: string; username: string; role: UserRole; displayName: string } }
  | { valid: false; error: string } {
  if (roleInput !== 'ADMIN' && roleInput !== 'USER') {
    return { valid: false, error: 'Unsupported role specified.' };
  }
  const matched = DEMO_USERS.find((u) => u.role === roleInput);
  if (!matched) {
    return { valid: false, error: 'Demo account not found for specified role.' };
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

// OWASP A07:2023 – Identification and Authentication Failures: Sign short-lived JWT (default 1h).
export function generateJwtToken(
  user: { id: string; username: string; role: UserRole },
  secret: string = getJwtSecret(),
  expiresIn: jwt.SignOptions['expiresIn'] = '1h'
): string {
  if (!user || !user.id || !user.username || (user.role !== 'ADMIN' && user.role !== 'USER')) {
    throw new Error('Invalid user payload for JWT generation.');
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

// OWASP A01:2023 – Broken Access Control: Extract Bearer token safely from Authorization header.
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

// OWASP A07:2023 – Identification and Authentication Failures: Verify JWT signature, expiry, and RBAC claims.
export function verifyJwtToken(
  token: unknown,
  secret: string = getJwtSecret()
): { valid: true; payload: JwtUserPayload } | { valid: false; error: string } {
  if (typeof token !== 'string' || !token.trim()) {
    return { valid: false, error: 'Authentication token is missing.' };
  }

  try {
    const decoded = jwt.verify(token.trim(), secret);
    if (!decoded || typeof decoded === 'string') {
      return { valid: false, error: 'Invalid JWT payload structure.' };
    }

    const decodedRecord = decoded as Record<string, unknown>;
    const role = decodedRecord.role;
    const username = decodedRecord.username;
    const sub = decodedRecord.sub;

    if (
      typeof sub !== 'string' ||
      !sub ||
      typeof username !== 'string' ||
      !username ||
      (role !== 'ADMIN' && role !== 'USER')
    ) {
      return { valid: false, error: 'Invalid RBAC claims in JWT token.' };
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
      return { valid: false, error: 'JWT token has expired.' };
    }
    return { valid: false, error: 'Invalid or tampered JWT token.' };
  }
}

// OWASP A01:2023 – Broken Access Control: Strict RBAC role evaluation.
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

// OWASP A03:2023 – Injection: Validate login request body.
export function validateLoginBody(
  body: unknown
):
  | { valid: true; mode: 'credentials'; username: string; password: string }
  | { valid: true; mode: 'quickRole'; quickRole: UserRole }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Invalid JSON request body.' };
  }

  const record = body as Record<string, unknown>;
  if (record.quickRole !== undefined) {
    if (record.quickRole !== 'ADMIN' && record.quickRole !== 'USER') {
      return { valid: false, error: 'Invalid quickRole. Must be ADMIN or USER.' };
    }
    return { valid: true, mode: 'quickRole', quickRole: record.quickRole };
  }

  const username = sanitizeText(record.username, MAX_USERNAME_LENGTH);
  const password = sanitizeText(record.password, MAX_PASSPHRASE_LENGTH);

  if (!username || !password) {
    return { valid: false, error: 'Username and password are required.' };
  }

  return { valid: true, mode: 'credentials', username, password };
}

function normalizeStudentLevel(rawLevel: unknown): (typeof ALLOWED_STUDENT_LEVELS)[number] {
  if (
    typeof rawLevel === 'string' &&
    (ALLOWED_STUDENT_LEVELS as readonly string[]).includes(rawLevel)
  ) {
    return rawLevel as (typeof ALLOWED_STUDENT_LEVELS)[number];
  }
  return 'intermedio';
}

function normalizePreferredLanguage(rawLang: unknown): (typeof ALLOWED_LANGUAGES)[number] {
  if (
    typeof rawLang === 'string' &&
    (ALLOWED_LANGUAGES as readonly string[]).includes(rawLang)
  ) {
    return rawLang as (typeof ALLOWED_LANGUAGES)[number];
  }
  return 'typescript';
}

// OWASP A03:2023 – Injection: Validate and sanitize structured explanation request payload.
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
    return { valid: false, error: 'Invalid request body.' };
  }

  const record = body as Record<string, unknown>;
  const rawQuery = record.query;

  if (typeof rawQuery !== 'string') {
    return { valid: false, error: 'Query must be a valid text string.' };
  }

  const sanitizedQuery = sanitizeText(rawQuery, MAX_QUERY_LENGTH);
  if (!sanitizedQuery) {
    return { valid: false, error: 'Query cannot be empty.' };
  }

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
      studentLevel: normalizeStudentLevel(record.studentLevel),
      preferredLanguage: normalizePreferredLanguage(record.preferredLanguage),
      conversationContext,
    },
  };
}

// OWASP A03:2023 – Injection: Validate and sanitize challenge generation request payload.
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
    return { valid: false, error: 'Invalid request body.' };
  }

  const record = body as Record<string, unknown>;
  let topic = 'Patrones de Diseño';

  if (record.topic !== undefined) {
    if (typeof record.topic !== 'string') {
      return { valid: false, error: 'Topic must be a valid text string.' };
    }
    const sanitizedTopic = sanitizeText(record.topic, MAX_TOPIC_LENGTH);
    if (!sanitizedTopic) {
      return { valid: false, error: 'Topic cannot be empty.' };
    }
    topic = sanitizedTopic;
  }

  return {
    valid: true,
    data: {
      topic,
      studentLevel: normalizeStudentLevel(record.studentLevel),
    },
  };
}

// OWASP A03:2023 – Injection: Validate and sanitize multi-turn chat request payload.
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
    return { valid: false, error: 'Invalid request body.' };
  }

  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.messages) || record.messages.length === 0) {
    return { valid: false, error: 'Invalid or empty messages array.' };
  }

  if (record.messages.length > MAX_MESSAGES_COUNT) {
    return { valid: false, error: `Maximum ${MAX_MESSAGES_COUNT} messages allowed per request.` };
  }

  const sanitizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of record.messages) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return { valid: false, error: 'Invalid message item format.' };
    }
    const msgObj = msg as Record<string, unknown>;
    if (msgObj.role !== 'user' && msgObj.role !== 'assistant') {
      return { valid: false, error: 'Disallowed message role.' };
    }
    const content = sanitizeText(msgObj.content, MAX_MESSAGE_LENGTH);
    if (!content) {
      return { valid: false, error: 'Message content cannot be empty.' };
    }
    sanitizedMessages.push({ role: msgObj.role, content });
  }

  return {
    valid: true,
    data: {
      messages: sanitizedMessages,
      studentLevel: normalizeStudentLevel(record.studentLevel),
      preferredLanguage: normalizePreferredLanguage(record.preferredLanguage),
    },
  };
}

// OWASP A03:2023 – Injection & ReDoS Prevention: Strip markdown code fences without backtracking regexes.
export function cleanAndParseJson<T = Record<string, unknown>>(text: string): T {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Empty or invalid JSON payload.');
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7).trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3).trim();
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  return JSON.parse(cleaned) as T;
}

function getNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function sanitizeStructuredExplanation(
  parsedData: Record<string, unknown>,
  preferredLanguage: string = 'typescript'
) {
  const rawExample = parsedData.example;
  const exampleRecord =
    rawExample && typeof rawExample === 'object' && !Array.isArray(rawExample)
      ? (rawExample as Record<string, unknown>)
      : null;

  const hasValidExample =
    exampleRecord !== null &&
    typeof exampleRecord.code === 'string' &&
    exampleRecord.code.trim().length > 0;

  return {
    topic: getNonEmptyString(parsedData.topic, 'Concepto de Ingeniería de Software'),
    isInsufficientInfo: Boolean(parsedData.isInsufficientInfo),
    insufficientInfoNotice:
      typeof parsedData.insufficientInfoNotice === 'string'
        ? parsedData.insufficientInfoNotice
        : '',
    definition: getNonEmptyString(parsedData.definition, 'Definición no disponible.'),
    explanation: typeof parsedData.explanation === 'string' ? parsedData.explanation : '',
    steps: filterStringArray(parsedData.steps),
    example: hasValidExample && exampleRecord
      ? {
          language: getNonEmptyString(exampleRecord.language, preferredLanguage),
          code: exampleRecord.code as string,
          explanation: getNonEmptyString(
            exampleRecord.explanation,
            'Análisis del ejemplo práctico.'
          ),
        }
      : {
          language: preferredLanguage,
          code: '// Para generar un ejemplo de código específico, por favor incluye más contexto en tu consulta.',
          explanation:
            'Se requiere mayor contexto de implementación para proveer un ejemplo adecuado.',
        },
    practicalRecommendation: getNonEmptyString(
      parsedData.practicalRecommendation,
      'Consulta las especificaciones de diseño y convenciones del proyecto.'
    ),
    verificationWarning: getNonEmptyString(
      parsedData.verificationWarning,
      'Verifica la documentación técnica oficial del lenguaje y librerías utilizadas.'
    ),
    relatedConcepts: filterStringArray(parsedData.relatedConcepts),
    verifiedReferences: filterStringArray(parsedData.verifiedReferences),
  };
}
