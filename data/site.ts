export type EquipmentSpec = {
  label: string;
  value: string;
};

export type EquipmentItem = {
  slug: string;
  code: string;
  index: string;
  title: string;
  shortTitle: string;
  text: string;
  signal: string;
  category: string;
  heroLabel: string;
  overview: string;
  capabilities: string[];
  specs: EquipmentSpec[];
  compatibility: string[];
  signalPath: string[];
};

export const equipment: EquipmentItem[] = [
  {
    slug: "inclinometer",
    code: "INC",
    index: "01",
    title: "Инклинометрия",
    shortTitle: "Инклинометр",
    text: "Измерение зенитного угла, азимута и положения инструмента в процессе бурения.",
    signal: "AZM / INC / TF",
    category: "DOWNHOLE / ORIENTATION",
    heroLabel: "ORIENTATION MODULE",
    overview: "Забойный измерительный модуль для определения пространственного положения КНБК и передачи навигационных параметров в телеметрический тракт.",
    capabilities: [
      "Измерение INC / AZM / Toolface",
      "Контроль качества и диагностических каналов датчиков",
      "Подготовка данных для MWD-телеметрии и локальной памяти",
      "Работа как часть единой MWD/LWD-компоновки",
    ],
    specs: [
      { label: "Измеряемые параметры", value: "INC / AZM / TF" },
      { label: "Сенсорная архитектура", value: "Акселерометры + магнитометры" },
      { label: "Режим данных", value: "Real-time + memory" },
      { label: "Интеграция", value: "MWD / LWD bus" },
      { label: "Монтаж", value: "В составе немагнитной секции" },
      { label: "Диапазоны / точность", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["MWD", "PWR", "GR", "RES", "SFC", "SW"],
    signalPath: ["SENSORS", "ORIENTATION", "ENCODER", "MWD", "SURFACE"],
  },
  {
    slug: "gamma",
    code: "GR",
    index: "02",
    title: "Гамма-модуль",
    shortTitle: "Гамма",
    text: "Непрерывная регистрация естественной гамма-активности для геонавигации и корреляции.",
    signal: "GAMMA / API",
    category: "LWD / FORMATION",
    heroLabel: "GAMMA RAY MODULE",
    overview: "Модуль естественной гамма-активности для литологической корреляции, геонавигации и привязки ствола к разрезу в процессе бурения.",
    capabilities: [
      "Регистрация естественного гамма-фона",
      "Подготовка канала GR для телеметрии на поверхность",
      "Высокочастотная локальная запись для последующего анализа",
      "Совместная работа с инклинометрией и другими LWD-модулями",
    ],
    specs: [
      { label: "Основной канал", value: "GR" },
      { label: "Единицы представления", value: "API / counts" },
      { label: "Режим данных", value: "Real-time + memory" },
      { label: "Применение", value: "Корреляция / геонавигация" },
      { label: "Интеграция", value: "MWD / LWD bus" },
      { label: "Диапазоны / термобарика", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["INC", "MWD", "PWR", "RES", "SFC", "SW"],
    signalPath: ["DETECTOR", "COUNTING", "FILTER", "MWD", "SURFACE"],
  },
  {
    slug: "resistivity",
    code: "RES",
    index: "03",
    title: "Резистивиметрия",
    shortTitle: "Резистивиметр",
    text: "Оценка удельного электрического сопротивления пород в составе LWD-компоновки.",
    signal: "RES / Ω·M",
    category: "LWD / FORMATION",
    heroLabel: "RESISTIVITY MODULE",
    overview: "Каротажный модуль для оценки электрических свойств пород непосредственно во время бурения и передачи выбранных каналов в наземную систему.",
    capabilities: [
      "Измерение каналов сопротивления / проводимости",
      "Формирование геофизических кривых для оперативной интерпретации",
      "Локальная запись расширенного набора данных",
      "Синхронизация с глубиной и ориентационными параметрами",
    ],
    specs: [
      { label: "Основной параметр", value: "Formation resistivity" },
      { label: "Принцип измерения", value: "Зависит от конфигурации инструмента" },
      { label: "Режим данных", value: "Real-time subset + memory" },
      { label: "Синхронизация", value: "Depth / time / orientation" },
      { label: "Интеграция", value: "LWD / MWD bus" },
      { label: "Частоты / диапазоны", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["INC", "GR", "MWD", "PWR", "SFC", "SW"],
    signalPath: ["TX/RX", "MEASUREMENT", "PROCESSING", "MWD", "SURFACE"],
  },
  {
    slug: "mwd",
    code: "MWD",
    index: "04",
    title: "Телеметрический канал",
    shortTitle: "MWD",
    text: "Формирование, кодирование и передача забойных данных на поверхность в реальном времени.",
    signal: "PULSE / DATA",
    category: "DOWNHOLE / TELEMETRY",
    heroLabel: "MWD TELEMETRY",
    overview: "Центральный телеметрический тракт, который собирает выбранные забойные каналы, кодирует их и передаёт на поверхность через доступный канал связи.",
    capabilities: [
      "Сбор данных от измерительных модулей",
      "Формирование телеметрических кадров",
      "Управление приоритетами передаваемых параметров",
      "Синхронизация с наземным декодером и ПО мониторинга",
    ],
    specs: [
      { label: "Тип данных", value: "Orientation / formation / diagnostics" },
      { label: "Кодирование", value: "Конфигурируемая схема кадров" },
      { label: "Передача", value: "Импульсный / иной канал по исполнению" },
      { label: "Управление", value: "Downhole state machine" },
      { label: "Наземная часть", value: "Decoder + workstation" },
      { label: "Скорость / протокол", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["INC", "GR", "RES", "PWR", "SFC", "SW"],
    signalPath: ["MODULE BUS", "FRAME", "ENCODER", "PULSE", "DECODER"],
  },
  {
    slug: "power",
    code: "PWR",
    index: "05",
    title: "Питание",
    shortTitle: "Питание",
    text: "Энергетический модуль для стабильной работы измерительной и передающей части компоновки.",
    signal: "VOLT / TEMP",
    category: "DOWNHOLE / POWER",
    heroLabel: "POWER MODULE",
    overview: "Энергетическая секция, обеспечивающая питание вычислительных, измерительных и телеметрических узлов в составе забойной компоновки.",
    capabilities: [
      "Питание измерительных модулей",
      "Контроль напряжений и температур",
      "Защитные режимы и диагностика",
      "Распределение энергии по внутренней шине",
    ],
    specs: [
      { label: "Назначение", value: "Power distribution" },
      { label: "Диагностика", value: "Voltage / temperature / state" },
      { label: "Интеграция", value: "Downhole module bus" },
      { label: "Защита", value: "По архитектуре конкретного исполнения" },
      { label: "Источник", value: "Батарейный / генераторный по системе" },
      { label: "Электрические параметры", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["INC", "GR", "RES", "MWD"],
    signalPath: ["SOURCE", "REGULATION", "DISTRIBUTION", "MODULE BUS", "DIAGNOSTICS"],
  },
  {
    slug: "vzd",
    code: "VZD",
    index: "06",
    title: "ВЗД",
    shortTitle: "ВЗД",
    text: "Забойный двигатель как часть управляемой компоновки для набора и удержания траектории.",
    signal: "RPM / TORQUE",
    category: "BHA / DRILLING",
    heroLabel: "DOWNHOLE MOTOR",
    overview: "Винтовой забойный двигатель в составе КНБК — силовой элемент для передачи вращения на долото и реализации управляемого бурения.",
    capabilities: [
      "Работа в составе направленной КНБК",
      "Совместимость с телеметрической секцией выше двигателя",
      "Подбор конфигурации под режим бурения",
      "Интеграция в общий инженерный расчёт компоновки",
    ],
    specs: [
      { label: "Тип", value: "Винтовой забойный двигатель" },
      { label: "Роль в КНБК", value: "Drive / steering element" },
      { label: "Совместимость", value: "MWD/LWD BHA" },
      { label: "Контроль", value: "Режимы бурения по наземным параметрам" },
      { label: "Подбор", value: "По диаметру и задаче скважины" },
      { label: "Момент / расход / RPM", value: "Уточняются по конкретной модели" },
    ],
    compatibility: ["INC", "MWD", "GR", "RES"],
    signalPath: ["SURFACE FLOW", "MOTOR", "BIT", "BHA RESPONSE", "SURFACE"],
  },
  {
    slug: "surface",
    code: "SFC",
    index: "07",
    title: "Наземное оборудование",
    shortTitle: "Наземная система",
    text: "Датчики, декодирование, интерфейсы и рабочее место инженера телеметрии.",
    signal: "PRESS / DEPTH",
    category: "SURFACE / ACQUISITION",
    heroLabel: "SURFACE SYSTEM",
    overview: "Наземный контур принимает сигнал от забойной системы, синхронизирует его с параметрами бурения и передаёт декодированные данные в рабочее ПО.",
    capabilities: [
      "Приём и оцифровка сигнала",
      "Декодирование телеметрических кадров",
      "Синхронизация с глубиной, давлением и временем",
      "Передача данных в Drill Monitor и внешние системы",
    ],
    specs: [
      { label: "Входные данные", value: "Pressure / depth / rig channels" },
      { label: "Декодирование", value: "Telemetry frame decoder" },
      { label: "Интерфейсы", value: "Конфигурируются под площадку" },
      { label: "Выход", value: "Live data to workstation" },
      { label: "Диагностика", value: "Signal quality / channel state" },
      { label: "Состав шкафа / датчиков", value: "Уточняется по комплектации" },
    ],
    compatibility: ["MWD", "SW", "INC", "GR", "RES"],
    signalPath: ["PRESSURE", "ACQUISITION", "DECODER", "SYNC", "SOFTWARE"],
  },
  {
    slug: "software",
    code: "SW",
    index: "08",
    title: "ПО мониторинга",
    shortTitle: "Drill Monitor",
    text: "Приём, визуализация и контроль параметров бурения с единой временной шкалой.",
    signal: "LIVE / SYNC",
    category: "SOFTWARE / MONITORING",
    heroLabel: "DRILL MONITOR",
    overview: "Рабочее приложение инженера для отображения телеметрии, контроля траектории и анализа текущего состояния бурения в реальном времени.",
    capabilities: [
      "План/факт траектория скважины",
      "Поток телеметрических и наземных параметров",
      "События, диагностика и качество сигнала",
      "Подготовка данных для анализа и отчётности",
    ],
    specs: [
      { label: "Режим", value: "Live monitoring" },
      { label: "Данные", value: "Downhole + surface channels" },
      { label: "Траектория", value: "Plan / actual" },
      { label: "Диагностика", value: "Signal / equipment / data quality" },
      { label: "Интеграция", value: "Surface decoder / external data" },
      { label: "Платформы / протоколы", value: "Уточняются по версии продукта" },
    ],
    compatibility: ["SFC", "MWD", "INC", "GR", "RES"],
    signalPath: ["DECODER", "STREAM", "SYNC", "VISUALIZATION", "ARCHIVE"],
  },
];

export const equipmentBySlug = Object.fromEntries(equipment.map((item) => [item.slug, item])) as Record<string, EquipmentItem>;
export const equipmentByCode = Object.fromEntries(equipment.map((item) => [item.code, item])) as Record<string, EquipmentItem>;

export const telemetryReadings = [
  ["INC", "87.42°"],
  ["AZM", "126.18°"],
  ["TF", "314.6°"],
  ["GR", "92 API"],
  ["TEMP", "118°C"],
  ["PRES", "64 MPa"],
];

export type EquipmentProfile = {
  applications: string[];
  interfaces: Array<{ label: string; value: string }>;
  deploymentNotes: string[];
};

export const equipmentProfiles: Record<string, EquipmentProfile> = {
  INC: {
    applications: ["Ориентирование КНБК", "Набор и удержание траектории", "Привязка LWD-измерений", "Контроль положения инструмента"],
    interfaces: [
      { label: "Вход", value: "Sensor package / internal bus" },
      { label: "Выход", value: "INC / AZM / TF + diagnostics" },
      { label: "Связь", value: "Downhole module bus" },
      { label: "Поверхность", value: "Через MWD + decoder" },
    ],
    deploymentNotes: ["Размещается в измерительной части КНБК", "Требует корректной пространственной и магнитной привязки", "Численные характеристики задаются паспортом конкретного исполнения"],
  },
  GR: {
    applications: ["Литологическая корреляция", "Геонавигация", "Привязка к разрезу", "Оперативный контроль гамма-фона"],
    interfaces: [
      { label: "Вход", value: "Gamma detector" },
      { label: "Выход", value: "GR / counts / diagnostics" },
      { label: "Связь", value: "LWD / MWD bus" },
      { label: "Архив", value: "High-rate memory channel" },
    ],
    deploymentNotes: ["Работает совместно с ориентационными каналами", "Realtime-поток обычно является подмножеством полной записи", "Конкретная чувствительность зависит от исполнения"],
  },
  RES: {
    applications: ["Геонавигация", "Оценка электрических свойств пород", "Корреляция", "Оперативное сопровождение LWD"],
    interfaces: [
      { label: "Вход", value: "TX/RX measurement section" },
      { label: "Выход", value: "Resistivity channels" },
      { label: "Связь", value: "LWD / MWD bus" },
      { label: "Привязка", value: "Depth / time / orientation" },
    ],
    deploymentNotes: ["Измерительная физика зависит от конструкции инструмента", "Для сайта пока фиксируем функциональный класс без вымышленных частот", "Полный набор каналов уточняется по конкретной модели"],
  },
  MWD: {
    applications: ["Передача ориентационных данных", "Передача LWD-параметров", "Диагностика забойной системы", "Управление приоритетами каналов"],
    interfaces: [
      { label: "Вход", value: "Downhole module bus" },
      { label: "Выход", value: "Encoded telemetry stream" },
      { label: "Наземная часть", value: "Decoder / acquisition" },
      { label: "ПО", value: "Drill Monitor / external systems" },
    ],
    deploymentNotes: ["Является связующим контуром между забоем и поверхностью", "Схема кадров зависит от состава компоновки и задачи", "Скорость и тип канала не фиксируем до выбора конкретной системы"],
  },
  PWR: {
    applications: ["Питание сенсоров", "Питание телеметрии", "Контроль энергетического состояния", "Защитные режимы"],
    interfaces: [
      { label: "Источник", value: "Battery / generator by system" },
      { label: "Выход", value: "Regulated module power" },
      { label: "Диагностика", value: "Voltage / temperature / state" },
      { label: "Связь", value: "Internal diagnostics bus" },
    ],
    deploymentNotes: ["Конфигурация зависит от энергетического баланса КНБК", "Параметры защиты задаются конкретным изделием", "На сайте оставляем архитектуру без фиктивных электрических номиналов"],
  },
  VZD: {
    applications: ["Направленное бурение", "Передача вращения на долото", "Работа в режиме слайдирования", "Формирование управляемой КНБК"],
    interfaces: [
      { label: "Энергия", value: "Hydraulic flow" },
      { label: "Выход", value: "Bit rotation / torque" },
      { label: "Контекст", value: "BHA + drilling parameters" },
      { label: "Контроль", value: "Surface drilling data" },
    ],
    deploymentNotes: ["Подбирается под диаметр, расход и требуемый режим", "Телеметрическая секция обычно располагается в составе КНБК выше силового узла", "Момент, RPM и расход должны приходить из паспорта изделия"],
  },
  SFC: {
    applications: ["Приём телеметрии", "Декодирование", "Сбор наземных параметров", "Синхронизация потоков"],
    interfaces: [
      { label: "Вход", value: "Pressure / depth / rig channels" },
      { label: "Обработка", value: "Acquisition + decoder" },
      { label: "Выход", value: "Normalized live stream" },
      { label: "ПО", value: "Drill Monitor / integrations" },
    ],
    deploymentNotes: ["Состав зависит от конкретной буровой и доступных датчиков", "Наземный контур должен сохранять временную согласованность каналов", "Интерфейсы фиксируются на этапе интеграции"],
  },
  SW: {
    applications: ["Удалённый мониторинг", "Контроль траектории", "Диагностика телеметрии", "История и анализ событий"],
    interfaces: [
      { label: "Вход", value: "Decoder / surface data" },
      { label: "Модель", value: "Time + depth synchronized stream" },
      { label: "Выход", value: "Visualization / archive / export" },
      { label: "Интеграция", value: "External systems by adapter" },
    ],
    deploymentNotes: ["Рабочий интерфейс должен оставаться полезным при частичной потере каналов", "План/факт и телеметрия используют единую временную модель", "Конкретные протоколы будут добавлены после фиксации продукта"],
  },
};

/**
 * Инженерные направления для бегущей строки на главной (§6 строка 03).
 * Это дисциплины, а не клиенты: сайт не должен подразумевать заказчиков,
 * которых мы не можем назвать.
 */
export const partnerDisciplines = [
  { code: "INC", label: "ИНКЛИНОМЕТРИЯ" },
  { code: "GR", label: "ГАММА-КАРОТАЖ" },
  { code: "RES", label: "РЕЗИСТИВИМЕТРИЯ" },
  { code: "MWD", label: "ТЕЛЕМЕТРИЯ" },
  { code: "PWR", label: "ПИТАНИЕ" },
  { code: "ВЗД", label: "ВИНТОВОЙ ДВИГАТЕЛЬ" },
  { code: "SFC", label: "НАЗЕМНЫЙ КОНТУР" },
  { code: "SW", label: "DRILL MONITOR" },
] as const;
