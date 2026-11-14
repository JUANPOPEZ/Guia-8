import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Code,
  SlidersHorizontal,
  BookOpen,
  KeyRound,
  Activity,
  LogOut,
} from 'lucide-react';
import { StudentLevel, ProgrammingLanguage, AuthSession } from '../types';

interface HeaderProps {
  studentLevel: StudentLevel;
  setStudentLevel: (level: StudentLevel) => void;
  preferredLanguage: ProgrammingLanguage;
  setPreferredLanguage: (lang: ProgrammingLanguage) => void;
  onOpenRules: () => void;
  activeTab: 'tutor' | 'curriculum' | 'challenge' | 'notes' | 'ambiguous';
  setActiveTab: (tab: 'tutor' | 'curriculum' | 'challenge' | 'notes' | 'ambiguous') => void;
  notesCount: number;
  authSession: AuthSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdminMetrics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  studentLevel,
  setStudentLevel,
  preferredLanguage,
  setPreferredLanguage,
  onOpenRules,
  activeTab,
  setActiveTab,
  notesCount,
  authSession,
  onOpenAuth,
  onLogout,
  onOpenAdminMetrics,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Banner with branding and student settings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                IngenieroDocente
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                AI Pedagógico
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tutor de Ingeniería de Software para Estudiantes Universitarios
            </p>
          </div>
        </div>

        {/* Student Controls: Level, Language, JWT Auth & Academic Charter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Level Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Nivel:</span>
            <select
              value={studentLevel}
              onChange={(e) => setStudentLevel(e.target.value as StudentLevel)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              aria-label="Seleccionar nivel del estudiante"
            >
              <option value="principiante" className="dark:bg-slate-800">Principiante (Fundamentos)</option>
              <option value="intermedio" className="dark:bg-slate-800">Intermedio (Patrones & Calidad)</option>
              <option value="avanzado" className="dark:bg-slate-800">Avanzado (Arquitectura & Concurrencia)</option>
            </select>
          </div>

          {/* Preferred Language for Code Examples */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
            <Code className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Ejemplos en:</span>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as ProgrammingLanguage)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              aria-label="Seleccionar lenguaje para ejemplos de código"
            >
              <option value="typescript" className="dark:bg-slate-800">TypeScript / JS</option>
              <option value="python" className="dark:bg-slate-800">Python 3</option>
              <option value="java" className="dark:bg-slate-800">Java (Modern)</option>
              <option value="csharp" className="dark:bg-slate-800">C# (.NET)</option>
              <option value="go" className="dark:bg-slate-800">Go</option>
              <option value="cpp" className="dark:bg-slate-800">C++</option>
              <option value="rust" className="dark:bg-slate-800">Rust</option>
              <option value="sql" className="dark:bg-slate-800">SQL / DDL</option>
            </select>
          </div>

          {/* JWT Session & Role Control */}
          {authSession ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-200 hover:underline cursor-pointer"
                title="Cambiar rol o gestionar sesión JWT"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{authSession.user.username}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-600 text-white">
                  {authSession.user.role}
                </span>
              </button>
              <button
                onClick={onLogout}
                className="p-0.5 text-emerald-700 dark:text-emerald-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title="Cerrar sesión JWT"
                aria-label="Cerrar sesión JWT"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
              title="Iniciar sesión para obtener token JWT"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Iniciar Sesión (JWT)</span>
            </button>
          )}

          {/* Admin Metrics Button */}
          <button
            onClick={onOpenAdminMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-semibold border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer"
            title="Ver métricas y auditoría de seguridad (Solo ADMIN)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auditoría Admin</span>
          </button>

          {/* Rules & Charter Modal Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            title="Ver directrices académicas y reglas de verificación"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Rigor & Estatuto</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-xs font-medium">
        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tutor'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Tutor Académico (4 Pilares)</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'curriculum'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>Plan de Estudios / Temas</span>
        </button>

        <button
          onClick={() => setActiveTab('challenge')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'challenge'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>Desafíos & Evaluación</span>
        </button>

        <button
          onClick={() => setActiveTab('ambiguous')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'ambiguous'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>Detector de Info Insuficiente</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ml-auto ${
            activeTab === 'notes'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>Mis Apuntes</span>
          {notesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200">
              {notesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
