export type SolutionNode = {
  code: string;
  label: string;
  detail: string;
};

export type Solution = {
  slug: string;
  index: string;
  code: string;
  title: string;
  eyebrow: string;
  summary: string;
  objective: string;
  equipmentCodes: string[];
  architecture: SolutionNode[];
  outputs: string[];
  useCases: string[];
};

export const solutions: Solution[] = [
  {
    slug: "directional-mwd",
    index: "01",
    code: "MWD",
    title: "Направленное бурение",
    eyebrow: "ORIENTATION / TELEMETRY",
    summary: "Базовый контур MWD для контроля положения КНБК, телеметрической передачи и оперативного сопровождения траектории.",
    objective: "Собрать устойчивый канал от забойных ориентационных датчиков до рабочего места инженера без разрыва временной и глубинной привязки.",
    equipmentCodes: ["INC", "MWD", "PWR", "SFC", "SW"],
    architecture: [
      { code: "01", label: "ORIENTATION", detail: "INC / AZM / TF формируются в забойном измерительном модуле." },
      { code: "02", label: "FRAME", detail: "Выбранные каналы собираются в телеметрические кадры." },
      { code: "03", label: "PULSE", detail: "Телеметрический тракт переносит данные на поверхность." },
      { code: "04", label: "DECODE", detail: "Наземный декодер восстанавливает поток параметров." },
      { code: "05", label: "MONITOR", detail: "Drill Monitor синхронизирует телеметрию с глубиной и временем." },
    ],
    outputs: ["INC / AZM / TF", "Состояние телеметрии", "Диагностические каналы", "План / факт траектории"],
    useCases: ["Набор угла", "Удержание траектории", "Ориентирование КНБК", "Оперативный контроль качества сигнала"],
  },
  {
    slug: "lwd-geosteering",
    index: "02",
    code: "LWD",
    title: "Геонавигация LWD",
    eyebrow: "FORMATION / CORRELATION",
    summary: "Связка ориентационных и геофизических каналов для корреляции разреза и принятия решений во время бурения.",
    objective: "Объединить пространственное положение инструмента и данные о свойствах породы в едином потоке для оперативной геонавигации.",
    equipmentCodes: ["INC", "GR", "RES", "MWD", "PWR", "SFC", "SW"],
    architecture: [
      { code: "01", label: "POSITION", detail: "Ориентационный модуль задаёт пространственную привязку измерений." },
      { code: "02", label: "FORMATION", detail: "GR и RES формируют геофизические каналы в процессе бурения." },
      { code: "03", label: "PRIORITY", detail: "Критичные параметры выбираются для передачи в реальном времени." },
      { code: "04", label: "SYNC", detail: "На поверхности данные синхронизируются с глубиной и временем." },
      { code: "05", label: "INTERPRET", detail: "ПО формирует кривые и контекст для оперативного решения." },
    ],
    outputs: ["Gamma Ray", "Resistivity", "INC / AZM", "Глубинная привязка", "Оперативные кривые"],
    useCases: ["Корреляция", "Геонавигация", "Контроль входа в пласт", "Сопоставление с моделью"],
  },
  {
    slug: "remote-monitoring",
    index: "03",
    code: "DATA",
    title: "Удалённый мониторинг",
    eyebrow: "SURFACE / SOFTWARE / REMOTE",
    summary: "Наземный сбор, декодирование и программный контур для удалённого контроля телеметрии и параметров бурения.",
    objective: "Сделать данные с буровой доступными в едином инженерном интерфейсе с диагностикой канала, траекторией и историей событий.",
    equipmentCodes: ["SFC", "SW", "MWD", "INC", "GR", "RES"],
    architecture: [
      { code: "01", label: "ACQUIRE", detail: "Наземные датчики и декодер принимают поток с буровой." },
      { code: "02", label: "NORMALIZE", detail: "Каналы приводятся к единой временной модели." },
      { code: "03", label: "STREAM", detail: "Поток передаётся в рабочее приложение и внешний контур." },
      { code: "04", label: "VISUALIZE", detail: "Drill Monitor отображает телеметрию, события и траекторию." },
      { code: "05", label: "ARCHIVE", detail: "История сохраняется для анализа и отчётности." },
    ],
    outputs: ["Live telemetry", "Surface channels", "Signal quality", "Plan / actual", "Event history"],
    useCases: ["Удалённое сопровождение", "Контроль качества данных", "Разбор событий", "Инженерная поддержка нескольких объектов"],
  },
];

export const solutionsBySlug = Object.fromEntries(solutions.map((item) => [item.slug, item])) as Record<string, Solution>;
