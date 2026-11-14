import React from 'react';
import { AlertCircle, HelpCircle, ArrowRight, CheckCircle2, Terminal, ShieldAlert } from 'lucide-react';
import { AMBIGUOUS_TEST_QUERIES } from '../data/curriculum';

interface InsufficientInfoDemoProps {
  onTestQuery: (query: string) => void;
}

export const InsufficientInfoDemo: React.FC<InsufficientInfoDemoProps> = ({ onTestQuery }) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Principio de Rigor Técnico
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Laboratorio: Detección de Información Insuficiente
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/90 mt-1 leading-relaxed">
            Un buen ingeniero de software no asume a ciegas. Si una pregunta carece de especificaciones técnicas, versiones, registros de error o restricciones operativas, el asistente lo reconoce expresamente y enseña al estudiante qué información técnica es requerida.
          </p>
        </div>
      </div>

      {/* Educational comparison card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anti-pattern: Ambiguous Question */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Antipatrón: Pregunta Ambigua / Sin Contexto</span>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs font-mono text-rose-800 dark:text-rose-300 mb-3">
            &quot;¿Por qué se cae mi servidor web?&quot;
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Falta: Sistema operativo, runtime (Node, Go, JVM), logs del error (OOM, timeout, 502), número de peticiones concurrentes y arquitectura del despliegue.
          </p>
        </div>

        {/* Good Practice: Engineered Technical Question */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Buena Práctica: Pregunta con Especificación Técnica</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs font-mono text-emerald-800 dark:text-emerald-300 mb-3">
            &quot;En Node.js v20 con Express, el proceso termina con Error JavaScript heap out of memory bajo 10k req/s. ¿Cómo diagnosticar y mitigar?&quot;
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Proporciona: Runtime exacto, framework, síntoma específico (fuga de memoria), condición de estrés y objetivo claro.
          </p>
        </div>
      </div>

      {/* Interactive test cases */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Prueba cómo reacciona el Asistente a consultas ambiguas:
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Haz clic en cualquiera de estos casos típicos. El asistente activará su bandera de <strong>isInsufficientInfo: true</strong> y desglosará pedagógicamente qué datos específicos faltan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {AMBIGUOUS_TEST_QUERIES.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onTestQuery(item.query)}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-800 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{item.title}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 my-2">
                  &quot;{item.query}&quot;
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.lesson}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Ejecutar prueba de rigor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
