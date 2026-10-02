import type { MediaAssetId } from "@/lib/media/manifest";

/**
 * Homepage copy lives here rather than inside each section, because two things
 * read it: the section that renders it, and the TREE rail that lists every
 * section and its sub-topics. Sharing one source keeps the rail's ids and
 * labels from drifting away from the anchors they point at.
 *
 * The page is a portfolio and a showcase: each work is shown, not dissected,
 * so copy stays to one line per beat. Everything said still describes what
 * the work actually contains (read from the geo-tn.com build and the Drill
 * Monitor source), never an estimate or a promise.
 */

export const owner = {
  name: "АЛЬФА КОД",
} as const;

export const SITE_URL = "https://geo-tn.com/";

export type Work = {
  id: string;
  index: string;
  media: MediaAssetId;
  kicker: string;
  title: string;
  text: string;
  tags: readonly string[];
  /** Anchor of the case study on this page. */
  caseId: string;
  href: string;
  hrefLabel: string;
};

export const works: readonly Work[] = [
  {
    id: "work-site",
    index: "01",
    media: "gtn-hero",
    kicker: "WEBSITE / STATIC BUILD",
    title: "geo-tn.com",
    text: "Корпоративный сайт НПК «Геотехнавигация» — производителя телеметрии для бурения.",
    tags: ["ASTRO", "GSAP", "WEBGL", "THREE.JS"],
    caseId: "case-site",
    href: SITE_URL,
    hrefLabel: "geo-tn.com",
  },
  {
    id: "work-monitor",
    index: "02",
    media: "dm-drilling",
    kicker: "PRODUCT / REALTIME",
    title: "Drill Monitor",
    text: "Мониторинг бурения в реальном времени и цифровой паспорт оборудования.",
    tags: ["REACT 19", "ELECTRON", "EXPO", "WEBSOCKET"],
    caseId: "drill-monitor",
    href: `${SITE_URL}#software`,
    hrefLabel: "Демо на geo-tn.com",
  },
];

/**
 * What we build, three directions: the channels of 02's cartridge deck. Each
 * lights when a cartridge that shows it is seated (`by`: the works, by id),
 * and points at the place on this page where it can be seen working, so the
 * offer stays backed by a real work.
 */
export const services = [
  {
    id: "service-web",
    code: "WEB",
    title: "Сайты",
    text: "Сайт, который рассказывает о продукте, а не перечисляет его.",
    by: ["work-site"],
    proof: { label: "geo-tn.com", to: "case-site" },
  },
  {
    id: "service-3d",
    code: "3D",
    title: "3D-визуализация",
    text: "Показываем в 3D то, что трудно объяснить словами.",
    by: ["work-site", "work-monitor"],
    proof: { label: "3D-траектория", to: "screen-survey" },
  },
  {
    id: "service-app",
    code: "APP",
    title: "Приложения",
    text: "Настольные и мобильные приложения для работы с живыми данными.",
    by: ["work-monitor"],
    proof: { label: "Drill Monitor", to: "drill-monitor" },
  },
] as const satisfies readonly {
  id: string;
  code: string;
  title: string;
  text: string;
  by: readonly string[];
  proof: { label: string; to: string };
}[];

/** The deck's empty slots after the works: the invitation that closes 02. */
export const openBay = {
  tag: "SLOT 03 · 04 / OPEN",
  text: "Два слота свободны. Следующим может стать ваш проект.",
} as const;

/**
 * The short offer that closes each case: what the case shows, turned into
 * what we can build for a visitor. A case spread over two sections (Drill
 * Monitor: 04 and 05) gets one offer, at its end.
 */
export const offers = {
  site: { tag: "САЙТЫ", text: "Сделаем сайт, который так же ведёт посетителя от первого экрана до заявки — с анимацией, видео и 3D под ваш продукт." },
  monitor: { tag: "ПЛАТФОРМЫ", text: "Построим систему под ваши данные: от станции на объекте до понятного экрана на компьютере и в телефоне." },
  stack: { tag: "СТЕК", text: "Технологии подбираем под задачу, а не по привычке: веб, десктоп, Android, 3D и работа в реальном времени." },
} as const;

/**
 * Every case opens the same way: a line on what the work is (the head's
 * lead), then this passport — who it is for, the task, where it runs and
 * what we did — and only then its features. Facts only: Drill Monitor's
 * link to working rigs is still being integrated, so its passport speaks
 * of who it is built for, not of where it is installed.
 */
export type PassportFact = { label: string; text: string };
export const passports = {
  site: [
    { label: "Для кого", text: "Компании, которые выбирают оборудование и программы для бурения." },
    { label: "Задача", text: "Рассказать о компании, её приборах и программе одной историей." },
    { label: "Где работает", text: "geo-tn.com, на компьютере и на телефоне." },
    { label: "Что сделали", text: "Всё: дизайн, анимацию, 3D и разработку." },
  ],
  monitor: [
    { label: "Для кого", text: "Инженеры на буровой и специалисты в офисе." },
    { label: "Задача", text: "Заменить разрозненные программы, таблицы и бумагу одной системой." },
    { label: "Где работает", text: "Компьютер в офисе и Android-телефон у скважины." },
    { label: "Что сделали", text: "Всё: дизайн, приложения для Windows и Android, сервер и 3D." },
  ],
} as const satisfies Record<string, readonly PassportFact[]>;

