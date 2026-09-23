import './style.css';
import {
  ERAS, advanceTime, buyEra, buyUpgrade, createInitialState, getEchoGain,
  getEraCost, getEraRate, getEraTitle, getFinaleProgress, getObjective,
  getProduction, getPulseValue, getStabilityCost, getUpgradeCost,
  pulseTimeline, restorePrimeTimeline, rewindTimeline, stabilizeEra,
  type EraId, type TimeEvent, type UpgradeId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app');
const fmt = (value: number): string => {
  if (!Number.isFinite(value)) return 'MAX';
  if (value < 1_000) return value < 10 && value % 1 ? value.toFixed(1) : Math.floor(value).toLocaleString();
  const units: Array<[number, string]> = [[1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [scale, name] = units.find(([scale]) => value >= scale) ?? [1, ''];
  const n = value / scale;
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)}${name}`;
};
const costLabel = (amount: number): string => Number.isFinite(amount) ? `${fmt(amount)} C` : 'MAX';
const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.querySelector<T>(`#${id}`);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
};

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand"><span>STAGE 04</span><strong>TOKEN <b>TIMELINE</b></strong><small id="eraTitle">Broken Stopwatch</small></div>
      <div class="wallet"><span>CHRONONS</span><strong id="chrononValue">0</strong><small id="rateValue">+0 / sec</small></div>
      <nav class="top-actions"><a href="/stage-3/">← TOKEN HEIST</a><button id="guideButton" type="button">? RULES</button><button id="sfxButton" type="button">SFX ON</button><button id="bgmButton" type="button">♫ BGM ON</button><button id="resetButton" class="danger" type="button">RESET</button></nav>
    </header>

    <main class="game-grid">
      <section class="control-column">
        <div class="objective"><span>FIX THIS NEXT</span><strong id="objectiveLabel">Open Ancient Qwen</strong><b id="objectiveCount">0 / 100</b><div class="track"><i id="objectiveFill"></i></div></div>
        <div id="clockScene" class="clock-scene">
          <div class="orbit orbit-outer"></div><div class="orbit orbit-inner"></div>
          <div class="clock-face"><span class="hour-hand"></span><span class="minute-hand"></span><i></i></div>
          <div class="time-rift"></div>
          <div class="focus-card"><span>FOCUSED ERA</span><strong id="focusIcon">🦙</strong><b id="focusName">Dawn of Llama</b><small id="focusJoke">Invents fire. Immediately monetises it.</small></div>
          <button id="pulseButton" class="pulse-button" type="button"><span>⏱</span><strong>PULSE TIMELINE</strong><small>SPACE · ALL ERAS · <b id="pulseYield">+1 C</b></small></button>
        </div>
        <div class="paradox-panel"><div><span>PARADOX</span><b id="paradoxLabel">0%</b></div><div class="paradox-track"><i id="paradoxFill"></i></div><small>Fill the meter for a 15-second Time Rush: 4× output.</small></div>
        <div id="eventCard" class="event-card hidden"><span>⚠ TEMPORAL INCIDENT</span><strong id="eventTitle"></strong><p id="eventDetail"></p></div>
      </section>

      <section class="era-column"><div class="section-heading"><div><span>ONE VERY UNRELIABLE HISTORY BOOK</span><h1>REPAIR THE ERAS</h1></div><p>Choose an era to focus your pulses. Stabilized eras boost the next era.</p></div><div id="eraGrid" class="era-grid"></div></section>

      <aside class="side-column">
        <section class="panel upgrade-panel"><div class="panel-title"><span>TIME MACHINE PARTS</span><b>WARRANTY EXPIRED</b></div><div class="upgrade-list">
          <button class="upgrade-card" data-upgrade="drone" type="button"><span>🤖</span><span><strong>CLOCK DRONES <i id="droneLevel">0/6</i></strong><small>Pulse while you are away</small></span><b id="droneCost">3K C</b></button>
          <button class="upgrade-card" data-upgrade="dial" type="button"><span>🎛️</span><span><strong>WARP DIAL <i id="dialLevel">0/10</i></strong><small>Stronger pulses and faster Paradox</small></span><b id="dialCost">140 C</b></button>
          <button class="upgrade-card" data-upgrade="archive" type="button"><span>📚</span><span><strong>FORBIDDEN ARCHIVE <i id="archiveLevel">0/10</i></strong><small>Boosts every era</small></span><b id="archiveCost">600 C</b></button>
          <button class="upgrade-card" data-upgrade="capacitor" type="button"><span>⚡</span><span><strong>RUSH CAPACITOR <i id="capacitorLevel">0/5</i></strong><small>Longer Time Rush</small></span><b id="capacitorCost">8K C</b></button>
        </div></section>
        <section class="panel rewind-panel"><div class="echo-ticket"><span>TIMELINE ECHOES</span><strong id="echoCount">0</strong><small id="echoBonus">Permanent output +0%</small></div><div><span>REWIND</span><p>Start this timeline again. Keep Echoes for permanent power.</p><button id="rewindButton" type="button">REWIND · +<b id="echoGain">0</b> ECHOES</button></div></section>
        <section id="finalePanel" class="panel finale-panel"><span>THE PRIME TIMELINE</span><strong id="finaleStatus">0/6 Stable · 0/6 Drones · 0/40 Echoes</strong><button id="finaleButton" type="button">RESTORE TIME</button></section>
      </aside>
    </main>

    <div id="toast" class="toast" role="status" aria-live="polite"></div><div id="confetti" class="confetti" aria-hidden="true"></div>
    <section id="victoryScreen" class="victory-screen" data-dismissed="false" role="dialog" aria-modal="true" aria-labelledby="victoryTitle" aria-hidden="true"><div class="victory-ring"></div><div class="victory-symbol">⏳</div><small>PARADOX RESOLVED, MORE OR LESS</small><h1 id="victoryTitle">STAGE 4 CLEARED</h1><p>Every era is back in order. The llama still claims it invented Tuesdays.</p><div class="victory-stats"><strong id="victoryEchoes">0 Timeline Echoes</strong><span id="victoryChronons">0 lifetime Chronons</span></div><button id="viewTimelineButton" type="button">VIEW TIMELINE</button></section>
    <div id="guideOverlay" class="guide-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="guideTitle"><section class="guide-dialog"><button id="guideClose" class="guide-close" type="button" aria-label="Close rules">×</button><span class="guide-kicker">TIME TRAVEL FOR BEGINNERS · <b id="guideStepCount">1 / 4</b></span><div id="guideIcon" class="guide-icon">⌨</div><h2 id="guideTitle">Make Chronons</h2><p id="guideText">Press SPACE to pulse all your open eras. You earn Chronons.</p><div id="guideDots" class="guide-dots"></div><div class="guide-actions"><button id="guideBack" type="button">BACK</button><button id="guideNext" type="button">NEXT</button></div></section></div>
  </div>`;

const eraGrid = byId<HTMLDivElement>('eraGrid');
eraGrid.innerHTML = ERAS.map((era, index) => `
  <article class="era-card" data-card="${era.id}" style="--era:${era.color}">
    <button class="era-select" data-focus="${era.id}" type="button"><span class="era-number">0${index + 1}</span><span class="era-icon">${era.icon}</span><span class="era-heading"><strong>${era.name}</strong><small>${era.model} · ${era.joke}</small></span><b data-level="${era.id}">LV 0</b></button>
    <div class="era-detail"><span data-era-rate="${era.id}">0 C/sec</span><span data-stability="${era.id}">UNSTABLE</span></div>
    <div class="era-actions"><button data-buy-era="${era.id}" type="button">REPAIR / HIRE<b data-era-cost="${era.id}">0 C</b></button><button data-stabilize="${era.id}" type="button">STABILIZE <span data-stability-rank="${era.id}">0/2</span><b data-stability-cost="${era.id}">0 C</b></button></div>
  </article>`).join('');

let { state, offlineSeconds } = loadGame();
let focus: EraId = 'dawn';
let sfxEnabled = true;
let bgmEnabled = true;
let lastTick = performance.now();
let lastEventPulse = state.pulses;
let toastTimer = 0;

class TimelineAudio {
  private context: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private beat = 0;
  private ready(): AudioContext { this.context ??= new AudioContext(); if (this.context.state === 'suspended') void this.context.resume(); return this.context; }
  private tone(note: number, duration: number, kind: OscillatorType, volume: number, isMusic = false): void {
    if (isMusic ? !bgmEnabled : !sfxEnabled) return;
    const context = this.ready(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = kind; oscillator.frequency.value = note; gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
  }
  pulse(): void { this.tone(420, .07, 'triangle', .045); window.setTimeout(() => this.tone(630, .09, 'sine', .04), 55); }
  buy(): void { [523, 659, 784].forEach((note, index) => window.setTimeout(() => this.tone(note, .15, 'triangle', .04), index * 70)); }
  fail(): void { this.tone(115, .15, 'sawtooth', .025); }
  rush(): void { [440, 554, 659, 880].forEach((note, index) => window.setTimeout(() => this.tone(note, .2, 'square', .04), index * 90)); }
  start(): void { if (!bgmEnabled || this.bgmTimer !== null) return; const melody = [262, 330, 392, 523, 440, 392, 330, 294, 262, 330, 349, 440, 392, 330, 294, 247]; const beat = (): void => { if (document.hidden || !bgmEnabled) return; const index = this.beat % melody.length; this.tone(melody[index], .2, 'triangle', .007, true); if (index % 4 === 0) this.tone([131, 147, 165, 123][Math.floor(index / 4)], .4, 'sine', .012, true); this.beat += 1; }; beat(); this.bgmTimer = window.setInterval(beat, 280); }
  stop(): void { if (this.bgmTimer !== null) window.clearInterval(this.bgmTimer); this.bgmTimer = null; }
}
const audio = new TimelineAudio();
const guideSteps = [
  { icon: '⌨', title: 'Make Chronons', text: 'Press SPACE to pulse all your open eras. You earn Chronons.' },
  { icon: '🕰️', title: 'Repair the Eras', text: 'Spend Chronons to repair eras. Stabilize one to boost the next. Click an era to focus your pulses there.' },
  { icon: '⚡', title: 'Use Time Rush', text: 'Fill Paradox to 100%. All output becomes 4× stronger for 15 seconds.' },
  { icon: '🏆', title: 'How to Win', text: 'Get 40 Echoes, six Clock Drones, and two Stability ranks in every era. Then restore time.' },
] as const;
let guideStep = 0;
const renderGuide = (): void => { const step = guideSteps[guideStep]; byId('guideStepCount').textContent = `${guideStep + 1} / ${guideSteps.length}`; byId('guideIcon').textContent = step.icon; byId('guideTitle').textContent = step.title; byId('guideText').textContent = step.text; byId('guideDots').innerHTML = guideSteps.map((_, index) => `<i class="${index === guideStep ? 'active' : ''}"></i>`).join(''); byId<HTMLButtonElement>('guideBack').disabled = guideStep === 0; byId('guideNext').textContent = guideStep === guideSteps.length - 1 ? 'START' : 'NEXT'; };
const openGuide = (): void => { guideStep = 0; renderGuide(); byId('guideOverlay').classList.remove('hidden'); byId<HTMLButtonElement>('guideNext').focus(); };
const closeGuide = (): void => { byId('guideOverlay').classList.add('hidden'); try { localStorage.setItem('token-timeline-guide-seen-v1', 'yes'); } catch { /* storage may be unavailable */ } byId<HTMLButtonElement>('pulseButton').focus(); };
const toast = (message: string): void => { const node = byId('toast'); node.textContent = message; node.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => node.classList.remove('show'), 2300); };
const confetti = (count: number): void => { const host = byId('confetti'); const colors = ['#f4d47c', '#a68bff', '#ff829f', '#73d7ff', '#fff']; for (let index = 0; index < count; index += 1) { const bit = document.createElement('i'); bit.style.left = `${Math.random() * 100}%`; bit.style.background = colors[index % colors.length]; bit.style.setProperty('--drift', `${Math.random() * 180 - 90}px`); bit.style.animationDelay = `${Math.random() * .7}s`; host.append(bit); window.setTimeout(() => bit.remove(), 3500); } };
const events: Array<Omit<NonNullable<TimeEvent>, 'until'>> = [
  { title: 'LLAMA INVENTED TUESDAY TWICE', detail: 'Both Tuesdays count. Output ×2 for 20 seconds.', multiplier: 2 },
  { title: 'CLAUDE EDITED THE PAST', detail: 'It added a respectful footnote. Output ×2.5 for 15 seconds.', multiplier: 2.5 },
  { title: 'GROK MET GROK', detail: 'The argument lasted three centuries. Output ×2 for 20 seconds.', multiplier: 2 },
  { title: 'GEMINI FOUND ANOTHER FUTURE', detail: 'This one has better snacks. Output ×3 for 12 seconds.', multiplier: 3 },
  { title: 'QWEN DEBUGGED THE CALENDAR', detail: 'February has 32 days now. Output ×2.2 for 18 seconds.', multiplier: 2.2 },
];
const triggerEvent = (): void => { const pick = events[Math.floor(Math.random() * events.length)]; const seconds = pick.multiplier >= 3 ? 12 : pick.multiplier >= 2.5 ? 15 : pick.multiplier >= 2.2 ? 18 : 20; state.event = { ...pick, until: Date.now() + seconds * 1_000 }; toast(pick.title); audio.rush(); confetti(18); };
const maybeEvent = (): void => { if (state.pulses - lastEventPulse < 25) return; lastEventPulse = state.pulses; triggerEvent(); };
const floatGain = (gain: number): void => { const scene = byId('clockScene'); const label = document.createElement('span'); label.className = 'gain-float'; label.textContent = `+${fmt(gain)} C`; label.style.left = `${45 + Math.random() * 20}%`; scene.append(label); window.setTimeout(() => label.remove(), 900); };
const doPulse = (): void => { audio.start(); const wasRush = state.rushUntil > Date.now(); const gain = pulseTimeline(state, focus); audio.pulse(); floatGain(gain); byId('clockScene').classList.remove('tick'); requestAnimationFrame(() => byId('clockScene').classList.add('tick')); if (!wasRush && state.rushUntil > Date.now()) { toast('TIME RUSH! Output ×4'); confetti(50); audio.rush(); } maybeEvent(); render(); };
const tryBuy = (action: () => boolean, message: string): void => { if (action()) { audio.buy(); toast(message); saveGame(state); } else { audio.fail(); toast('Not enough Chronons. Give it a few seconds—or a few centuries.'); } render(); };
const setText = (selector: string, value: string): void => { const node = document.querySelector<HTMLElement>(selector); if (node) node.textContent = value; };
const render = (): void => {
  const now = Date.now(); const rate = getProduction(state, now) + getPulseValue(state, focus, now) * state.drones * .16;
  byId('chrononValue').textContent = fmt(state.chronons); byId('rateValue').textContent = `+${fmt(rate)} / sec`; byId('eraTitle').textContent = getEraTitle(state); byId('pulseYield').textContent = `+${fmt(getPulseValue(state, focus, now))} C`;
  const objective = getObjective(state); byId('objectiveLabel').textContent = objective.label; byId('objectiveCount').textContent = `${fmt(objective.current)} / ${fmt(objective.target)}`; byId<HTMLElement>('objectiveFill').style.width = `${Math.min(100, objective.current / objective.target * 100)}%`;
  const selected = ERAS.find((era) => era.id === focus) ?? ERAS[0]; byId('focusIcon').textContent = selected.icon; byId('focusName').textContent = selected.name; byId('focusJoke').textContent = selected.joke;
  byId('paradoxLabel').textContent = state.rushUntil > now ? `TIME RUSH · ${Math.ceil((state.rushUntil - now) / 1_000)}s` : `${Math.floor(state.paradox)}%`; byId<HTMLElement>('paradoxFill').style.width = `${state.paradox}%`; byId('clockScene').classList.toggle('rushing', state.rushUntil > now);
  byId('eventCard').classList.toggle('hidden', !state.event); if (state.event) { byId('eventTitle').textContent = state.event.title; byId('eventDetail').textContent = `${state.event.detail} ${Math.max(0, Math.ceil((state.event.until - now) / 1_000))}s left.`; }
  for (const era of ERAS) { const item = state.eras[era.id]; const eraCost = getEraCost(state, era); const stabilityCost = getStabilityCost(state, era); const card = document.querySelector<HTMLElement>(`[data-card="${era.id}"]`); card?.classList.toggle('locked', item.level === 0); card?.classList.toggle('focused', focus === era.id); setText(`[data-level="${era.id}"]`, `LV ${item.level}`); setText(`[data-era-rate="${era.id}"]`, `${fmt(getEraRate(state, era, now))} C/sec`); setText(`[data-stability="${era.id}"]`, item.stability === 2 ? 'STABLE ✓' : `${item.stability}/2 STABILITY`); setText(`[data-stability-rank="${era.id}"]`, `${item.stability}/2`); setText(`[data-era-cost="${era.id}"]`, costLabel(eraCost)); setText(`[data-stability-cost="${era.id}"]`, costLabel(stabilityCost)); const buyButton = document.querySelector<HTMLButtonElement>(`[data-buy-era="${era.id}"]`); const stabilizeButton = document.querySelector<HTMLButtonElement>(`[data-stabilize="${era.id}"]`); if (buyButton) { buyButton.disabled = state.chronons < eraCost; buyButton.classList.toggle('affordable', !buyButton.disabled); } if (stabilizeButton) { stabilizeButton.disabled = item.level === 0 || state.chronons < stabilityCost; stabilizeButton.classList.toggle('affordable', !stabilizeButton.disabled); } card?.classList.toggle('has-affordable', Boolean(buyButton && !buyButton.disabled || stabilizeButton && !stabilizeButton.disabled)); }
  byId('droneLevel').textContent = `${state.drones}/6`; byId('dialLevel').textContent = `${state.dial}/10`; byId('archiveLevel').textContent = `${state.archive}/10`; byId('capacitorLevel').textContent = `${state.capacitor}/5`;
  (['drone', 'dial', 'archive', 'capacitor'] as UpgradeId[]).forEach((id) => { const price = getUpgradeCost(state, id); byId(`${id}Cost`).textContent = costLabel(price); const button = document.querySelector<HTMLButtonElement>(`[data-upgrade="${id}"]`); if (button) { button.disabled = state.chronons < price; button.classList.toggle('affordable', !button.disabled); } });
  const echoes = getEchoGain(state); byId('echoCount').textContent = fmt(state.echoes); byId('echoBonus').textContent = `Permanent output +${state.echoes * 12}%`; byId('echoGain').textContent = fmt(echoes); const rewindButton = byId<HTMLButtonElement>('rewindButton'); rewindButton.disabled = echoes < 1; rewindButton.classList.toggle('affordable', !rewindButton.disabled);
  const finale = getFinaleProgress(state); byId('finaleStatus').textContent = `${finale.stable}/6 Stable · ${state.drones}/6 Drones · ${state.echoes}/40 Echoes`; const finaleButton = byId<HTMLButtonElement>('finaleButton'); finaleButton.disabled = !finale.ready || state.completed; finaleButton.classList.toggle('affordable', !finaleButton.disabled); finaleButton.textContent = state.completed ? 'TIME RESTORED ✓' : 'RESTORE TIME'; byId('finalePanel').classList.toggle('ready', finale.ready && !state.completed);
  const victory = byId('victoryScreen'); if (!state.completed) victory.dataset.dismissed = 'false'; const visible = state.completed && victory.dataset.dismissed !== 'true'; victory.classList.toggle('visible', visible); victory.setAttribute('aria-hidden', String(!visible)); byId('victoryEchoes').textContent = `${fmt(state.echoes)} Timeline Echoes`; byId('victoryChronons').textContent = `${fmt(state.lifetimeChronons)} lifetime Chronons`;
};

eraGrid.addEventListener('click', (event) => { const target = event.target as HTMLElement; const focusButton = target.closest<HTMLButtonElement>('[data-focus]'); const buyButton = target.closest<HTMLButtonElement>('[data-buy-era]'); const stabilityButton = target.closest<HTMLButtonElement>('[data-stabilize]'); if (focusButton) { focus = focusButton.dataset.focus as EraId; render(); } if (buyButton) { const id = buyButton.dataset.buyEra as EraId; tryBuy(() => buyEra(state, id), 'Era repaired. History is slightly less wrong.'); } if (stabilityButton) { const id = stabilityButton.dataset.stabilize as EraId; tryBuy(() => stabilizeEra(state, id), 'Era stabilized. The next era got a boost!'); } });
byId('pulseButton').addEventListener('click', doPulse);
document.querySelector('.upgrade-list')?.addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-upgrade]'); if (!button) return; const id = button.dataset.upgrade as UpgradeId; tryBuy(() => buyUpgrade(state, id), id === 'drone' ? 'Clock Drone deployed. It is already late.' : 'Time machine upgraded.'); });
byId('rewindButton').addEventListener('click', () => { const gain = rewindTimeline(state); if (!gain) return; focus = 'dawn'; lastEventPulse = 0; audio.rush(); confetti(75); toast(`Rewind complete! +${gain} permanent Echoes`); saveGame(state); render(); });
byId('finaleButton').addEventListener('click', () => { if (!restorePrimeTimeline(state)) return; audio.rush(); confetti(140); toast('THE PRIME TIMELINE IS RESTORED!'); saveGame(state); render(); byId<HTMLButtonElement>('viewTimelineButton').focus(); });
byId('viewTimelineButton').addEventListener('click', () => { const victory = byId('victoryScreen'); victory.dataset.dismissed = 'true'; victory.classList.remove('visible'); victory.setAttribute('aria-hidden', 'true'); byId<HTMLButtonElement>('pulseButton').focus(); });
byId('sfxButton').addEventListener('click', () => { sfxEnabled = !sfxEnabled; byId('sfxButton').textContent = `SFX ${sfxEnabled ? 'ON' : 'OFF'}`; if (sfxEnabled) audio.buy(); });
byId('bgmButton').addEventListener('click', () => { bgmEnabled = !bgmEnabled; byId('bgmButton').textContent = `♫ BGM ${bgmEnabled ? 'ON' : 'OFF'}`; if (bgmEnabled) audio.start(); else audio.stop(); });
byId('guideButton').addEventListener('click', openGuide); byId('guideClose').addEventListener('click', closeGuide); byId('guideBack').addEventListener('click', () => { guideStep = Math.max(0, guideStep - 1); renderGuide(); }); byId('guideNext').addEventListener('click', () => { if (guideStep === guideSteps.length - 1) closeGuide(); else { guideStep += 1; renderGuide(); } }); byId('guideOverlay').addEventListener('click', (event) => { if (event.target === byId('guideOverlay')) closeGuide(); });
byId('resetButton').addEventListener('click', () => { if (!window.confirm('Erase all Token Timeline progress? Earlier stages are safe.')) return; clearGame(); state = createInitialState(); focus = 'dawn'; lastEventPulse = 0; render(); toast('Timeline reset. Tuesdays remain suspicious.'); });
window.addEventListener('keydown', (event) => { if (event.code === 'Escape' && !byId('guideOverlay').classList.contains('hidden')) { closeGuide(); return; } if (event.code !== 'Space' || event.repeat || !byId('guideOverlay').classList.contains('hidden') || byId('victoryScreen').classList.contains('visible') || ['INPUT', 'BUTTON', 'A'].includes((event.target as HTMLElement).tagName)) return; event.preventDefault(); doPulse(); });
window.addEventListener('pointerdown', () => audio.start(), { once: true }); document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(state); audio.stop(); } else if (bgmEnabled) audio.start(); }); window.addEventListener('beforeunload', () => saveGame(state));
if (offlineSeconds > 2) { const gain = advanceTime(state, offlineSeconds); window.setTimeout(() => toast(`Your Clock Drones worked while you were away: +${fmt(gain)} Chronons`), 350); }
window.setInterval(() => { const current = performance.now(); advanceTime(state, Math.min(1, (current - lastTick) / 1_000), focus); lastTick = current; render(); }, 250);
window.setInterval(() => saveGame(state), 5_000); window.setInterval(() => { if (!state.event) triggerEvent(); }, 55_000);
render(); if (state.completed) window.setTimeout(() => { confetti(110); byId<HTMLButtonElement>('viewTimelineButton').focus(); }, 180);
try { if (!state.completed && !localStorage.getItem('token-timeline-guide-seen-v1')) window.setTimeout(openGuide, 250); } catch { if (!state.completed) window.setTimeout(openGuide, 250); }
