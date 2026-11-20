/* ═══════════════════════════════════════════════
   تعریف مراحل — تمام مختصات «کفِ» شیء هستند (y0)
   بازی خودش آن‌ها را به مرکز تبدیل می‌کند.
   x به سمت قلعه مثبت است؛ سنگر پرتاب در x ≈ -12 قرار دارد.
   ═══════════════════════════════════════════════ */

export const MATERIALS = {
  wood:  { hp: 34, density: 0.55, score: 100, label: 'چوب' },
  ice:   { hp: 20, density: 0.42, score: 150, label: 'یخ' },
  stone: { hp: 85, density: 1.5,  score: 200, label: 'سنگ' },
}

export const PIG_TYPES = {
  small:  { r: 0.42, hp: 16, score: 3000 },
  normal: { r: 0.55, hp: 32, score: 5000 },
  king:   { r: 0.78, hp: 85, score: 10000 },
}

export const BIRD_INFO = {
  red:    { name: 'قرمز', desc: 'جنگنده‌ی همه‌کاره', mass: 2.0, r: 0.55 },
  yellow: { name: 'زرد',  desc: 'شتاب موشکی در هوا', mass: 1.6, r: 0.5  },
  black:  { name: 'سیاه', desc: 'انفجار مهیب',        mass: 2.6, r: 0.58 },
}

export const TNT = { hp: 18, size: { x: 1.15, y: 1.15, z: 1.15 }, score: 1000 }

