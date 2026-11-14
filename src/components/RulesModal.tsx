import React from 'react';
import { ShieldCheck, BookOpen, AlertTriangle, CheckCircle, FileText, X, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Estatuto Pedagógico & Reglas de Rigor Técnico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directrices que garantizan la precisión académica del asistente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Card 1: Formato 4 Pilares */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900 dark:text-white">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>1. Estructura Didáctica Obligatoria (4 Pilares)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Cada respuesta técnica sigue rigurosamente el esquema pedagógico para garantizar la asimilación conceptual:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="font-bold text-blue-700 dark:text-blue-400">📘 Definición:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">Fundamento conceptual formal y conciso.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <span className="font-bold text-purple-700 dark:text-purple-400">🔍 Explicación:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">Mecanismo técnico, pasos lógicos y trade-offs.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">💻 Ejemplo Práctico:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">Código fuente verídico y didáctico con comentarios.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <span className="font-bold text-amber-700 dark:text-amber-400">💡 Recomendación:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">Buenas prácticas de la industria para proyectos reales.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Cero Invención de Fuentes */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60">
            <div className="flex items-center gap-2 mb-2 font-semibold text-rose-900 dark:text-rose-300">
              <CheckCircle className="w-4 h-4 text-rose-500" />
              <span>2. Cero Invención de Datos y Referencias Bibliográficas</span>
            </div>
            <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
              El asistente tiene prohibido generar citas bibliográficas ficticias, enlaces simulados o estadísticas inventadas. Solo se citan obras canónicas reales (e.g., Catálogo GoF 1994, IEEE Software Engineering Body of Knowledge SWEBOK, o RFCs de la IETF).
            </p>
          </div>

          {/* Card 3: Reconocimiento de Información Insuficiente */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center gap-2 mb-2 font-semibold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>3. Reconocimiento de Falta de Información Suficiente</span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Si una consulta es ambigua o carece del contexto necesario (ej: versión de lenguaje, trace de error, requerimientos no funcionales), el asistente lo reconoce abiertamente en lugar de hacer suposiciones arriesgadas y solicita los parámetros faltantes.
            </p>
          </div>

          {/* Card 4: Advertencia de Verificación Técnica */}
          <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60">
            <div className="flex items-center gap-2 mb-2 font-semibold text-sky-900 dark:text-sky-300">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>4. Advertencia de Verificación con Documentación Oficial</span>
            </div>
            <p className="text-xs text-sky-800/90 dark:text-sky-300/90 leading-relaxed">
              Cada respuesta destaca las especificaciones técnicas oficiales (ej. MDN Web Docs, Python Enhancement Proposals PEPs, Oracle Java Language Specification, o RFCs) que el estudiante debe cotejar para su versión específica en entornos de producción.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Respaldado por Gemini 3.8 Flash</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
