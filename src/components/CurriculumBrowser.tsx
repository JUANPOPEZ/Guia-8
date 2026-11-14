import React, { useState } from 'react';
import {
  Layers,
  Boxes,
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  Search,
  ArrowRight,
  BookOpen,
  Filter,
} from 'lucide-react';
import { CURRICULUM_DATA } from '../data/curriculum';
import { StudentLevel } from '../types';

interface CurriculumBrowserProps {
  onSelectConcept: (query: string, conceptName: string) => void;
  currentLevel: StudentLevel;
}

export const CurriculumBrowser: React.FC<CurriculumBrowserProps> = ({
  onSelectConcept,
  currentLevel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layers':
        return <Layers className="w-5 h-5 text-indigo-500" />;
      case 'Boxes':
        return <Boxes className="w-5 h-5 text-violet-500" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-blue-500" />;
      case 'Database':
        return <Database className="w-5 h-5 text-emerald-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-sky-500" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
    }
  };

  const filteredTopics = CURRICULUM_DATA.map((topic) => {
    const matchesCategory =
      selectedCategory === 'all' || topic.id === selectedCategory;

    const filteredConcepts = topic.concepts.filter((concept) => {
      const matchesSearch =
        concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concept.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel =
        levelFilter === 'all' || concept.difficulty === levelFilter;
      return matchesSearch && matchesLevel;
    });

    return {
      ...topic,
      concepts: matchesCategory ? filteredConcepts : [],
    };
  }).filter((topic) => topic.concepts.length > 0);

  const totalConcepts = filteredTopics.reduce(
    (acc, t) => acc + t.concepts.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Currículo Académico de Ingeniería de Software
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            Biblioteca de Conceptos Esenciales
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 leading-relaxed">
            Explora las materias nucleares del desarrollo de software. Haz clic en cualquier tema para generar la explicación formal completa bajo el estándar de 4 pilares con ejemplos prácticos.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar concepto (ej: SOLID, Factory, ACID, TDD, Deadlock, CAP...)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Dificultad:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">Todas</option>
              <option value="principiante" className="dark:bg-slate-800">Principiante</option>
              <option value="intermedio" className="dark:bg-slate-800">Intermedio</option>
              <option value="avanzado" className="dark:bg-slate-800">Avanzado</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos los módulos ({CURRICULUM_DATA.reduce((acc, c) => acc + c.concepts.length, 0)})
          </button>
          {CURRICULUM_DATA.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedCategory(topic.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === topic.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {topic.title}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
        Mostrando {totalConcepts} concepto(s) técnico(s) disponibles para estudio
      </div>

      {/* Topics Grid */}
      <div className="space-y-6">
        {filteredTopics.map((topic) => (
          <div
            key={topic.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            {/* Topic header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {getIcon(topic.icon)}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {topic.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {topic.description}
                </p>
              </div>
            </div>

            {/* Concepts cards inside topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topic.concepts.map((concept, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectConcept(concept.query, concept.name)}
                  className="group p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {concept.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          concept.difficulty === 'principiante'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : concept.difficulty === 'intermedio'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {concept.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {concept.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Generar explicación (4 pilares)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredTopics.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <p className="text-sm text-slate-500">
              No se encontraron conceptos que coincidan con los filtros seleccionados.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setLevelFilter('all');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
