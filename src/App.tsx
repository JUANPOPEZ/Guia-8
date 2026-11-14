import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Code2,
  Lightbulb,
  FileCheck2,
  RotateCcw,
  AlertTriangle,
  GraduationCap,
  MessageSquare,
  HelpCircle,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { Header } from './components/Header';
import { RulesModal } from './components/RulesModal';
import { StructuredResponseView } from './components/StructuredResponseView';
import { CurriculumBrowser } from './components/CurriculumBrowser';
import { ChallengeSimulator } from './components/ChallengeSimulator';
import { StudyLog } from './components/StudyLog';
import { InsufficientInfoDemo } from './components/InsufficientInfoDemo';
import {
  StudentLevel,
  ProgrammingLanguage,
  StructuredExplanation,
  ChatMessage,
} from './types';

// Default initial explanation for immediate pedagogical showcase
const INITIAL_DEMO_EXPLANATION: StructuredExplanation = {
  topic: 'Principio de Responsabilidad Única (Single Responsibility Principle - SRP)',
  isInsufficientInfo: false,
  insufficientInfoNotice: '',
  definition:
    'El Principio de Responsabilidad Única (SRP) es el primero de los cinco principios SOLID de diseño de software orientado a objetos, formulado por Robert C. Martin. Establece que una clase o módulo debe tener una, y solo una, razón para cambiar; es decir, debe encargarse exclusivamente de un único actor o ámbito de responsabilidad funcional dentro del sistema.',
  explanation:
    'En el desarrollo de software, cuando una clase asume múltiples responsabilidades no cohesivas (por ejemplo, calcular lógica de negocio de nómina y simultáneamente formatear un reporte en HTML y guardar datos en la base de datos), cualquier cambio en el formato de salida o en el motor de base de datos obligará a modificar y recompilar la clase de nómina.\n\nEsto incrementa drásticamente el acoplamiento y el riesgo de regresiones colaterales (bugs inesperados). Al separar responsabilidades en componentes altamente cohesivos, cada módulo puede probarse, desplegarse y mantenerse de forma independiente.',
  steps: [
    'Identificar los actores del sistema que solicitan cambios en la clase (ej. departamento contable vs equipo de infraestructura/DB).',
    'Aislar las funciones que responden a diferentes motivos de cambio en módulos separados.',
    'Definir abstracciones o interfaces para comunicar los componentes sin generar dependencias rígidas.',
    'Aplicar inyección de dependencias para componer los servicios en tiempo de ejecución.',
  ],
  example: {
    language: 'typescript',
    code: `// ❌ VIOLACIÓN DE SRP: Una clase maneja autenticación, persistencia y envío de email
class UsuarioServiceViolacion {
  registrarUsuario(nombre: string, email: string) {
    // 1. Lógica de negocio / validación
    if (!email.includes('@')) throw new Error('Email inválido');

    // 2. Persistencia directa en base de datos
    console.log('INSERT INTO usuarios VALUES (...) en PostgreSQL');

    // 3. Envío de correo electrónico (dependencia de transporte)
    console.log('Conectando a servidor SMTP para enviar bienvenida a: ' + email);
  }
}

// ✅ APLICACIÓN CORRECTA DE SRP: Separación de responsabilidades en módulos cohesivos
interface IUsuarioRepository {
  guardar(usuario: { nombre: string; email: string }): Promise<void>;
}

interface IEmailService {
  enviarBienvenida(email: string): Promise<void>;
}

class RegistradorDeUsuarios {
  constructor(
    private readonly repo: IUsuarioRepository,
    private readonly emailService: IEmailService
  ) {}

  async ejecutar(nombre: string, email: string): Promise<void> {
    // Responsabilidad única: Orquestar el flujo de registro
    if (!email.includes('@')) throw new Error('Email inválido');

    await this.repo.guardar({ nombre, email });
    await this.emailService.enviarBienvenida(email);
  }
}`,
    explanation:
      'En la versión refactorizada, RegistradorDeUsuarios solo orquesta la regla de negocio del registro. Si el proveedor de correo cambia de SMTP a SendGrid o la base de datos migra de PostgreSQL a MongoDB, esta clase no sufre modificación alguna, cumpliendo el principio a cabalidad.',
  },
  practicalRecommendation:
    'No caigas en la sobre-fragmentación (anti-patrón de Clases Anémicas con un solo método trivial). Agrupa responsabilidades coherentes orientadas al mismo actor de negocio. Evalúa la cohesión del módulo midiendo si todos sus métodos operan sobre los mismos atributos de estado.',
  verificationWarning:
    'Verifica siempre las convenciones del framework utilizado (ej. Spring Boot, NestJS o ASP.NET Core) respecto a capas de Servicio y Repositorio. Asimismo, consulta los principios de diseño de Robert C. Martin en la literatura canónica de arquitectura de software para evitar confundir "hacer una sola cosa" a nivel de método con el principio de responsabilidad única a nivel de clase.',
  relatedConcepts: [
    'Principio Abierto/Cerrado (OCP)',
    'Inversión de Dependencias (DIP)',
    'Alta Cohesión y Bajo Acoplamiento',
    'Patrón Repository',
  ],
  verifiedReferences: [
    'Robert C. Martin - Agile Software Development, Principles, Patterns, and Practices (Prentice Hall, 2002)',
    'IEEE Computer Society - Software Engineering Body of Knowledge (SWEBOK v3.0, Chapter on Software Design)',
  ],
};

