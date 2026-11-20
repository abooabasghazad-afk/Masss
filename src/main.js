/* ═══════════════════════════════════════════════
   «پرندگان خشمگین سه‌بعدی» — نقطهٔ ورود و رابط کاربری
   ═══════════════════════════════════════════════ */
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/vazirmatn/900.css'
import './style.css'
import { Game } from './game.js'
import { LEVELS } from './levels.js'
import { audio } from './audio.js'

const faNum = (n) => Math.round(n).toLocaleString('fa-IR')
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => [...document.querySelectorAll(sel)]

/* ══════════ ذخیرهٔ پیشرفت ══════════ */
const SAVE_KEY = 'ab3d_progress_v1'
const store = {
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY))
      if (raw && typeof raw === 'object') return { unlocked: 1, stars: {}, best: {}, ...raw }
    } catch { /* تازه‌کار */ }
    return { unlocked: 1, stars: {}, best: {} }
  },
  save(p) { localStorage.setItem(SAVE_KEY, JSON.stringify(p)) },
}
let progress = store.load()
const totalStars = () => Object.values(progress.stars).reduce((a, b) => a + b, 0)
const doneCount = () => Object.keys(progress.stars).length

/* ══════════ آیکون‌های پرنده برای سبد ══════════ */
const BIRD_COLORS = { red: '#e63b2e', yellow: '#ffd83d', black: '#2b2b33' }
function birdIconSVG(type) {
  const c = BIRD_COLORS[type]
  const belly = type === 'red' ? '#f8e3bd' : type === 'yellow' ? '#fff3b0' : '#454550'
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="26" r="16.5" fill="${c}"/>
    <ellipse cx="24" cy="33" rx="9.5" ry="6" fill="${belly}"/>
    <circle cx="18.5" cy="22" r="4.1" fill="#fff"/><circle cx="31.5" cy="22" r="4.1" fill="#fff"/>
    <circle cx="18.5" cy="22.6" r="2" fill="#141414"/><circle cx="31.5" cy="22.6" r="2" fill="#141414"/>
    <path d="M13.4 15.2 L22.6 19 L13.9 19.4 Z" fill="#1c1c1c"/>
    <path d="M34.6 15.2 L25.4 19 L34.1 19.4 Z" fill="#1c1c1c"/>
    <path d="M22 28 L24 32.4 L26 28 Z" fill="#f6a21e"/>
  </svg>`
}

function renderTray(birdsAll, used) {
  const tray = $('#birds-tray')
  tray.innerHTML = ''
  birdsAll.forEach((t, i) => {
    const d = document.createElement('div')
    d.className = 'tray-bird' + (i < used ? ' used' : '') + (i === used ? ' current' : '')
    d.innerHTML = birdIconSVG(t)
    d.title = t === 'red' ? 'قرمز' : t === 'yellow' ? 'زرد' : 'سیاه'
    tray.appendChild(d)
  })
}

/* ══════════ مدیریت صفحه‌ها ══════════ */
const screens = { menu: $('#screen-menu'), levels: $('#screen-levels'), hud: $('#screen-hud') }
function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name
}
function setPanel(id, show) { $(id).hidden = !show }

let toastTimer = null
function toast(msg) {
  const el = $('#toast')
  el.textContent = msg
  el.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.hidden = true }, 3400)
}

/* ══════════ ساخت بازی ══════════ */
const canvas = $('#game-canvas')

const ui = {
  onScore(score) { $('#hud-score').textContent = faNum(score) },
  onLevel(text) { $('#hud-level').textContent = text },
  onBirds(birdsAll, used) { renderTray(birdsAll, used) },
  onPigsLeft(n) {
    const el = $('#pigs-left')
    el.hidden = false
    el.textContent = `🐷 × ${faNum(n)}`
  },
  abilityHint(show) { $('#ability-hint').hidden = !show },
  toast,
  onWin({ score, stars, level }) {
    // ذخیرهٔ پیشرفت
    const id = String(level.id)
    progress.stars[id] = Math.max(progress.stars[id] ?? 0, stars)
    progress.best[id] = Math.max(progress.best[id] ?? 0, score)
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, level.id + 1))
    store.save(progress)

    $('#win-score').textContent = faNum(score)
    $('#win-best').textContent = faNum(progress.best[id])
    // ستاره‌ها با تأخیر یکی‌یکی روشن می‌شوند
    const starEls = $$('.win-star')
    starEls.forEach((el) => el.classList.remove('earned'))
    starEls.forEach((el, i) => {
      if (i < stars) {
        setTimeout(() => {
          el.classList.add('earned')
          audio.starDing(i)
        }, 420 + i * 380)
      }
    })
    $('#btn-next-level').style.display = level.id < LEVELS.length ? '' : 'none'
    setPanel('#panel-win', true)
  },
  onLose() { setPanel('#panel-lose', true) },
}

const game = new Game(canvas, ui)
game.backToMenu()

/* ══════════ دکمه‌ها ══════════ */
const startAudio = () => { audio.ensure(); audio.startMusic(); audio.startAmbientBirds() }

$('#btn-play').addEventListener('click', () => { audio.click(); startAudio(); renderLevels(); showScreen('levels') })
$('#btn-howto').addEventListener('click', () => { audio.click(); startAudio(); setPanel('#modal-howto', true) })
$('#btn-howto-close').addEventListener('click', () => { audio.click(); setPanel('#modal-howto', false) })

const muteMenuLabel = () => { $('#btn-mute-menu .mute-label').textContent = audio.muted ? 'صدا: خاموش' : 'صدا: روشن' }
const soundIcons = () => {
  $('#btn-mute .ic-sound-on').style.display = audio.muted ? 'none' : ''
  $('#btn-mute .ic-sound-off').style.display = audio.muted ? '' : 'none'
}
const toggleMute = () => { audio.ensure(); audio.toggleMute(); muteMenuLabel(); soundIcons(); audio.click() }
$('#btn-mute').addEventListener('click', toggleMute)
$('#btn-mute-menu').addEventListener('click', toggleMute)

// انتخاب مرحله
$('#btn-levels-back').addEventListener('click', () => { audio.click(); refreshMenuStats(); game.backToMenu(); showScreen('menu') })

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
function renderLevels() {
  const grid = $('#levels-grid')
  grid.innerHTML = ''
  LEVELS.forEach((level, i) => {
    const locked = level.id > progress.unlocked
    const stars = progress.stars[String(level.id)] ?? 0
    const card = document.createElement('button')
    card.className = 'level-card' + (locked ? ' locked' : '')
    card.setAttribute('aria-label', locked ? `مرحله ${level.id} (قفل)` : `مرحله ${level.id} — ${level.name}`)
    card.innerHTML = `
      ${locked ? `<svg class="lock-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ''}
      <div class="level-num">${faNum(level.id)}</div>
      <div class="level-name">${level.name}</div>
      <div class="level-stars">
        ${[0, 1, 2].map((s) => `<svg viewBox="0 0 24 24" class="${s < stars ? 'earned' : ''}"><path d="${STAR_PATH}"/></svg>`).join('')}
      </div>`
    if (!locked) {
      card.addEventListener('click', () => {
        audio.click(); startAudio()
        setPanel('#panel-win', false); setPanel('#panel-lose', false); setPanel('#panel-pause', false)
        showScreen('hud')
        game.loadLevel(i)
      })
    }
    grid.appendChild(card)
  })
  $('#levels-total-stars').textContent = faNum(totalStars())
}