export const LEVELS = [
  {
    id: 1,
    name: 'آغاز خشم',
    hint: 'پرنده را به عقب بکش و رها کن!',
    birds: ['red', 'red', 'red'],
    star2: 7000,
    star3: 13000,
    items: [
      { k: 'block', mat: 'wood', shape: 'box', x: 7.4,  z: 0, y0: 0, sx: 0.9, sy: 2.0, sz: 0.9 },
      { k: 'block', mat: 'wood', shape: 'box', x: 10.6, z: 0, y0: 0, sx: 0.9, sy: 2.0, sz: 0.9 },
      { k: 'block', mat: 'wood', shape: 'box', x: 9.0,  z: 0, y0: 2.0, sx: 4.8, sy: 0.4, sz: 1.0 },
      { k: 'pig', size: 'normal', x: 9.0, z: 0, y0: 0 },
      { k: 'pig', size: 'small',  x: 9.0, z: 0, y0: 2.4 },
    ],
  },
  {
    id: 2,
    name: 'برج یخی',
    hint: 'زرد را در هوا کلیک کن تا شتاب بگیرد!',
    birds: ['yellow', 'red', 'red'],
    star2: 9000,
    star3: 16500,
    items: [
      { k: 'block', mat: 'ice', shape: 'box', x: 8.0,  z: 0, y0: 0, sx: 0.8, sy: 2.5, sz: 0.8 },
      { k: 'block', mat: 'ice', shape: 'box', x: 11.0, z: 0, y0: 0, sx: 0.8, sy: 2.5, sz: 0.8 },
      { k: 'block', mat: 'ice', shape: 'box', x: 9.5,  z: 0, y0: 2.5, sx: 4.3, sy: 0.35, sz: 0.9 },
      { k: 'pig', size: 'normal', x: 9.5, z: 0, y0: 2.85 },
      { k: 'block', mat: 'stone', shape: 'box', x: 14.2, z: 0, y0: 0, sx: 1.3, sy: 1.3, sz: 1.3 },
      { k: 'pig', size: 'small',  x: 14.2, z: 0, y0: 1.3 },
      { k: 'pig', size: 'small',  x: 15.9, z: 0, y0: 0 },
    ],
  },
  {
    id: 3,
    name: 'قلعه‌ی چوبی',
    hint: 'به طبقه‌های بالایی بزن تا همه بریزند روی هم!',
    birds: ['red', 'red', 'yellow', 'red'],
    star2: 14000,
    star3: 23500,
    items: [
      { k: 'block', mat: 'wood', shape: 'box', x: 7.2,  z: 0, y0: 0, sx: 0.85, sy: 2.0, sz: 0.85 },
      { k: 'block', mat: 'wood', shape: 'box', x: 12.8, z: 0, y0: 0, sx: 0.85, sy: 2.0, sz: 0.85 },
      { k: 'block', mat: 'wood', shape: 'box', x: 10.0, z: 0, y0: 2.0, sx: 6.9, sy: 0.4, sz: 1.0 },
      { k: 'block', mat: 'wood', shape: 'box', x: 8.6,  z: 0, y0: 2.4, sx: 0.8, sy: 1.6, sz: 0.8 },
      { k: 'block', mat: 'wood', shape: 'box', x: 11.4, z: 0, y0: 2.4, sx: 0.8, sy: 1.6, sz: 0.8 },
      { k: 'block', mat: 'wood', shape: 'box', x: 10.0, z: 0, y0: 4.0, sx: 4.2, sy: 0.4, sz: 1.0 },
      { k: 'pig', size: 'normal', x: 10.0, z: 0, y0: 0 },
      { k: 'pig', size: 'small',  x: 10.0, z: 0, y0: 2.4 },
      { k: 'pig', size: 'small',  x: 10.0, z: 0, y0: 4.4 },
      { k: 'block', mat: 'stone', shape: 'box', x: 15.4, z: 0, y0: 0, sx: 1.15, sy: 2.2, sz: 1.15 },
      { k: 'pig', size: 'small',  x: 15.4, z: 0, y0: 2.2 },
    ],
  },
  {
    id: 4,
    name: 'لانه‌ی دردسر',
    hint: 'دینامیت را هدف بگیر! پرنده‌ی سیاه در این مرحله معرفی می‌شود.',
    birds: ['red', 'black', 'yellow', 'red'],
    star2: 17000,
    star3: 26000,
    items: [
      { k: 'tnt', x: 10.0, z: 0, y0: 0 },
      { k: 'block', mat: 'stone', shape: 'box', x: 8.1,  z: 0, y0: 0, sx: 1.0, sy: 2.2, sz: 1.0 },
      { k: 'block', mat: 'stone', shape: 'box', x: 11.9, z: 0, y0: 0, sx: 1.0, sy: 2.2, sz: 1.0 },
      { k: 'block', mat: 'stone', shape: 'box', x: 10.0, z: 0, y0: 2.2, sx: 5.6, sy: 0.4, sz: 1.1 },
      { k: 'pig', size: 'normal', x: 10.0, z: 0, y0: 2.6 },
      { k: 'pig', size: 'small',  x: 6.6,  z: 0, y0: 0 },
      { k: 'pig', size: 'small',  x: 13.4, z: 0, y0: 0 },
      { k: 'block', mat: 'ice', shape: 'box', x: 9.0, z: -1.9, y0: 0, sx: 0.7, sy: 1.8, sz: 0.7 },
      { k: 'block', mat: 'ice', shape: 'box', x: 11.0, z: -1.9, y0: 0, sx: 0.7, sy: 1.8, sz: 0.7 },
      { k: 'block', mat: 'ice', shape: 'box', x: 10.0, z: -1.9, y0: 1.8, sx: 3.3, sy: 0.3, sz: 0.8 },
      { k: 'pig', size: 'small',  x: 10.0, z: -1.9, y0: 2.1 },
    ],
  },
  {
    id: 5,
    name: 'دژ پادشاه',
    hint: 'پادشاه خوک‌ها را با دینامیت و پرنده‌ی سیاه از پای دربیاور!',
    birds: ['yellow', 'red', 'black', 'red', 'yellow'],
    star2: 21000,
    star3: 31000,
    items: [
      { k: 'tnt', x: 10.0, z: 0, y0: 0, sx: 1.45, sy: 1.45, sz: 1.45 },
      { k: 'pig', size: 'king', x: 10.0, z: 0, y0: 1.45 },
      { k: 'block', mat: 'stone', shape: 'box', x: 6.9,  z: 0, y0: 0, sx: 1.25, sy: 3.0, sz: 1.25 },
      { k: 'block', mat: 'stone', shape: 'box', x: 13.1, z: 0, y0: 0, sx: 1.25, sy: 3.0, sz: 1.25 },
      { k: 'block', mat: 'stone', shape: 'box', x: 10.0, z: 0, y0: 3.06, sx: 8.0, sy: 0.5, sz: 1.3 },
      { k: 'block', mat: 'wood', shape: 'box', x: 10.0, z: 0, y0: 3.56, sx: 3.2, sy: 0.35, sz: 1.1 },
      { k: 'pig', size: 'small',  x: 6.9,  z: 0, y0: 3.0 },
      { k: 'pig', size: 'small',  x: 13.1, z: 0, y0: 3.0 },
      { k: 'block', mat: 'ice', shape: 'box', x: 8.1, z: -2.3, y0: 0, sx: 0.9, sy: 2.6, sz: 0.9 },
      { k: 'block', mat: 'ice', shape: 'box', x: 11.9, z: -2.3, y0: 0, sx: 0.9, sy: 2.6, sz: 0.9 },
      { k: 'block', mat: 'ice', shape: 'box', x: 10.0, z: -2.3, y0: 2.6, sx: 4.6, sy: 0.35, sz: 0.9 },
      { k: 'pig', size: 'normal', x: 10.0, z: -2.3, y0: 2.96 },
    ],
  },
]
