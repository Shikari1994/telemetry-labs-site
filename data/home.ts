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
    text: "Корпоративный сайт НПК «Геотехнавигация»: компания, оборудование и собственный софт — одной историей на скролле.",
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
    text: "Мониторинг бурения в реальном времени и цифровой паспорт оборудования: приложение для офиса и телефон для работы прямо на буровой.",
    tags: ["REACT 19", "ELECTRON", "EXPO", "WEBSOCKET"],
    caseId: "drill-monitor",
    href: `${SITE_URL}#software`,
    hrefLabel: "Демо на geo-tn.com",
  },
];

/**
 * What we build, three directions — the text column that opens 02. Each one
 * points at the place on this page where it can be seen working, so the
 * offer stays backed by a real work; `points` are things that work contains.
 */
export const services = [
  {
    id: "service-web",
    code: "WEB",
    stack: "ASTRO · GSAP",
    title: "Сайты",
    text: "Сайт, который рассказывает о продукте, а не перечисляет его.",
    points: ["подача продукта на скролле", "видео и анимация", "быстрая загрузка"],
    proof: { label: "geo-tn.com", to: "case-site" },
  },
  {
    id: "service-3d",
    code: "3D",
    stack: "THREE.JS · GLSL",
    title: "3D-визуализация",
    text: "Показываем в 3D то, что трудно объяснить словами.",
    points: ["3D-сцены на сайте", "визуализация данных", "траектория скважины в 3D"],
    proof: { label: "3D-траектория", to: "screen-survey" },
  },
  {
    id: "service-app",
    code: "APP",
    stack: "ELECTRON · EXPO",
    title: "Приложения",
    text: "Настольные и мобильные приложения для работы с живыми данными.",
    points: ["Windows и Android", "данные в реальном времени", "сервер и база данных"],
    proof: { label: "Drill Monitor", to: "drill-monitor" },
  },
] as const satisfies readonly {
  id: string;
  code: string;
  stack: string;
  title: string;
  text: string;
  points: readonly string[];
  proof: { label: string; to: string };
}[];

/** The open bay under the cartridges: the free slots as an invitation. */
export const openBay = {
  tag: "SLOT 03 · 04 / OPEN",
  text: "Два слота свободны. Следующим может стать ваш проект.",
} as const;

/**
 * The short offer that closes each case section: what that section shows,
 * turned into what we can build for a visitor.
 */
export const offers = {
  site: { tag: "САЙТЫ", text: "Сделаем сайт, который так же ведёт посетителя от первого экрана до заявки — с анимацией, видео и 3D под ваш продукт." },
  monitor: { tag: "ПЛАТФОРМЫ", text: "Построим систему под ваши данные: от датчика или станции на объекте до экрана компьютера и телефона." },
  screens: { tag: "ИНТЕРФЕЙСЫ", text: "Спроектируем интерфейс, в котором сложные данные понятны с первого взгляда." },
  stack: { tag: "СТЕК", text: "Технологии подбираем под задачу, а не по привычке: веб, десктоп, Android, 3D и работа в реальном времени." },
} as const;

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
 * Case 02: Drill Monitor as a stack of layers, bottom (rig) to top (screens).
 * The 3D model draws them in this order; the list beside it reads top-down.
 */
export const monitorLayers = [
  { tier: "RIG", title: "Буровая", text: "Данные бурения приходят в отраслевых стандартах WITS и WITSML — система встраивается в то, что уже есть на буровой." },
  { tier: "AGENT", title: "Агент", text: "Лёгкий агент на буровой собирает данные и передаёт их на сервер." },
  { tier: "SERVER", title: "Сервер", text: "Хранит скважины, рейсы и оборудование, сам считает наработку приборов и раздаёт свежие данные всем экранам." },
  { tier: "CLIENTS", title: "Экраны", text: "Десктоп для офиса и Android для поля: оба видят одну и ту же картину в реальном времени." },
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
 * The technology orbit: what the two works are built with. `work` colours a
 * tag by the work that uses it; "both" means both builds use it.
 */
export type OrbitWork = "site" | "monitor" | "both";
export const orbitTags: readonly { label: string; work: OrbitWork }[] = [
  { label: "THREE.JS", work: "both" },
  { label: "ASTRO", work: "site" },
  { label: "GSAP", work: "site" },
  { label: "SCROLLTRIGGER", work: "site" },
  { label: "LENIS", work: "site" },
  { label: "GLSL", work: "site" },
  { label: "WEBGL", work: "site" },
  { label: "REACT 19", work: "monitor" },
  { label: "TYPESCRIPT", work: "monitor" },
  { label: "ELECTRON", work: "monitor" },
  { label: "VITE", work: "monitor" },
  { label: "EXPO", work: "monitor" },
  { label: "REACT NATIVE", work: "monitor" },
  { label: "FASTIFY", work: "monitor" },
  { label: "POSTGRESQL", work: "monitor" },
  { label: "WEBSOCKET", work: "monitor" },
  { label: "ZUSTAND", work: "monitor" },
  { label: "ECHARTS", work: "monitor" },
  { label: "R3F", work: "monitor" },
  { label: "DND-KIT", work: "monitor" },
  { label: "WITSML", work: "monitor" },
  { label: "NFC", work: "monitor" },
  { label: "PYTHON", work: "monitor" },
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
  { id: "case-site", index: "03", label: "Витрина · geo-tn.com", subs: [] },
  { id: "drill-monitor", index: "04", label: "Drill Monitor", subs: [] },
  {
    id: "screens",
    index: "05",
    label: "Экраны",
    subs: screens.map((item) => ({ id: `screen-${item.slug}`, label: `${item.code} · ${item.title}` })),
  },
  { id: "stack", index: "06", label: "Стек", subs: [] },
  { id: "request", index: "07", label: "Связаться", subs: [] },
];