export default function App() {
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('intermedio');
  const [preferredLanguage, setPreferredLanguage] =
    useState<ProgrammingLanguage>('typescript');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'tutor' | 'curriculum' | 'challenge' | 'notes' | 'ambiguous'
  >('tutor');

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Analizando fundamentos técnicos...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentResponse, setCurrentResponse] =
    useState<StructuredExplanation | null>(INITIAL_DEMO_EXPLANATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Follow-up chat thread
  const [followUpMessages, setFollowUpMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  // Saved notes in localStorage
  const [savedNotes, setSavedNotes] = useState<StructuredExplanation[]>(() => {
    try {
      const stored = localStorage.getItem('ingenierodocente_notes');
      return stored ? JSON.parse(stored) : [INITIAL_DEMO_EXPLANATION];
    } catch {
      return [INITIAL_DEMO_EXPLANATION];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ingenierodocente_notes', JSON.stringify(savedNotes));
    } catch (e) {
      console.error('Error saving notes to localStorage', e);
    }
  }, [savedNotes]);

  // Loading stages and elapsed timer
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const stages = [
      'Analizando conceptos y principios de software...',
      'Estructurando la definición formal y explicación paso a paso...',
      'Generando ejemplo práctico de código y recomendaciones...',
      'Verificando fuentes canónicas y advertencias técnicas...',
    ];
    let step = 0;
    setLoadingStage(stages[0]);
    const stageInterval = setInterval(() => {
      step = (step + 1) % stages.length;
      setLoadingStage(stages[step]);
    }, 2800);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(timerInterval);
    };
  }, [isLoading]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleConsult = async (customQuery?: string) => {
    if (isLoading) return; // Prevent double-trigger from Enter key or fast clicks

    const q = (customQuery ?? query).trim();
    if (!q) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Generous 90 second timeout so detailed code examples never get prematurely interrupted
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    setIsLoading(true);
    setErrorMessage(null);
    setFollowUpMessages([]);

    try {
      const res = await fetch('/api/assist/structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: q,
          studentLevel,
          preferredLanguage,
        }),
      });

      clearTimeout(timeoutId);

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorDetail = json.details ? ` (${json.details})` : '';
        throw new Error(
          (json.error || 'No se pudo procesar la consulta con el asistente.') + errorDetail
        );
      }

      setCurrentResponse(json.data);
      if (customQuery) {
        setQuery(customQuery);
      }
      setActiveTab('tutor');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setErrorMessage('La consulta fue cancelada o superó el tiempo límite. Puedes volver a intentarlo.');
      } else {
        setErrorMessage(
          err?.message || 'Error de comunicación con el servicio de IA.'
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = followUpInput.trim();
    if (!text || isFollowUpLoading || !currentResponse) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...followUpMessages, userMsg];
    setFollowUpMessages(newMessages);
    setFollowUpInput('');
    setIsFollowUpLoading(true);

    try {
      const contextMessages = [
        {
          role: 'user' as const,
          content: `Tema principal en estudio: ${currentResponse.topic}. Definición: ${currentResponse.definition}`,
        },
        ...newMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const res = await fetch('/api/assist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          studentLevel,
          preferredLanguage,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error en la respuesta del docente.');
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: json.reply,
        timestamp: Date.now(),
      };

      setFollowUpMessages([...newMessages, assistantMsg]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error en el diálogo de seguimiento.');
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const toggleSaveNote = (note: StructuredExplanation) => {
    setSavedNotes((prev) => {
      const exists = prev.some((n) => n.topic === note.topic);
      if (exists) {
        return prev.filter((n) => n.topic !== note.topic);
      } else {
        return [note, ...prev];
      }
    });
  };

  const isCurrentSaved =
    currentResponse !== null &&
    savedNotes.some((n) => n.topic === currentResponse.topic);

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Header */}
      <Header
        studentLevel={studentLevel}
        setStudentLevel={setStudentLevel}
        preferredLanguage={preferredLanguage}
        setPreferredLanguage={setPreferredLanguage}
        onOpenRules={() => setIsRulesOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notesCount={savedNotes.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'tutor' && (
          <div className="space-y-6">
            {/* Quick Hero Banner with academic mission */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="max-w-4xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Asistente Pedagógico Universitario
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    • Respuestas en español con rigor y ejemplos
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Aprende Ingeniería de Software con Fundamentos Sólidos
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Formula preguntas técnicas sobre arquitectura, patrones de diseño, principios SOLID, bases de datos, concurrencia o calidad de código. Cada respuesta se organizará rigurosamente en <strong>Definición</strong>, <strong>Explicación técnica</strong>, <strong>Ejemplo práctico</strong> y <strong>Recomendación con verificación documental</strong>.
                </p>

                {/* 4 Pillars preview badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                    <BookOpen className="w-3.5 h-3.5" /> 1. Definición
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                    <HelpCircle className="w-3.5 h-3.5" /> 2. Explicación
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                    <Code2 className="w-3.5 h-3.5" /> 3. Ejemplo Práctico
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                    <Lightbulb className="w-3.5 h-3.5" /> 4. Recomendación
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium">
                    <FileCheck2 className="w-3.5 h-3.5" /> Verificación Técnica
                  </span>
                </div>
              </div>

              {/* Inquiry Input Form */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleConsult();
                  }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Escribe tu consulta técnica (ej: ¿Cómo implementar el patrón Factory Method?, ¿Qué es la idempotencia HTTP?, ¿Cómo funciona el algoritmo de Raft?)..."
                      rows={3}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-xs sm:text-sm resize-none shadow-inner"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleConsult();
                        }
                      }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 animate-pulse">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                            <span className="max-w-[260px] truncate">{loadingStage} ({elapsedSeconds}s)</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={!query.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Consultar al Tutor</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium">Sugerencias rápidas:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleConsult(
                          'Explica el Principio de Inversión de Dependencias (DIP) y cómo se diferencia de Inyección de Dependencias.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Principio DIP vs Inyección de Dependencias
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleConsult(
                          'Explica las propiedades ACID en bases de datos con un ejemplo de transacción bancaria.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Propiedades ACID en Transacciones
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleConsult(
                          'Explica el patrón Strategy y cómo reemplazar condicionales switch con clases de estrategia.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Patrón Strategy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleConsult(
                          'Explica qué es un Deadlock (Interbloqueo), sus 4 condiciones de Coffman y cómo prevenirlo.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Deadlocks y Condiciones de Coffman
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs font-semibold hover:underline"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Structured Response View (4 Pillars) */}
            {currentResponse && (
              <StructuredResponseView
                data={currentResponse}
                onExploreRelated={(relatedConcept) =>
                  handleConsult(`Explica detalladamente: ${relatedConcept}`)
                }
                onSaveToNotes={toggleSaveNote}
                isSaved={isCurrentSaved}
              />
            )}

            {/* Multi-turn Follow-up Section */}
            {currentResponse && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span>Diálogo Académico y Consultas de Seguimiento</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ¿Te quedó alguna duda sobre <strong>{currentResponse.topic}</strong>? Haz preguntas puntuales sobre casos límite, sintaxis o diferencias con otras arquitecturas.
                </p>

                {/* Follow up history */}
                {followUpMessages.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {followUpMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-900 ml-6'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 mr-6 whitespace-pre-line'
                        }`}
                      >
                        <span className="font-bold block mb-1 text-[11px] uppercase tracking-wider text-slate-400">
                          {msg.role === 'user' ? 'Tú (Estudiante):' : 'Docente:'}
                        </span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Follow up input */}
                <form onSubmit={handleFollowUp} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="Haz una pregunta de seguimiento sobre este tema..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isFollowUpLoading || !followUpInput.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    {isFollowUpLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Preguntar</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab: Curriculum Explorer */}
        {activeTab === 'curriculum' && (
          <CurriculumBrowser
            onSelectConcept={(q) => handleConsult(q)}
            currentLevel={studentLevel}
          />
        )}

        {/* Tab: Challenge & Evaluation Simulator */}
        {activeTab === 'challenge' && (
          <ChallengeSimulator studentLevel={studentLevel} />
        )}

        {/* Tab: Ambiguous Test Lab (Insufficient Info) */}
        {activeTab === 'ambiguous' && (
          <InsufficientInfoDemo onTestQuery={(q) => handleConsult(q)} />
        )}

        {/* Tab: Saved Study Notes */}
        {activeTab === 'notes' && (
          <StudyLog
            notes={savedNotes}
            onSelectNote={(note) => {
              setCurrentResponse(note);
              setActiveTab('tutor');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRemoveNote={(topic) =>
              setSavedNotes((prev) => prev.filter((n) => n.topic !== topic))
            }
            onClearNotes={() => setSavedNotes([])}
          />
        )}
      </main>

      {/* Rules and Academic Charter Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
