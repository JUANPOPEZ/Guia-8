import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Code2,
  Lightbulb,
  AlertTriangle,
  FileCheck2,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  ExternalLink,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { StructuredExplanation } from '../types';

interface StructuredResponseViewProps {
  data: StructuredExplanation;
  onExploreRelated: (concept: string) => void;
  onSaveToNotes?: (data: StructuredExplanation) => void;
  isSaved?: boolean;
}

export const StructuredResponseView: React.FC<StructuredResponseViewProps> = ({
  data,
  onExploreRelated,
  onSaveToNotes,
  isSaved = false,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyCode = async () => {
    if (!data.example?.code) return;
    await navigator.clipboard.writeText(data.example.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyFullSummary = async () => {
    const summaryText = `[FICHA DE ESTUDIO - ${data.topic}]
1. DEFINICIÓN:
${data.definition}

2. EXPLICACIÓN:
${data.explanation}
${data.steps && data.steps.length > 0 ? `\nPasos:\n${data.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

3. EJEMPLO PRÁCTICO (${data.example.language}):
\`\`\`${data.example.language}
${data.example.code}
\`\`\`
${data.example.explanation}

4. RECOMENDACIÓN PRÁCTICA:
${data.practicalRecommendation}

⚠️ ADVERTENCIA DE VERIFICACIÓN TÉCNICA:
${data.verificationWarning}
`;
    await navigator.clipboard.writeText(summaryText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Insufficient Information Warning Banner if detected */}
      {data.isInsufficientInfo && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Aviso Académico: Información Insuficiente en la Consulta
            </h4>
            <p className="mt-1 text-amber-800 dark:text-amber-300 text-xs sm:text-sm leading-relaxed">
              {data.insufficientInfoNotice ||
                'Para dar un diagnóstico o respuesta técnica certera se requiere mayor contexto (versión del lenguaje, stack, mensaje de error o traza de ejecución). A continuación se provee un análisis pedagógico conceptual:'}
            </p>
          </div>
        </div>
      )}

      {/* Topic Title Bar & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Concepto de Ingeniería
            </span>
            <span className="text-xs text-slate-400">• Formato 4 Pilares</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {data.topic}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onSaveToNotes && (
            <button
              onClick={() => onSaveToNotes(data)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isSaved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>En Apuntes</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Guardar Apunte</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopyFullSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Copiar toda la ficha estructurada"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Ficha</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Pillars */}
      <div className="space-y-6">
        {/* PILAR 1: DEFINICIÓN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex items-center gap-2.5 mb-3 text-blue-600 dark:text-blue-400 font-bold text-sm tracking-wide">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>1. DEFINICIÓN CONCEPTUAL</span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 text-base leading-relaxed font-normal">
            {data.definition}
          </p>
        </div>

        {/* PILAR 2: EXPLICACIÓN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-100 dark:border-purple-900/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
          <div className="flex items-center gap-2.5 mb-3 text-purple-600 dark:text-purple-400 font-bold text-sm tracking-wide">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>2. EXPLICACIÓN TÉCNICA & FUNCIONAMIENTO</span>
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-3 whitespace-pre-line">
            {data.explanation}
          </div>

          {/* Sequential Steps if applicable */}
          {data.steps && data.steps.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <ListOrdered className="w-3.5 h-3.5 text-purple-500" />
                <span>Flujo de Ejecución o Pasos de Aplicación</span>
              </div>
              <div className="space-y-2.5">
                {data.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PILAR 3: EJEMPLO PRÁCTICO */}
        {data.example && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm tracking-wide">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60">
                  <Code2 className="w-4 h-4" />
                </div>
                <span>3. EJEMPLO PRÁCTICO APLICADO</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  {data.example.language}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code container */}
            <div className="relative my-3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 font-mono text-xs sm:text-sm text-slate-100 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="ml-2 font-mono">ejemplo_{data.example.language.toLowerCase()}.txt</span>
                </span>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-100 leading-relaxed scrollbar-thin">
                <code>{data.example.code}</code>
              </pre>
            </div>

            {/* Example explanation */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Análisis del código: </span>
              {data.example.explanation}
            </div>
          </div>
        )}

        {/* PILAR 4: RECOMENDACIÓN PRÁCTICA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex items-center gap-2.5 mb-3 text-amber-600 dark:text-amber-400 font-bold text-sm tracking-wide">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60">
              <Lightbulb className="w-4 h-4" />
            </div>
            <span>4. RECOMENDACIÓN PRÁCTICA PARA PROYECTOS REALES</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            {data.practicalRecommendation}
          </p>
        </div>

        {/* ADVERTENCIA DE VERIFICACIÓN TÉCNICA */}
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 rounded-2xl border-2 border-sky-300 dark:border-sky-800 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500 text-white shrink-0 shadow-sm shadow-sky-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sky-950 dark:text-sky-200 text-sm sm:text-base">
                  Advertencia de Verificación Documental
                </h4>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-sky-200/60 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                  Rigor Obligatorio
                </span>
              </div>
              <p className="text-sky-900 dark:text-sky-200/90 leading-relaxed">
                {data.verificationWarning}
              </p>

              {/* Verified references if provided */}
              {data.verifiedReferences && data.verifiedReferences.length > 0 && (
                <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-800/80">
                  <span className="text-[11px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider block mb-1">
                    Estándares y Documentación Oficial Recomendada:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-sky-800 dark:text-sky-300/80">
                    {data.verifiedReferences.map((ref, idx) => (
                      <li key={idx} className="font-mono">{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RELATED CONCEPTS */}
        {data.relatedConcepts && data.relatedConcepts.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Profundiza tu Aprendizaje (Conceptos Relacionados)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.relatedConcepts.map((concept, idx) => (
                <button
                  key={idx}
                  onClick={() => onExploreRelated(concept)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors cursor-pointer group"
                >
                  <span>{concept}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
