import React from 'react';
import { Bookmark, Download, Trash2, ArrowRight, BookOpen, Code, Lightbulb, FileCheck2 } from 'lucide-react';
import { StructuredExplanation } from '../types';

interface StudyLogProps {
  notes: StructuredExplanation[];
  onSelectNote: (note: StructuredExplanation) => void;
  onRemoveNote: (topic: string) => void;
  onClearNotes: () => void;
}

export const StudyLog: React.FC<StudyLogProps> = ({
  notes,
  onSelectNote,
  onRemoveNote,
  onClearNotes,
}) => {
  const handleExportMarkdown = () => {
    if (notes.length === 0) return;

    let md = `# APUNTES DE INGENIERÍA DE SOFTWARE\n`;
    md += `*Generado por IngenieroDocente - Asistente Pedagógico Universitario*\n`;
    md += `*Fecha: ${new Date().toLocaleDateString('es-ES')}*\n\n`;
    md += `---\n\n`;

    notes.forEach((note, idx) => {
      md += `## ${idx + 1}. ${note.topic}\n\n`;
      md += `### 1. Definición Conceptual\n${note.definition}\n\n`;
      md += `### 2. Explicación Técnica\n${note.explanation}\n\n`;
      if (note.steps && note.steps.length > 0) {
        md += `#### Pasos de Ejecución:\n`;
        note.steps.forEach((step, sIdx) => {
          md += `${sIdx + 1}. ${step}\n`;
        });
        md += `\n`;
      }
      if (note.example) {
        md += `### 3. Ejemplo Práctico (${note.example.language})\n`;
        md += `\`\`\`${note.example.language}\n${note.example.code}\n\`\`\`\n`;
        md += `*Análisis del ejemplo:* ${note.example.explanation}\n\n`;
      }
      md += `### 4. Recomendación Práctica\n${note.practicalRecommendation}\n\n`;
      md += `> ⚠️ **Advertencia de Verificación Documental:** ${note.verificationWarning}\n\n`;
      if (note.relatedConcepts && note.relatedConcepts.length > 0) {
        md += `*Conceptos relacionados:* ${note.relatedConcepts.join(', ')}\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Apuntes_Ingenieria_Software_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                Cuaderno de Estudio
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Mis Fichas y Apuntes Académicos
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              Colección de temas consultados con sus 4 pilares: definición, fundamentos, ejemplos de código y advertencias técnicas.
            </p>
          </div>

          {notes.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Markdown (.md)</span>
              </button>
              <button
                onClick={onClearNotes}
                className="p-2 bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-xl text-xs transition-colors border border-slate-700"
                title="Limpiar todas las notas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            No tienes apuntes guardados aún
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Cuando consultes un concepto con el tutor, pulsa el botón <strong>&quot;Guardar Apunte&quot;</strong> para agregarlo a tu cuaderno de estudio y exportarlo cuando quieras.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Ficha #{idx + 1}
                  </span>
                  <button
                    onClick={() => onRemoveNote(note.topic)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar de mis apuntes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {note.topic}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {note.definition}
                </p>

                {note.example && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Code className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ejemplo en {note.example.language}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onSelectNote(note)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Revisar ficha completa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
