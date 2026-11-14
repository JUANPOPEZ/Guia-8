import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  FileCheck2,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { AcademicChallenge, StudentLevel, UserRole } from '../types';

interface ChallengeSimulatorProps {
  studentLevel: StudentLevel;
  authToken: string | null;
  userRole?: UserRole;
  onOpenAuth: () => void;
}

export const ChallengeSimulator: React.FC<ChallengeSimulatorProps> = ({
  studentLevel,
  authToken,
  userRole,
  onOpenAuth,
}) => {
  const [topic, setTopic] = useState('Patrones de Diseño y Principios SOLID');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<AcademicChallenge | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const predefinedTopics = [
    'Principios SOLID y Clean Code',
    'Patrones de Diseño GoF (Factory, Strategy, Observer)',
    'Arquitectura de Software (Clean vs Monolito vs Microservicios)',
    'Bases de Datos Relacionales & Propiedades ACID',
    'Pirámide de Pruebas & TDD',
    'Concurrencia, Race Conditions & Deadlocks',
  ];

  const handleGenerateChallenge = async (selectedTopic?: string) => {
    const t = selectedTopic || topic;
    setLoading(true);
    setErrorMsg(null);
    setSelectedOptionId(null);
    setIsSubmitted(false);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/assist/challenge', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: t,
          studentLevel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al generar el caso de estudio.');
      }
      setChallenge(json.data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de conexión con el asistente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-500/30 text-violet-200 border border-violet-400/30 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Simulador de Casos Prácticos
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Autoevaluación & Análisis de Dilemas de Software
          </h2>
          <p className="text-xs sm:text-sm text-violet-200 mt-1 leading-relaxed">
            Pon a prueba tu criterio ingenieril. El asistente planteará escenarios reales (antipatrones, refactorizaciones, cuellos de botella) para que decidas la solución técnica óptima con fundamentación académica.
          </p>
        </div>
      </div>

      {/* Topic selection bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
            Selecciona o escribe el tema a evaluar:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Principio de Sustitución de Liskov, Transacciones ACID..."
              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              onClick={() => handleGenerateChallenge()}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generando caso...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Desafío</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick topics */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Sugerencias temáticas rápidas:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {predefinedTopics.map((pt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTopic(pt);
                  handleGenerateChallenge(pt);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700/80 transition-colors"
              >
                {pt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {userRole !== 'ADMIN' && (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cambiar a Rol ADMIN
            </button>
          )}
        </div>
      )}

      {/* Challenge Card */}
      {challenge && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Caso de Estudio
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                {challenge.title}
              </h3>
            </div>
            <button
              onClick={() => handleGenerateChallenge()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Generar otro desafío de este tema"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nuevo desafío</span>
            </button>
          </div>

          {/* Scenario description */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escenario Técnico:
            </h4>
            <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {challenge.scenario}
            </p>
          </div>

          {/* Code snippet if present */}
          {challenge.codeSnippet && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <span>Código a evaluar:</span>
                <span className="font-mono text-[11px] text-slate-400">{challenge.language || 'código'}</span>
              </div>
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800">
                <pre><code>{challenge.codeSnippet}</code></pre>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Pregunta de Evaluación:
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm mt-0.5">
                  {challenge.question}
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selecciona tu propuesta de solución:
            </h4>
            <div className="space-y-2.5">
              {challenge.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isCorrect = opt.id === challenge.correctOptionId;

                let stateClasses = 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

                if (isSelected && !isSubmitted) {
                  stateClasses = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-400/40';
                }

                if (isSubmitted) {
                  if (isCorrect) {
                    stateClasses = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-400/40';
                  } else if (isSelected && !isCorrect) {
                    stateClasses = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-200 ring-2 ring-rose-400/40';
                  } else {
                    stateClasses = 'opacity-60 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500';
                  }
                }

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (!isSubmitted) setSelectedOptionId(opt.id);
                    }}
                    className={`p-4 rounded-xl border text-sm transition-all cursor-pointer flex items-start gap-3 ${stateClasses}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {opt.id}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{opt.text}</p>
                      {isSubmitted && (
                        <p className="mt-2 text-xs opacity-90 leading-relaxed border-t border-current/20 pt-1.5">
                          {opt.explanation}
                        </p>
                      )}
                    </div>
                    {isSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit answer button */}
          {!isSubmitted && (
            <button
              onClick={() => {
                if (selectedOptionId) setIsSubmitted(true);
              }}
              disabled={!selectedOptionId}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Verificar Respuesta Académica</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Feedback section after submitting */}
          {isSubmitted && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedOptionId === challenge.correctOptionId
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                }`}
              >
                {selectedOptionId === challenge.correctOptionId ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <h5 className="font-bold text-sm sm:text-base">
                    {selectedOptionId === challenge.correctOptionId
                      ? '¡Excelente criterio ingenieril!'
                      : 'Oportunidad de Aprendizaje Técnico'}
                  </h5>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                    {challenge.academicFeedback}
                  </p>
                </div>
              </div>

              {/* Technical Warning */}
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-start gap-3 text-xs sm:text-sm text-sky-900 dark:text-sky-300">
                <FileCheck2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Verificación Documental:</span>
                  <p>{challenge.verificationWarning}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