function refreshMenuStats() {
  $('#menu-total-stars').textContent = faNum(totalStars())
  $('#menu-levels-done').textContent = faNum(doneCount())
  muteMenuLabel()
}
refreshMenuStats()
soundIcons()

// HUD
$('#btn-pause').addEventListener('click', () => { if (!game.canPause()) return; audio.click(); game.setPaused(true); setPanel('#panel-pause', true) })
$('#btn-restart').addEventListener('click', () => { audio.click(); setPanel('#panel-pause', false); game.setPaused(false); game.retryLevel() })
$('#btn-camera').addEventListener('click', () => { audio.click(); game.resetCamera() })

// پنل مکث
$('#btn-resume').addEventListener('click', () => { audio.click(); game.setPaused(false); setPanel('#panel-pause', false) })
$('#btn-pause-restart').addEventListener('click', () => { audio.click(); game.setPaused(false); setPanel('#panel-pause', false); game.retryLevel() })
$('#btn-pause-levels').addEventListener('click', () => { audio.click(); game.setPaused(false); setPanel('#panel-pause', false); renderLevels(); game.backToMenu(); showScreen('levels') })

// پنل پیروزی
$('#btn-next-level').addEventListener('click', () => { audio.click(); setPanel('#panel-win', false); game.nextLevel() })
$('#btn-win-replay').addEventListener('click', () => { audio.click(); setPanel('#panel-win', false); game.retryLevel() })
$('#btn-win-levels').addEventListener('click', () => { audio.click(); setPanel('#panel-win', false); renderLevels(); game.backToMenu(); showScreen('levels') })

// پنل باخت
$('#btn-lose-retry').addEventListener('click', () => { audio.click(); setPanel('#panel-lose', false); game.retryLevel() })
$('#btn-lose-levels').addEventListener('click', () => { audio.click(); setPanel('#panel-lose', false); renderLevels(); game.backToMenu(); showScreen('levels') })

// میان‌بر کیبورد: R = شروع دوباره، Esc = مکث
window.addEventListener('keydown', (e) => {
  if (screens.hud.hidden) return
  if (e.key === 'r' || e.key === 'R') game.retryLevel()
  else if (e.key === 'Escape' && game.canPause() && $('#panel-pause').hidden) { game.setPaused(true); setPanel('#panel-pause', true) }
})

// شروع روی منو
showScreen('menu')