/** Works index band: the filled slots, then the open ones. */
export const slots = [
  { code: "WEB", label: "GEO-TN.COM", live: true },
  { code: "APP", label: "DRILL MONITOR", live: true },
  { code: "···", label: "SLOT OPEN", live: false },
  { code: "···", label: "SLOT OPEN", live: false },
] as const;

export const heroReadings = [
  ["WORKS", "02"],
  ["LANG", "TS"],
  ["OPEN SLOTS", "02"],
  ["DOMAIN", "OIL&GAS"],
  ["PLATFORMS", "03"],
  ["SCREENS", "05"],
] as const;

/** Ticker: what the two works are built with. */
export const disciplines = [
  { code: "AST", label: "ASTRO" },
  { code: "GS", label: "GSAP / SCROLLTRIGGER" },
  { code: "GL", label: "THREE.JS / GLSL" },
  { code: "R19", label: "REACT 19 / TS STRICT" },
  { code: "EL", label: "ELECTRON" },
  { code: "RN", label: "EXPO / REACT NATIVE" },
  { code: "WS", label: "WEBSOCKET" },
  { code: "PG", label: "FASTIFY / POSTGRESQL" },
  { code: "XML", label: "WITS / WITSML" },
  { code: "NFC", label: "NDEF" },
] as const;

/**
 * Case 01 showcase: what a visitor meets on geo-tn.com, one capture per beat.
 * The captures ride a 3D ring; each line says what the screen does, not how.
 */
export const siteShowcase = [
  {
    slug: "hero",
    code: "01",
    title: "Первый экран",
    text: "Видео во весь экран и два входа: в программу и в оборудование.",
    shot: "gtn-hero",
  },
  {
    slug: "globe",
    code: "02",
    title: "География",
    text: "Интерактивный 3D-глобус показывает масштаб: проекты по всей России.",
    shot: "gtn-globe",
  },
  {
    slug: "atlas",
    code: "03",
    title: "О компании",
    text: "Города, факты и услуги раскрываются по мере прокрутки, не уводя со страницы.",
    shot: "gtn-atlas",
  },
  {
    slug: "catalog",
    code: "04",
    title: "Каталог продукции",
    text: "Семь изделий, у каждого — своя страница.",
    shot: "gtn-catalog",
  },
  {
    slug: "stand",
    code: "05",
    title: "Демо Drill Monitor",
    text: "Пять экранов программы можно пролистать прямо на сайте.",
    shot: "gtn-video",
  },
  {
    slug: "mobile",
    code: "06",
    title: "Мобильное приложение",
    text: "Android-версия программы на трёх телефонах, которые движутся вместе со скроллом.",
    shot: "gtn-mobile",
  },
] as const satisfies readonly {
  slug: string;
  code: string;
  title: string;
  text: string;
  shot: MediaAssetId;
}[];

/**
 * Case 02, where the system works: a stack of places, bottom (the rig the
 * data comes from) to top (the office). The 3D model draws them in this
 * order; the list beside it reads top-down.
 */
export const monitorLayers = [
  { tier: "RIG", title: "Буровая", text: "Данные приходят со станции на буровой по отраслевым стандартам WITS и WITSML: система встраивается в то, что уже есть." },
  { tier: "SERVER", title: "Сервер", text: "Хранит скважины, рейсы и приборы, сам считает наработку и сразу раздаёт свежие данные офису и полю." },
  { tier: "FIELD", title: "Поле", text: "Android-телефон у скважины: та же картина, что в офисе, и паспорт прибора под рукой." },
  { tier: "OFFICE", title: "Офис", text: "Приложение для Windows: инженеры и руководители видят бурение, траекторию и парк приборов в реальном времени." },
] as const;

/** Case 02, horizontal deck: the screens, one line each. */
export const screens = [
  {
    slug: "drilling",
    index: "01",
    code: "DRL",
    media: "dm-drilling",
    title: "Мониторинг бурения",
    text: "Параметры бурения в реальном времени. Позволяет вести бурение в допустимых значениях из любой точки страны.",
  },
  {
    slug: "survey",
    index: "02",
    code: "SRV",
    media: "dm-survey",
    title: "Траектория скважины",
    text: "По замерам система строит ствол скважины в 3D и сравнивает его с проектной траекторией.",
  },
  {
    slug: "logging",
    index: "03",
    code: "LOG",
    media: "dm-logging",
    title: "Каротаж",
    text: "Каротажный планшет строится по глубине автоматически и выгружается в PDF и в формат LAS.",
  },
  {
    slug: "fleet",
    index: "04",
    code: "EQP",
    media: "dm-fleet",
    title: "Паспорт оборудования",
    text: "Все приборы в одном реестре: статус, наработка по рейсам и готовый паспорт для выгрузки в Excel.",
  },
  {
    slug: "mobile",
    index: "05",
    code: "APK",
    media: "dm-mobile",
    title: "Android и NFC",
    text: "Достаточно поднести телефон к метке на приборе: паспорт откроется сразу, даже если приложение было закрыто.",
  },
] as const satisfies readonly {
  slug: string;
  index: string;
  code: string;
  media: MediaAssetId;
  title: string;
  text: string;
}[];

