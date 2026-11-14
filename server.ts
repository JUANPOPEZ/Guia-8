import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initializing GoogleGenAI with proper user agent header
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

// Exponential backoff retry wrapper to handle transient 503 / 429 spikes
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

function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

// Multi-model fallback runner to ensure 100% availability during regional demand spikes
async function generateContentWithFallback(prompt: string, config: any) {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      return await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config,
        })
      , 2, 800);
    } catch (err: any) {
      console.warn(`[Model Fallback] Modelo ${model} no disponible: ${err?.message || err}. Probando modelo alternativo...`);
      lastErr = err;
    }
  }
  throw lastErr;
}

// Endpoint for instant streaming response (starts rendering in <500ms via SSE)
app.post('/api/assist/stream', async (req, res) => {
  const { query, studentLevel = 'intermedio', preferredLanguage = 'typescript' } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'La consulta no puede estar vacía.' });
  }

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
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });
    } catch (e) {
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
    console.error('Error in /api/assist/stream:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Error en streaming' })}\n\n`);
    res.end();
  }
});

// Endpoint for structured pedagogical explanation (forces JSON matching the 4 required pillars)
app.post('/api/assist/structured', async (req, res) => {
  try {
    const { query, studentLevel = 'intermedio', preferredLanguage = 'typescript', conversationContext = [] } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'La consulta no puede estar vacía.' });
    }

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

    const config = {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
              topic: {
                type: Type.STRING,
                description: 'El tema o concepto principal analizado (ej: Principio de Responsabilidad Única, Patrón Factory, etc.)',
              },
              isInsufficientInfo: {
                type: Type.BOOLEAN,
                description: 'Verdadero si la consulta carece de detalles esenciales para responder responsablemente',
              },
              insufficientInfoNotice: {
                type: Type.STRING,
                description: 'Mensaje académico indicando expresamente qué datos o contexto faltan para responder con precisión',
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
                description: 'Advertencia explícita sobre qué documentación oficial debe consultarse y qué aspectos dependen de la versión',
              },
              relatedConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de 3 a 5 conceptos afines que el estudiante debería investigar a continuación',
              },
              verifiedReferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Referencias canónicas o especificaciones oficiales reales (únicamente libros canónicos o estándares oficiales reales, sin inventar)',
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

    const parsedData = cleanAndParseJson(text);

    // Sanitize and ensure complete structure
    const sanitizedData = {
      topic: parsedData.topic || 'Concepto de Ingeniería de Software',
      isInsufficientInfo: Boolean(parsedData.isInsufficientInfo),
      insufficientInfoNotice: parsedData.insufficientInfoNotice || '',
      definition: parsedData.definition || 'Definición no disponible.',
      explanation: parsedData.explanation || '',
      steps: Array.isArray(parsedData.steps) ? parsedData.steps : [],
      example: parsedData.example && parsedData.example.code ? {
        language: parsedData.example.language || preferredLanguage || 'typescript',
        code: parsedData.example.code,
        explanation: parsedData.example.explanation || 'Análisis del ejemplo práctico.',
      } : {
        language: preferredLanguage || 'typescript',
        code: '// Para generar un ejemplo de código específico, por favor incluye más contexto en tu consulta.',
        explanation: 'Se requiere mayor contexto de implementación para proveer un ejemplo adecuado.',
      },
      practicalRecommendation: parsedData.practicalRecommendation || 'Consulta las especificaciones de diseño y convenciones del proyecto.',
      verificationWarning: parsedData.verificationWarning || 'Verifica la documentación técnica oficial del lenguaje y librerías utilizadas.',
      relatedConcepts: Array.isArray(parsedData.relatedConcepts) ? parsedData.relatedConcepts : [],
      verifiedReferences: Array.isArray(parsedData.verifiedReferences) ? parsedData.verifiedReferences : [],
    };

    return res.json({ success: true, data: sanitizedData });
  } catch (error: any) {
    console.error('Error in /api/assist/structured:', error);
    return res.status(500).json({
      error: 'Ocurrió un error al procesar la explicación académica con Gemini API.',
      details: error?.message || 'Error desconocido',
    });
  }
});

// Endpoint for student evaluation challenge / quiz generator
app.post('/api/assist/challenge', async (req, res) => {
  try {
    const { topic = 'Patrones de Diseño', studentLevel = 'intermedio' } = req.body;

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
  } catch (error: any) {
    console.error('Error in /api/assist/challenge:', error);
    return res.status(500).json({
      error: 'Error al generar el desafío técnico.',
      details: error?.message,
    });
  }
});

// Endpoint for conversational follow-ups
app.post('/api/assist/chat', async (req, res) => {
  try {
    const { messages, studentLevel = 'intermedio', preferredLanguage = 'typescript' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Lista de mensajes inválida.' });
    }

    const formattedContents = messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
  } catch (error: any) {
    console.error('Error in /api/assist/chat:', error);
    return res.status(500).json({
      error: 'Error en la conversación académica con Gemini.',
      details: error?.message,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
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
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Ruta API no encontrada' });
      }
      try {
        // Usamos process.cwd() para garantizar la ruta absoluta de la raíz en la nube
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(transformedHtml);
        } else {
          return res.status(404).send(`Not Found: No se encontró index.html en ${indexPath}`);
        }
      } catch (err: any) {
        console.error('Error en enrutamiento:', err);
        return res.status(500).send('Error interno del servidor');
      }
    });
  } else {
    // Modo producción
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