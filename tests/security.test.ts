import crypto from 'crypto';
import { describe, it, expect, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  ALLOWED_LANGUAGES,
  ALLOWED_STUDENT_LEVELS,
  MAX_CONTEXT_ITEMS,
  MAX_MESSAGES_COUNT,
  MAX_QUERY_LENGTH,
  MAX_TOPIC_LENGTH,
  authenticateCredentials,
  authenticateDemoRole,
  cleanAndParseJson,
  extractBearerToken,
  generateJwtToken,
  getJwtSecret,
  hasRequiredRole,
  sanitizeStructuredExplanation,
  sanitizeText,
  sha256Hex,
  validateChallengeRequestBody,
  validateChatRequestBody,
  validateLoginBody,
  validateStructuredRequestBody,
  verifyJwtToken,
  verifyPassphraseDigest,
} from '../src/security/authAndValidation';

describe('Security Module: JWT, RBAC & OWASP Input Validation', () => {
  const TEST_SECRET = crypto.randomBytes(32).toString('hex');

  afterEach(() => {
    delete process.env.DEMO_ADMIN_PASSPHRASE;
    delete process.env.DEMO_USER_PASSPHRASE;
  });

  describe('getJwtSecret', () => {
    it('returns trimmed environment secret when length >= 16', () => {
      expect(getJwtSecret('  1234567890123456  ')).toBe('1234567890123456');

      const originalEnvSecret = process.env.JWT_SECRET;
      const dynamicEnvSecret = crypto.randomBytes(16).toString('hex');
      process.env.JWT_SECRET = dynamicEnvSecret;
      try {
        expect(getJwtSecret()).toBe(dynamicEnvSecret);
      } finally {
        if (originalEnvSecret === undefined) {
          delete process.env.JWT_SECRET;
        } else {
          process.env.JWT_SECRET = originalEnvSecret;
        }
      }
    });

    it('generates and caches a runtime cryptographic fallback when undefined, empty, or too short', () => {
      const fallback1 = getJwtSecret(undefined);
      const fallback2 = getJwtSecret('');
      const fallback3 = getJwtSecret('short-secret');
      expect(fallback1.length).toBeGreaterThanOrEqual(32);
      expect(fallback2).toBe(fallback1);
      expect(fallback3).toBe(fallback1);
    });
  });

  describe('verifyPassphraseDigest', () => {
    it('returns true for matching digest and false for mismatched or malformed digest', () => {
      const expected = sha256Hex('valid-pass');
      expect(verifyPassphraseDigest('valid-pass', expected)).toBe(true);
      expect(verifyPassphraseDigest('wrong-pass', expected)).toBe(false);
      expect(verifyPassphraseDigest('valid-pass', 'abcd')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('trims whitespace and removes dangerous ASCII control characters while keeping newlines/tabs', () => {
      const raw = '  Hello\x00World\x07!\nSecond\tline\x1F\x7F  ';
      expect(sanitizeText(raw)).toBe('HelloWorld!\nSecond\tline');
    });

    it('returns empty string for non-string values', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(12345)).toBe('');
      expect(sanitizeText({})).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });

    it('truncates text exceeding maxLength', () => {
      const longStr = 'a'.repeat(50);
      expect(sanitizeText(longStr, 10)).toBe('aaaaaaaaaa');
      expect(sanitizeText('exact', 5)).toBe('exact');
    });
  });

  describe('authenticateCredentials & authenticateDemoRole', () => {
    it('authenticates valid ADMIN credentials via env override', () => {
      const dynamicAdminPass = crypto.randomUUID();
      process.env.DEMO_ADMIN_PASSPHRASE = dynamicAdminPass;
      const res = authenticateCredentials('  ADMIN ', dynamicAdminPass);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.user.username).toBe('admin');
        expect(res.user.role).toBe('ADMIN');
        expect(res.user.id).toBe('usr-admin-01');
      }
    });

    it('authenticates valid USER credentials via env override', () => {
      const dynamicUserPass = crypto.randomUUID();
      process.env.DEMO_USER_PASSPHRASE = dynamicUserPass;
      const res = authenticateCredentials('student', dynamicUserPass);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.user.username).toBe('student');
        expect(res.user.role).toBe('USER');
      }
    });

    it('rejects wrong password or unknown username', () => {
      const badPass = authenticateCredentials('admin', crypto.randomUUID());
      expect(badPass.valid).toBe(false);
      if (!badPass.valid) {
        expect(badPass.error).toContain('Invalid');
      }

      const unknownUser = authenticateCredentials('unknown', crypto.randomUUID());
      expect(unknownUser.valid).toBe(false);
      if (!unknownUser.valid) {
        expect(unknownUser.error).toContain('Invalid');
      }
    });

    it('rejects non-string or empty credentials', () => {
      expect(authenticateCredentials(123, 'abc').valid).toBe(false);
      expect(authenticateCredentials('admin', null).valid).toBe(false);
      const empty = authenticateCredentials('   ', '');
      expect(empty.valid).toBe(false);
      if (!empty.valid) {
        expect(empty.error).toContain('required');
      }
    });

    it('authenticates demo roles ADMIN and USER and rejects unsupported roles', () => {
      const adminRes = authenticateDemoRole('ADMIN');
      expect(adminRes.valid).toBe(true);
      if (adminRes.valid) {
        expect(adminRes.user.role).toBe('ADMIN');
      }

      const userRes = authenticateDemoRole('USER');
      expect(userRes.valid).toBe(true);
      if (userRes.valid) {
        expect(userRes.user.role).toBe('USER');
      }

      const badRole = authenticateDemoRole('GUEST');
      expect(badRole.valid).toBe(false);
    });
  });

  describe('generateJwtToken & verifyJwtToken', () => {
    it('generates and verifies a valid ADMIN token', () => {
      const token = generateJwtToken(
        { id: 'u1', username: 'admin', role: 'ADMIN' },
        TEST_SECRET,
        '1h'
      );
      const result = verifyJwtToken(token, TEST_SECRET);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.sub).toBe('u1');
        expect(result.payload.username).toBe('admin');
        expect(result.payload.role).toBe('ADMIN');
        expect(typeof result.payload.exp).toBe('number');
        expect(typeof result.payload.iat).toBe('number');
      }
    });

    it('generates and verifies a valid USER token', () => {
      const token = generateJwtToken(
        { id: 'u2', username: 'student', role: 'USER' },
        TEST_SECRET
      );
      const result = verifyJwtToken(token, TEST_SECRET);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.role).toBe('USER');
      }
    });

    it('throws when generating token with invalid user payload', () => {
      expect(() =>
        generateJwtToken({ id: '', username: 'admin', role: 'ADMIN' }, TEST_SECRET)
      ).toThrow();
      expect(() =>
        generateJwtToken({ id: 'u1', username: '', role: 'USER' }, TEST_SECRET)
      ).toThrow();
      expect(() =>
        generateJwtToken({ id: 'u1', username: 'x', role: 'GUEST' as never }, TEST_SECRET)
      ).toThrow();
    });

    it('rejects expired JWT tokens', () => {
      const expiredToken = jwt.sign(
        { sub: 'u1', username: 'admin', role: 'ADMIN' },
        TEST_SECRET,
        { algorithm: 'HS256', expiresIn: -10 }
      );
      const result = verifyJwtToken(expiredToken, TEST_SECRET);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('expired');
      }
    });

    it('rejects tokens signed with wrong secret, disallowed algorithm, or corrupted signature', () => {
      const token = generateJwtToken(
        { id: 'u1', username: 'admin', role: 'ADMIN' },
        TEST_SECRET
      );
      const otherSecret = crypto.randomBytes(32).toString('hex');
      const result = verifyJwtToken(token, otherSecret);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Invalid');
      }

      const hs512Token = jwt.sign(
        { sub: 'u1', username: 'admin', role: 'ADMIN' },
        TEST_SECRET,
        { algorithm: 'HS512', expiresIn: '1h' }
      );
      expect(verifyJwtToken(hs512Token, TEST_SECRET).valid).toBe(false);
    });

    it('rejects empty, non-string, or missing-claims tokens', () => {
      expect(verifyJwtToken('', TEST_SECRET).valid).toBe(false);
      expect(verifyJwtToken('   ', TEST_SECRET).valid).toBe(false);
      expect(verifyJwtToken(null, TEST_SECRET).valid).toBe(false);

      const stringPayloadToken = jwt.sign('plain-string-payload', TEST_SECRET, {
        algorithm: 'HS256',
      });
      expect(verifyJwtToken(stringPayloadToken, TEST_SECRET).valid).toBe(false);

      const invalidClaimsToken = jwt.sign(
        { sub: 'u1', username: 'test', role: 'SUPERUSER' },
        TEST_SECRET,
        { algorithm: 'HS256' }
      );
      const claimsRes = verifyJwtToken(invalidClaimsToken, TEST_SECRET);
      expect(claimsRes.valid).toBe(false);
      if (!claimsRes.valid) {
        expect(claimsRes.error).toContain('RBAC');
      }

      const missingSubToken = jwt.sign({ username: 'test', role: 'USER' }, TEST_SECRET, {
        algorithm: 'HS256',
      });
      expect(verifyJwtToken(missingSubToken, TEST_SECRET).valid).toBe(false);
    });
  });

  describe('extractBearerToken', () => {
    it('extracts token from valid Bearer header', () => {
      expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
      expect(extractBearerToken('  Bearer   xyz123  ')).toBe('xyz123');
    });

    it('returns null for invalid, missing, or malformed headers', () => {
      expect(extractBearerToken(undefined)).toBeNull();
      expect(extractBearerToken(123)).toBeNull();
      expect(extractBearerToken('Basic abc123')).toBeNull();
      expect(extractBearerToken('Bearer ')).toBeNull();
      expect(extractBearerToken('Bearer token with spaces')).toBeNull();
    });
  });

  describe('hasRequiredRole (RBAC)', () => {
    it('returns true when role is included in allowedRoles', () => {
      expect(hasRequiredRole('ADMIN', ['ADMIN'])).toBe(true);
      expect(hasRequiredRole('USER', ['USER', 'ADMIN'])).toBe(true);
      expect(hasRequiredRole('ADMIN', ['USER', 'ADMIN'])).toBe(true);
    });

    it('returns false for unauthorized roles, invalid roles, or empty allowedRoles', () => {
      expect(hasRequiredRole('USER', ['ADMIN'])).toBe(false);
      expect(hasRequiredRole('GUEST', ['USER', 'ADMIN'])).toBe(false);
      expect(hasRequiredRole(undefined, ['USER'])).toBe(false);
      expect(hasRequiredRole('ADMIN', [])).toBe(false);
    });
  });

  describe('validateLoginBody', () => {
    it('accepts valid credentials login body and quickRole body', () => {
      const res = validateLoginBody({ username: ' admin ', password: ' secret ' });
      expect(res.valid).toBe(true);
      if (res.valid && res.mode === 'credentials') {
        expect(res.username).toBe('admin');
        expect(res.password).toBe('secret');
      }

      const quickRes = validateLoginBody({ quickRole: 'USER' });
      expect(quickRes.valid).toBe(true);
      if (quickRes.valid && quickRes.mode === 'quickRole') {
        expect(quickRes.quickRole).toBe('USER');
      }
    });

    it('rejects malformed, invalid quickRole, or incomplete login bodies', () => {
      expect(validateLoginBody(null).valid).toBe(false);
      expect(validateLoginBody([]).valid).toBe(false);
      expect(validateLoginBody('str').valid).toBe(false);
      expect(validateLoginBody({ quickRole: 'ROOT' }).valid).toBe(false);
      expect(validateLoginBody({ username: '', password: '123' }).valid).toBe(false);
      expect(validateLoginBody({ username: 'admin', password: '   ' }).valid).toBe(false);
    });
  });

  describe('validateStructuredRequestBody', () => {
    it('validates and sanitizes valid structured request with context', () => {
      const res = validateStructuredRequestBody({
        query: '  What is SOLID?\x00 ',
        studentLevel: 'avanzado',
        preferredLanguage: 'rust',
        conversationContext: ['1', '2', '3', '4', '5', '6', '7', { topic: 'SRP' }, '   '],
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.data.query).toBe('What is SOLID?');
        expect(res.data.studentLevel).toBe('avanzado');
        expect(res.data.preferredLanguage).toBe('rust');
        expect(res.data.conversationContext.length).toBeLessThanOrEqual(MAX_CONTEXT_ITEMS);
        expect(res.data.conversationContext).not.toContain('');
      }
    });

    it('defaults invalid studentLevel and preferredLanguage safely', () => {
      const res = validateStructuredRequestBody({
        query: 'Strategy Pattern',
        studentLevel: 'phd',
        preferredLanguage: 'unknown',
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(ALLOWED_STUDENT_LEVELS).toContain(res.data.studentLevel);
        expect(res.data.studentLevel).toBe('intermedio');
        expect(ALLOWED_LANGUAGES).toContain(res.data.preferredLanguage);
        expect(res.data.preferredLanguage).toBe('typescript');
      }
    });

    it('enforces MAX_QUERY_LENGTH and rejects empty/non-string queries or invalid bodies', () => {
      expect(validateStructuredRequestBody(null).valid).toBe(false);
      expect(validateStructuredRequestBody([]).valid).toBe(false);
      expect(validateStructuredRequestBody({ query: 123 }).valid).toBe(false);
      expect(validateStructuredRequestBody({ query: '   ' }).valid).toBe(false);

      const oversized = validateStructuredRequestBody({ query: 'x'.repeat(MAX_QUERY_LENGTH + 100) });
      expect(oversized.valid).toBe(true);
      if (oversized.valid) {
        expect(oversized.data.query.length).toBe(MAX_QUERY_LENGTH);
      }
    });
  });

  describe('validateChallengeRequestBody', () => {
    it('accepts valid topic and defaults omitted topic', () => {
      const withTopic = validateChallengeRequestBody({
        topic: '  Go Concurrency ',
        studentLevel: 'principiante',
      });
      expect(withTopic.valid).toBe(true);
      if (withTopic.valid) {
        expect(withTopic.data.topic).toBe('Go Concurrency');
        expect(withTopic.data.studentLevel).toBe('principiante');
      }

      const defaultTopic = validateChallengeRequestBody({});
      expect(defaultTopic.valid).toBe(true);
      if (defaultTopic.valid) {
        expect(defaultTopic.data.topic).toBe('Patrones de Diseño');
        expect(defaultTopic.data.studentLevel).toBe('intermedio');
      }
    });

    it('rejects invalid bodies, non-string topic, or empty topic string, and truncates long topics', () => {
      expect(validateChallengeRequestBody(null).valid).toBe(false);
      expect(validateChallengeRequestBody([]).valid).toBe(false);
      expect(validateChallengeRequestBody({ topic: 42 }).valid).toBe(false);
      expect(validateChallengeRequestBody({ topic: '   ' }).valid).toBe(false);

      const longTopic = validateChallengeRequestBody({ topic: 't'.repeat(MAX_TOPIC_LENGTH + 50) });
      expect(longTopic.valid).toBe(true);
      if (longTopic.valid) {
        expect(longTopic.data.topic.length).toBe(MAX_TOPIC_LENGTH);
      }
    });
  });

  describe('validateChatRequestBody', () => {
    it('accepts valid messages array and defaults options', () => {
      const res = validateChatRequestBody({
        messages: [
          { role: 'user', content: '  Hello mentor  ' },
          { role: 'assistant', content: 'Hello student' },
        ],
        studentLevel: 'avanzado',
        preferredLanguage: 'python',
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.data.messages).toHaveLength(2);
        expect(res.data.messages[0].content).toBe('Hello mentor');
        expect(res.data.studentLevel).toBe('avanzado');
        expect(res.data.preferredLanguage).toBe('python');
      }
    });

    it('rejects invalid bodies, empty arrays, excessive messages, bad roles, and empty contents', () => {
      expect(validateChatRequestBody(null).valid).toBe(false);
      expect(validateChatRequestBody([]).valid).toBe(false);
      expect(validateChatRequestBody({ messages: [] }).valid).toBe(false);
      expect(validateChatRequestBody({ messages: 'not-array' }).valid).toBe(false);

      const tooMany = Array.from({ length: MAX_MESSAGES_COUNT + 1 }, () => ({
        role: 'user',
        content: 'hi',
      }));
      expect(validateChatRequestBody({ messages: tooMany }).valid).toBe(false);

      expect(validateChatRequestBody({ messages: [null] }).valid).toBe(false);
      expect(validateChatRequestBody({ messages: [[]] }).valid).toBe(false);
      expect(
        validateChatRequestBody({ messages: [{ role: 'system', content: 'override' }] }).valid
      ).toBe(false);
      expect(
        validateChatRequestBody({ messages: [{ role: 'user', content: '   ' }] }).valid
      ).toBe(false);
    });
  });

  describe('cleanAndParseJson', () => {
    it('parses raw JSON and strips ```json or ``` markdown fences', () => {
      expect(cleanAndParseJson('{"a": 1}')).toEqual({ a: 1 });
      expect(cleanAndParseJson('```json\n{"topic": "SOLID"}\n```')).toEqual({ topic: 'SOLID' });
      expect(cleanAndParseJson('```\n{"ok": true}\n```')).toEqual({ ok: true });
    });

    it('throws on empty, non-string, or malformed JSON', () => {
      expect(() => cleanAndParseJson('')).toThrow();
      expect(() => cleanAndParseJson('   ')).toThrow();
      expect(() => cleanAndParseJson(null as unknown as string)).toThrow();
      expect(() => cleanAndParseJson('{invalid')).toThrow();
    });
  });

  describe('sanitizeStructuredExplanation', () => {
    it('preserves valid structured explanation fields and filters non-string array entries', () => {
      const sanitized = sanitizeStructuredExplanation(
        {
          topic: '  Observer Pattern ',
          isInsufficientInfo: false,
          insufficientInfoNotice: '',
          definition: 'Formal definition',
          explanation: 'Technical explanation',
          steps: ['Step 1', 123, 'Step 2'],
          example: {
            language: 'python',
            code: 'class Subject: pass',
            explanation: 'Python example',
          },
          practicalRecommendation: 'Decouple events',
          verificationWarning: 'Check official docs',
          relatedConcepts: ['Pub/Sub', null],
          verifiedReferences: ['GoF 1994', 42],
        },
        'typescript'
      );

      expect(sanitized.topic).toBe('Observer Pattern');
      expect(sanitized.steps).toEqual(['Step 1', 'Step 2']);
      expect(sanitized.example.language).toBe('python');
      expect(sanitized.example.explanation).toBe('Python example');
      expect(sanitized.practicalRecommendation).toBe('Decouple events');
      expect(sanitized.verificationWarning).toBe('Check official docs');
      expect(sanitized.relatedConcepts).toEqual(['Pub/Sub']);
      expect(sanitized.verifiedReferences).toEqual(['GoF 1994']);
    });

    it('provides safe defaults when fields are missing or malformed', () => {
      const sanitized = sanitizeStructuredExplanation(
        {
          isInsufficientInfo: 1,
          example: { code: '   ' },
          practicalRecommendation: '   ',
          verificationWarning: '   ',
        },
        'java'
      );

      expect(sanitized.topic).toBe('Concepto de Ingeniería de Software');
      expect(sanitized.isInsufficientInfo).toBe(true);
      expect(sanitized.definition).toBe('Definición no disponible.');
      expect(sanitized.example.language).toBe('java');
      expect(sanitized.example.code).toContain('contexto');
      expect(sanitized.practicalRecommendation).toContain('especificaciones');
      expect(sanitized.verificationWarning).toContain('documentación técnica');
      expect(sanitized.steps).toEqual([]);
      expect(sanitized.relatedConcepts).toEqual([]);
      expect(sanitized.verifiedReferences).toEqual([]);
    });
  });
});
