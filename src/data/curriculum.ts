import { CurriculumTopic } from '../types';

export const CURRICULUM_DATA: CurriculumTopic[] = [
  {
    id: 'solid-principles',
    title: 'Principios SOLID & Clean Code',
    category: 'Diseño Orientado a Objetos',
    icon: 'Layers',
    description: 'Fundamentos de diseño de software para sistemas mantenibles, extensibles y con bajo acoplamiento.',
    concepts: [
      {
        name: 'Single Responsibility Principle (SRP)',
        description: 'Una clase o módulo debe tener una, y solo una, razón para cambiar.',
        query: 'Explica el Principio de Responsabilidad Única (SRP) de SOLID con un caso de refactorización.',
        difficulty: 'principiante',
      },
      {
        name: 'Open/Closed Principle (OCP)',
        description: 'Las entidades de software deben estar abiertas para la extensión, pero cerradas para la modificación.',
        query: 'Explica el Principio Abierto/Cerrado (OCP) de SOLID y cómo implementarlo mediante polimorfismo o abstracciones.',
        difficulty: 'intermedio',
      },
      {
        name: 'Liskov Substitution Principle (LSP)',
        description: 'Los subtipos deben ser sustituibles por sus tipos base sin alterar la corrección del programa.',
        query: 'Explica el Principio de Sustitución de Liskov (LSP) y el clásico antipatrón del Rectángulo y el Cuadrado.',
        difficulty: 'intermedio',
      },
      {
        name: 'Dependency Inversion Principle (DIP)',
        description: 'Los módulos de alto nivel no deben depender de los de bajo nivel; ambos deben depender de abstracciones.',
        query: 'Explica el Principio de Inversión de Dependencias (DIP) y la diferencia entre Inversión de Control (IoC) e Inyección de Dependencias (DI).',
        difficulty: 'avanzado',
      },
      {
        name: 'DRY, KISS y YAGNI',
        description: 'Heurísticas pragmáticas de diseño: No te repitas, Mantenlo simple, No lo vas a necesitar.',
        query: 'Compara y explica los principios DRY (Don\'t Repeat Yourself), KISS y YAGNI con sus respectivos límites y advertencias.',
        difficulty: 'principiante',
      },
    ],
  },
  {
    id: 'design-patterns',
    title: 'Patrones de Diseño (GoF)',
    category: 'Patrones de Arquitectura y Diseño',
    icon: 'Boxes',
    description: 'Soluciones reutilizables y probadas a problemas comunes en el diseño de software orientado a objetos.',
    concepts: [
      {
        name: 'Patrón Factory Method & Abstract Factory',
        description: 'Patrones creacionales para encapsular la instanciación de familias de objetos relacionados.',
        query: 'Explica el patrón Factory Method: cuándo utilizarlo frente a un simple constructor y cómo promueve el desacoplamiento.',
        difficulty: 'intermedio',
      },
      {
        name: 'Patrón Observer / Event-Listener',
        description: 'Mecanismo de suscripción para notificar a múltiples objetos sobre cualquier evento que ocurra.',
        query: 'Explica el patrón de diseño Observer (Observador), cómo previene el acoplamiento fuerte y cómo se implementa en desarrollo moderno.',
        difficulty: 'intermedio',
      },
      {
        name: 'Patrón Strategy (Estrategia)',
        description: 'Permite definir una familia de algoritmos, encapsular cada uno y hacerlos intercambiables en tiempo de ejecución.',
        query: 'Explica el patrón Strategy y cómo erradica bloques masivos de condicionales (if/else o switch) complejos.',
        difficulty: 'intermedio',
      },
      {
        name: 'Patrón Repository',
        description: 'Media entre la capa de dominio y la capa de mapeo de datos mediante una interfaz similar a una colección.',
        query: 'Explica el patrón Repository en arquitecturas modernas y cómo desacopla la lógica de negocio de los detalles de la base de datos.',
        difficulty: 'avanzado',
      },
      {
        name: 'Patrón Singleton (con sus riesgos)',
        description: 'Garantiza que una clase tenga una única instancia y proporciona un punto de acceso global a ella.',
        query: 'Explica el patrón Singleton, su implementación segura en hilos (thread-safe) y por qué se considera a menudo un anti-patrón en pruebas unitarias.',
        difficulty: 'principiante',
      },
    ],
  },
  {
    id: 'software-architecture',
    title: 'Arquitectura de Software',
    category: 'Estructuración de Sistemas',
    icon: 'Cpu',
    description: 'Estructuras organizativas de alto nivel, separación de intereses, límites arquitectónicos y comunicación entre servicios.',
    concepts: [
      {
        name: 'Clean Architecture & Arquitectura Hexagonal',
        description: 'Independencia de frameworks, bases de datos e interfaces de usuario mediante inversión de dependencias.',
        query: 'Explica los fundamentos de Clean Architecture (o Arquitectura Hexagonal / Puertos y Adaptadores) y la regla de dependencia hacia adentro.',
        difficulty: 'avanzado',
      },
      {
        name: 'Monolito Modular vs Microservicios',
        description: 'Evaluación rigurosa de trade-offs de escalabilidad, complejidad operativa y latencia de red.',
        query: 'Analiza con criterios de ingeniería los pros, contras y trade-offs entre un Monolito Modular y una Arquitectura de Microservicios.',
        difficulty: 'avanzado',
      },
      {
        name: 'Arquitectura Orientada a Eventos (EDA)',
        description: 'Desacoplamiento temporal y espacial mediante productores, colas/brokers de mensajería y consumidores.',
        query: 'Explica la Arquitectura Basada en Eventos (Event-Driven Architecture), brokers de mensajes y el concepto de consistencia eventual.',
        difficulty: 'avanzado',
      },
      {
        name: 'Patrón MVC (Modelo-Vista-Controlador)',
        description: 'Separación clásica de la representación de datos, interfaz de usuario y lógica de control.',
        query: 'Explica el patrón de arquitectura Modelo-Vista-Controlador (MVC) y el flujo secuencial de una petición.',
        difficulty: 'principiante',
      },
    ],
  },
  {
    id: 'database-systems',
    title: 'Bases de Datos & Persistencia',
    category: 'Gestión y Almacenamiento de Datos',
    icon: 'Database',
    description: 'Propiedades de transaccionalidad, modelado relacional, índices, normalización y consistencia en sistemas de datos.',
    concepts: [
      {
        name: 'Propiedades ACID vs Modelo BASE',
        description: 'Atomicidad, Consistencia, Aislamiento y Durabilidad frente a Disponibilidad Básica, Estado Flexible y Consistencia Eventual.',
        query: 'Explica en detalle qué son las propiedades ACID en bases de datos relacionales y cómo se contrastan con el modelo BASE en sistemas distribuidos.',
        difficulty: 'intermedio',
      },
      {
        name: 'Normalización de Bases de Datos (1FN, 2FN, 3FN)',
        description: 'Técnica formal para reducir la redundancia y evitar anomalías de inserción, actualización y borrado.',
        query: 'Explica el proceso de Normalización en bases de datos relacionales, paso a paso desde la Primera (1FN) hasta la Tercera Forma Normal (3FN).',
        difficulty: 'intermedio',
      },
      {
        name: 'Estructura e Índices B-Tree',
        description: 'Cómo funcionan internamente los índices en motores de bases de datos para acelerar búsquedas de O(N) a O(log N).',
        query: 'Explica cómo funcionan los índices basados en árboles B/B+ en motores de bases de datos y el costo que imponen en las operaciones de escritura.',
        difficulty: 'avanzado',
      },
      {
        name: 'Teorema CAP',
        description: 'Imposibilidad de que un almacén de datos distribuido proporcione simultáneamente Consistencia, Disponibilidad y Tolerancia a particiones.',
        query: 'Explica el Teorema CAP (Consistencia, Disponibilidad y Tolerancia a Partición) formulado por Eric Brewer con ejemplos reales.',
        difficulty: 'avanzado',
      },
    ],
  },
  {
    id: 'testing-quality',
    title: 'Pruebas, Calidad & Refactorización',
    category: 'Garantía de Calidad de Software (QA)',
    icon: 'ShieldCheck',
    description: 'Estrategias de verificación, pruebas automatizadas, métricas de calidad y reducción de deuda técnica.',
    concepts: [
      {
        name: 'Pirámide de Pruebas de Mike Cohn',
        description: 'Distribución óptima entre pruebas unitarias, de integración y de extremo a extremo (E2E).',
        query: 'Explica la Pirámide de Pruebas automatizadas (Unitarias, Integración, End-to-End), sus costos relativos y tiempos de ejecución.',
        difficulty: 'intermedio',
      },
      {
        name: 'Test-Driven Development (TDD)',
        description: 'Ciclo Red-Green-Refactor: escribir pruebas antes del código de producción como guía de diseño.',
        query: 'Explica la metodología TDD (Test-Driven Development), el ciclo Red-Green-Refactor paso a paso y sus beneficios pedagógicos.',
        difficulty: 'intermedio',
      },
      {
        name: 'Dobles de Prueba: Mocks, Stubs, Spies y Fakes',
        description: 'Clasificación formal de Gerard Meszaros para aislar unidades de software bajo prueba.',
        query: 'Explica la diferencia técnica exacta entre Mock, Stub, Fake, Spy y Dummy en pruebas unitarias con un ejemplo comparativo.',
        difficulty: 'intermedio',
      },
      {
        name: 'Code Smells y Refactorización',
        description: 'Indicadores superficiales en el código que sugieren problemas de diseño más profundos.',
        query: 'Explica el concepto de "Code Smell" y cómo identificar y refactorizar tres comunes: Método Largo, Envidia de Características y Clases de Datos.',
        difficulty: 'intermedio',
      },
    ],
  },
  {
    id: 'concurrency-performance',
    title: 'Concurrencia, Paralelismo & Memoria',
    category: 'Sistemas y Rendimiento',
    icon: 'Zap',
    description: 'Gestión de hilos, sincronización, condiciones de carrera, bloqueos mutuos y ciclo de vida de memoria.',
    concepts: [
      {
        name: 'Race Conditions (Condiciones de Carrera)',
        description: 'Problemas de indeterminación cuando múltiples hilos o tareas acceden y modifican un recurso compartido simultáneamente.',
        query: 'Explica qué es una Race Condition (Condición de Carrera), cómo se produce y cómo se previene mediante primitivas de sincronización.',
        difficulty: 'intermedio',
      },
      {
        name: 'Deadlock (Interbloqueo)',
        description: 'Situación en la que dos o más procesos están bloqueados esperando recursos que el otro retiene.',
        query: 'Explica qué es un Deadlock (Interbloqueo), las cuatro condiciones necesarias de Coffman y cómo prevenirlos o detectarlos.',
        difficulty: 'avanzado',
      },
      {
        name: 'Mutex vs Semáforo',
        description: 'Diferencias técnicas entre primitivas de exclusión mutua y señalización de recursos limitados.',
        query: 'Explica la diferencia técnica entre un Mutex (Exclusión Mutua) y un Semáforo contador con ejemplos de casos de uso.',
        difficulty: 'avanzado',
      },
      {
        name: 'Complejidad Temporal y Espacial (Big O)',
        description: 'Análisis asintótico del comportamiento de algoritmos al crecer el tamaño de la entrada N.',
        query: 'Explica la notación Big O para análisis asintótico de algoritmos, comparando complejidades comunes: O(1), O(log n), O(n), O(n log n) y O(n^2).',
        difficulty: 'principiante',
      },
    ],
  },
];