/**
 * 06, the stack as one circuit board: what the two works are built with,
 * one chip per technology, grouped by where it works. Zones and their chips
 * are listed in the order the board assembles (the data's way from the rig
 * to the screens, then the shared 3D, then the site); `work` colours a zone
 * by the work it belongs to. Each note is one line on what the chip does
 * for the work. Where each chip sits is in lib/stack/board.ts.
 */
export type StackWork = "site" | "monitor" | "both";
export type StackChip = { label: string; note: string };
export const stackZones: readonly { id: string; label: string; work: StackWork; chips: readonly StackChip[] }[] = [
  {
    id: "rig",
    label: "RIG",
    work: "monitor",
    chips: [
      { label: "PYTHON", note: "Агент для буровой: читает данные станции и передаёт их на сервер." },
      { label: "WITSML", note: "Отраслевой стандарт обмена данными бурения: система принимает данные и в нём." },
    ],
  },
  {
    id: "server",
    label: "SERVER",
    work: "monitor",
    chips: [
      { label: "FASTIFY", note: "Сервер: принимает данные с буровой и раздаёт их программам." },
      { label: "POSTGRESQL", note: "База: скважины, рейсы, приборы и их наработка." },
      { label: "WEBSOCKET", note: "Живой поток: свежие данные приходят в офис и в поле без обновления экрана." },
    ],
  },
  {
    id: "office",
    label: "OFFICE / WINDOWS",
    work: "monitor",
    chips: [
      { label: "ELECTRON", note: "Программа для Windows, собранная из того же кода, что и веб-версия." },
      { label: "REACT 19", note: "Интерфейс программы: экраны, таблицы и формы." },
      { label: "TYPESCRIPT", note: "Строгие типы: меньше ошибок в программе, с которой работают каждый день." },
      { label: "VITE", note: "Быстрая сборка: новые версии программы выходят без задержек." },
      { label: "ZUSTAND", note: "Общее состояние: на всех экранах программы одни и те же данные." },
      { label: "ECHARTS", note: "Графики параметров бурения." },
      { label: "DND-KIT", note: "Сборка КНБК перетаскиванием элементов мышью." },
      { label: "R3F", note: "Траектория скважины в 3D прямо в программе." },
    ],
  },
  {
    id: "field",
    label: "FIELD / ANDROID",
    work: "monitor",
    chips: [
      { label: "EXPO", note: "Android-приложение для работы у скважины." },
      { label: "REACT NATIVE", note: "Интерфейс телефона на том же подходе, что и программа для Windows." },
      { label: "NFC", note: "Поднесите телефон к метке на приборе, и откроется его паспорт." },
    ],
  },
  {
    id: "shared",
    label: "SHARED",
    work: "both",
    chips: [{ label: "THREE.JS", note: "3D в обеих работах: сцены на сайте и траектория скважины в программе." }],
  },
  {
    id: "site",
    label: "GEO-TN.COM",
    work: "site",
    chips: [
      { label: "WEBGL", note: "3D-графика прямо в браузере, без плагинов." },
      { label: "GLSL", note: "Собственные визуальные эффекты сайта." },
      { label: "LENIS", note: "Плавная прокрутка страницы." },
      { label: "SCROLLTRIGGER", note: "Сцены, которые меняются по мере прокрутки страницы." },
      { label: "GSAP", note: "Анимация сайта, связанная с прокруткой." },
      { label: "ASTRO", note: "Каркас сайта: страницы открываются быстро." },
    ],
  },
];

export type TreeSub = { id: string; label: string };
export type TreeNode = { id: string; index: string; label: string; subs: TreeSub[] };

/**
 * The rail's TREE. `id` is the anchor of the section, each sub `id` is the
 * anchor of an element inside it; both must exist in the rendered page.
 */
export const homeTree: TreeNode[] = [
  { id: "top", index: "01", label: "Обзор", subs: [] },
  {
    id: "works",
    index: "02",
    label: "Что делаем",
    subs: works.map((work) => ({ id: work.id, label: `${work.index} · ${work.title}` })),
  },
  { id: "case-site", index: "03", label: "geo-tn.com", subs: [] },
  { id: "drill-monitor", index: "04", label: "Drill Monitor", subs: [] },
  {
    id: "screens",
    index: "05",
    label: "Возможности",
    subs: screens.map((item) => ({ id: `screen-${item.slug}`, label: `${item.code} · ${item.title}` })),
  },
  { id: "stack", index: "06", label: "Стек", subs: [] },
  { id: "request", index: "07", label: "Связаться", subs: [] },
];