export const AMBIGUOUS_TEST_QUERIES = [
  {
    title: 'Consulta sin stack ni detalles de error',
    query: 'Mi código no funciona y me da error, ¿cómo lo soluciono?',
    lesson: 'Demuestra cómo el asistente identifica la falta de lenguaje, mensaje de error, código y contexto de ejecución.',
  },
  {
    title: 'Dilema de tecnología sin requerimientos no funcionales',
    query: '¿Cuál es el mejor lenguaje de programación para crear un backend?',
    lesson: 'Demuestra cómo el asistente rehúsa dar una respuesta dogmática y solicita criterios de decisión (escalabilidad, concurrencia, latencia, equipo).',
  },
  {
    title: 'Pregunta de rendimiento sin métricas',
    query: 'Mi base de datos está muy lenta, ¿qué índice le creo?',
    lesson: 'Demuestra cómo el asistente solicita el plan de ejecución (EXPLAIN ANALYZE), volumen de datos y consultas ejecutadas antes de diagnosticar.',
  },
  {
    title: 'Elección de arquitectura sin contexto de escala',
    query: '¿Debo migrar mi proyecto universitario a microservicios con Kubernetes?',
    lesson: 'Demuestra cómo el asistente detecta sobre-ingeniería y solicita métricas de tráfico y tamaño de equipo.',
  },
];
