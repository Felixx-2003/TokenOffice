import './style.css';
import {
  CREW, DISGUISE_NAMES, KEY_NAMES,
  advanceTime, buyDisguise, buyGadget, buyUpgrade, crackRootAccess,
  createInitialState, escapeRoute, getBlueprintGain, getCrewRate, getDisguiseCost,
  getFinaleProgress, getFullHeistValue, getGadgetCost, getNextObjective,
  getProduction, getRecruitCost, getTarget, getUpgradeCost, recruitCrew,
  runHeist, runSoloMove,
  type CrewId, type HeistEvent, type UpgradeId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app');

const fmt = (value: number): string => {
  if (!Number.isFinite(value)) return 'MAX';
  if (value < 1_000) return value < 10 && value % 1 !== 0 ? value.toFixed(1) : Math.floor(value).toLocaleString();
  const units: Array<[number, string]> = [[1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [scale, suffix] = units.find(([unit]) => value >= unit) ?? [1, ''];
  const scaled = value / scale;
  return `${scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : Math.floor(scaled)}${suffix}`;
};
const price = (value: number): string => Number.isFinite(value) ? `${fmt(value)} CC` : 'MAXED';

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block"><span>STAGE 03</span><strong>TOKEN <b>HEIST</b></strong><small id="targetLabel">Corner ATM</small></div>
      <div class="resource-block"><span>CONTEXT COINS</span><strong id="coinValue">0</strong><small id="rateValue">+0 / sec</small></div>
      <nav class="top-actions">
        <a href="/stage-2/">← TOKEN CIRCUS</a>
        <button id="guideButton" type="button">? RULES</button>
        <button id="soundButton" type="button">SFX ON</button>
        <button id="bgmButton" type="button">♫ BGM ON</button>
        <button id="resetButton" class="danger" type="button">RESET</button>
      </nav>
    </header>

    <main class="game-grid">
      <section class="vault-column">
        <div class="objective-strip">
          <span>NEXT JOB</span><strong id="objectiveLabel">Recruit Qwen</strong><b id="objectiveCount">0 / 100</b>
          <div class="meter"><i id="objectiveFill"></i></div>
        </div>
        <div id="vaultScene" class="vault-scene">
          <div class="laser laser-a"></div><div class="laser laser-b"></div><div class="laser laser-c"></div>
          <div class="vault-door"><i></i><i></i><i></i><span id="vaultStatus">LOCKED</span></div>
          <div class="selected-agent">
            <span id="agentEmoji">🦙</span><strong id="agentName">LLAMA</strong><small id="agentRole">Distraction Expert</small>
            <p id="agentMove">Eats the security manual</p>
            <button id="soloButton" type="button">RUN SOLO MOVE</button>
          </div>
          <button id="heistButton" class="heist-button" type="button">
            <span>◈</span><strong>RUN THE HEIST</strong><small>SPACE · WHOLE CREW · <b id="heistYield">+1 CC</b></small>
          </button>
        </div>
        <div class="breach-panel">
          <div><span>VAULT BREACH</span><b id="breachLabel">0%</b></div>
          <div class="breach-meter"><i id="breachFill"></i></div>
          <small>Reach 100% for a 15-second Perfect Heist ×4.</small>
        </div>
        <div id="eventCard" class="event-card hidden"><span>🚨 PLAN IMPROVEMENT</span><strong id="eventLabel"></strong><p id="eventDetail"></p></div>
      </section>

      <section class="crew-column">
        <div class="section-heading"><div><span>HIGHLY QUESTIONABLE PROFESSIONALS</span><h1>THE AI CREW</h1></div><p>Space uses everyone. Click a crew member for their solo move.</p></div>
        <div id="crewGrid" class="crew-grid"></div>
      </section>

      <aside class="upgrade-column">
        <section class="panel">
          <div class="panel-title"><span>BLACK MARKET UPGRADES</span><b>CASH ONLY</b></div>
          <div class="upgrade-list">
            <button class="upgrade-card" data-upgrade="key" type="button"><span>🗝️</span><span><strong id="keyName">Bent Hairpin</strong><small>Stronger manual heists</small></span><b id="keyCost">240 CC</b></button>
            <button class="upgrade-card" data-upgrade="bot" type="button"><span>🤖</span><span><strong>GETAWAY BOTS <i id="botLevel">0/6</i></strong><small>Run jobs while you pretend to work</small></span><b id="botCost">5K CC</b></button>
            <button class="upgrade-card" data-upgrade="jammer" type="button"><span>📡</span><span><strong>LASER JAMMER <i id="jammerLevel">0/10</i></strong><small>Bigger clicks, faster breaches</small></span><b id="jammerCost">800 CC</b></button>
            <button class="upgrade-card" data-upgrade="inside" type="button"><span>🦙</span><span><strong>INSIDE LLAMA <i id="insideLevel">0/10</i></strong><small>Boosts all crew production</small></span><b id="insideCost">1.8K CC</b></button>
          </div>
        </section>
        <section class="panel prestige-panel">
          <div class="blueprint-stamp"><span>MASTER BLUEPRINTS</span><strong id="blueprintCount">0</strong><small id="blueprintBonus">Permanent output +0%</small></div>
          <div><span>ESCAPE ROUTE</span><p>Restart this heist for permanent Blueprints and a bigger target.</p><button id="escapeButton" type="button">ESCAPE · +<b id="blueprintGain">0</b> BLUEPRINTS</button></div>
        </section>
        <section id="finalePanel" class="panel finale-panel">
          <span>THE INFINITE CONTEXT VAULT</span>
          <strong id="finaleStatus">0/10 Legendary · 0/6 Bots · 0/30 Blueprints</strong>
          <button id="finaleButton" type="button">CRACK ROOT ACCESS</button>
        </section>
      </aside>
    </main>

    <div id="toast" class="toast" role="status" aria-live="polite"></div><div id="confetti" class="confetti"></div>
    <section id="victoryScreen" class="victory-screen" data-dismissed="false" role="dialog" aria-modal="true" aria-labelledby="victoryTitle" aria-hidden="true">
      <div class="victory-grid"></div><div class="victory-icon">🔓</div><small>ROOT ACCESS GRANTED</small><h1 id="victoryTitle">STAGE 3 CLEARED</h1>
      <p>The Infinite Context Vault is empty. Somehow, the llama has the keys.</p>
      <div class="victory-stats"><strong id="victoryBlueprints">0 Master Blueprints</strong><span id="victoryCoins">0 lifetime Context Coins</span></div>
      <div class="victory-actions"><button id="viewHeistButton" type="button">VIEW THE CRIME SCENE</button><a href="/stage-4/">ENTER STAGE 4 →</a></div>
    </section>
    <div id="guideOverlay" class="guide-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="guideTitle">
      <section class="guide-dialog"><button id="guideClose" class="guide-close" type="button" aria-label="Close rules">×</button>
        <span class="guide-kicker">THE VERY SIMPLE PLAN · <b id="guideStepCount">1 / 4</b></span><div id="guideIcon" class="guide-icon">⌨</div>
        <h2 id="guideTitle">Steal Context Coins</h2><p id="guideText">Press SPACE. Your whole crew runs one heist and earns Context Coins.</p>
        <div id="guideDots" class="guide-dots"></div><div class="guide-actions"><button id="guideBack" type="button">BACK</button><button id="guideNext" type="button">NEXT</button></div>
      </section>
    </div>
  </div>`;

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
};

const crewGrid = byId<HTMLDivElement>('crewGrid');
crewGrid.innerHTML = CREW.map((member) => `
  <article class="crew-card" data-card="${member.id}" style="--accent:${member.accent}">
    <button class="crew-select" data-select="${member.id}" type="button"><span>${member.emoji}</span><span><strong>${member.name}</strong><small>${member.role}</small></span><b data-count="${member.id}">×0</b></button>
    <div class="crew-stats"><span data-rate="${member.id}">0 CC/s</span><span data-disguise-name="${member.id}">Paper Moustache</span></div>
    <div class="crew-actions">
      <button data-recruit="${member.id}" type="button">RECRUIT<b data-recruit-cost="${member.id}">0</b></button>
      <button data-gadget="${member.id}" type="button">GADGET <span data-gadget-level="${member.id}">1/10</span><b data-gadget-cost="${member.id}">0</b></button>
      <button data-disguise="${member.id}" type="button">DISGUISE <span data-disguise-level="${member.id}">0/4</span><b data-disguise-cost="${member.id}">0</b></button>
    </div>
  </article>`).join('');

let { state, offlineSeconds } = loadGame();
let selectedId: CrewId = 'llama';
let soundEnabled = true;
let bgmEnabled = true;
let lastTick = performance.now();
let toastTimer = 0;
let lastEventHeist = state.heistCount;

class HeistAudio {
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private step = 0;
  private contextReady(): AudioContext { this.context ??= new AudioContext(); if (this.context.state === 'suspended') void this.context.resume(); return this.context; }
  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, sfx = true): void {
    if (sfx ? !soundEnabled : !bgmEnabled) return;
    const context = this.contextReady(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
  }
  lock(): void { [280, 390, 520].forEach((note, index) => window.setTimeout(() => this.tone(note, .055, 'square', .04), index * 45)); window.setTimeout(() => this.tone(92, .13, 'sine', .08), 145); }
  buy(): void { [440, 659, 880].forEach((note, index) => window.setTimeout(() => this.tone(note, .12, 'triangle', .04), index * 65)); }
  fail(): void { this.tone(95, .16, 'sawtooth', .035); }
  alarm(): void { [740, 520, 880, 1040].forEach((note, index) => window.setTimeout(() => this.tone(note, .18, 'square', .035), index * 90)); }
  startBgm(): void {
    if (!bgmEnabled || this.timer !== null) return;
    const bass = [82, 82, 98, 110, 82, 123, 110, 98]; const lead = [330, 392, 440, 392, 349, 330, 294, 262];
    const beat = (): void => { if (document.hidden || !bgmEnabled) return; const index = this.step % bass.length; this.tone(bass[index], .3, 'sine', .014, false); if (this.step % 2 === 0) this.tone(lead[index], .11, 'triangle', .008, false); this.step += 1; };
    beat(); this.timer = window.setInterval(beat, 300);
  }
  stopBgm(): void { if (this.timer !== null) window.clearInterval(this.timer); this.timer = null; }
}
const audio = new HeistAudio();

const guideSteps = [
  { icon: '⌨', title: 'Steal Context Coins', text: 'Press SPACE. Your whole crew runs one heist and earns Context Coins.' },
  { icon: '🕵️', title: 'Hire and Upgrade', text: 'Recruit crew. Buy Gadgets and better Disguises when their buttons glow.' },
  { icon: '🔓', title: 'Fill Vault Breach', text: 'Reach 100% Vault Breach. Perfect Heist gives 4× output for 15 seconds.' },
  { icon: '🏆', title: 'How to Win', text: 'Get 30 Blueprints, 6 Bots, and Legendary disguises for all 10 crew. Then crack Root Access.' },
] as const;
let guideStep = 0;
const renderGuide = (): void => { const step = guideSteps[guideStep]; byId('guideStepCount').textContent = `${guideStep + 1} / ${guideSteps.length}`; byId('guideIcon').textContent = step.icon; byId('guideTitle').textContent = step.title; byId('guideText').textContent = step.text; byId('guideDots').innerHTML = guideSteps.map((_, index) => `<i class="${index === guideStep ? 'active' : ''}"></i>`).join(''); byId<HTMLButtonElement>('guideBack').disabled = guideStep === 0; byId('guideNext').textContent = guideStep === guideSteps.length - 1 ? 'START HEIST' : 'NEXT'; };
const openGuide = (): void => { guideStep = 0; renderGuide(); byId('guideOverlay').classList.remove('hidden'); byId<HTMLButtonElement>('guideNext').focus(); };
const closeGuide = (): void => { byId('guideOverlay').classList.add('hidden'); try { localStorage.setItem('token-heist-guide-seen-v1', 'yes'); } catch { /* storage can be blocked */ } byId<HTMLButtonElement>('heistButton').focus(); };
const showToast = (message: string): void => { const toast = byId('toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200); };
const confetti = (amount = 30): void => { const host = byId('confetti'); const colors = ['#4dffb5', '#ffcf4d', '#ff496c', '#4dc9ff', '#fff']; for (let index = 0; index < amount; index += 1) { const piece = document.createElement('i'); piece.style.left = `${Math.random() * 100}%`; piece.style.background = colors[index % colors.length]; piece.style.animationDelay = `${Math.random() * .7}s`; piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`); host.append(piece); window.setTimeout(() => piece.remove(), 3400); } };

const events: Array<Omit<NonNullable<HeistEvent>, 'until'>> = [
  { label: 'LLAMA ATE THE FLOOR PLAN', detail: 'The bite marks reveal a secret tunnel. Output ×2 for 20 seconds.', multiplier: 2 },
  { label: 'CLAUDE NEGOTIATED WITH THE ALARM', detail: 'It agreed to remain calm. Output ×2.5 for 15 seconds.', multiplier: 2.5 },
  { label: 'GEMINI DUPLICATED THE GUARD', detail: 'Both guards blame the other one. Output ×3 for 12 seconds.', multiplier: 3 },
  { label: 'GROK STARTED A HEIST PODCAST', detail: 'The sponsors paid in advance. Output ×1.8 for 24 seconds.', multiplier: 1.8 },
  { label: 'CHATGPT PICKED THE WRONG VAULT', detail: 'Luckily, it contained bonus coins. Output ×2.2 for 18 seconds.', multiplier: 2.2 },
  { label: 'DEEPSEEK FOUND STAGE 4 PLANS', detail: 'We sold the spoilers back to management. Output ×2 for 20 seconds.', multiplier: 2 },
];
const triggerEvent = (): void => { const picked = events[Math.floor(Math.random() * events.length)]; const seconds = picked.multiplier >= 3 ? 12 : picked.multiplier >= 2.5 ? 15 : picked.multiplier >= 2.2 ? 18 : picked.multiplier >= 2 ? 20 : 24; state.event = { ...picked, until: Date.now() + seconds * 1000 }; showToast(picked.label); audio.alarm(); confetti(18); };
const maybeEvent = (): void => { if (state.heistCount - lastEventHeist < 24) return; lastEventHeist = state.heistCount; triggerEvent(); };
const floatGain = (amount: number): void => { const host = byId('vaultScene'); const label = document.createElement('span'); label.className = 'gain-float'; label.textContent = `+${fmt(amount)} CC`; label.style.left = `${34 + Math.random() * 34}%`; host.append(label); window.setTimeout(() => label.remove(), 900); };
const doHeist = (id?: CrewId): void => { audio.startBgm(); const perfectBefore = state.perfectUntil > Date.now(); const gained = id ? runSoloMove(state, id) : runHeist(state); if (!gained) return; selectedId = id ?? selectedId; audio.lock(); floatGain(gained); const scene = byId('vaultScene'); scene.classList.remove('hit'); requestAnimationFrame(() => scene.classList.add('hit')); if (!id) { crewGrid.classList.remove('all-working'); requestAnimationFrame(() => crewGrid.classList.add('all-working')); window.setTimeout(() => crewGrid.classList.remove('all-working'), 500); } if (!perfectBefore && state.perfectUntil > Date.now()) { confetti(55); audio.alarm(); showToast('PERFECT HEIST! All output ×4'); } maybeEvent(); render(); };
const buy = (action: () => boolean, message: string): void => { if (action()) { audio.buy(); showToast(message); saveGame(state); } else { audio.fail(); showToast('Not enough Context Coins. Try stealing more.'); } render(); };

const setText = (selector: string, value: string): void => { const node = document.querySelector<HTMLElement>(selector); if (node) node.textContent = value; };
const render = (): void => {
  const now = Date.now(); const production = getProduction(state, now) + getFullHeistValue(state, now) * state.bots * .22;
  byId('coinValue').textContent = fmt(state.coins); byId('rateValue').textContent = `+${fmt(production)} / sec`; byId('targetLabel').textContent = getTarget(state); byId('heistYield').textContent = `+${fmt(getFullHeistValue(state, now))} CC`;
  const objective = getNextObjective(state); byId('objectiveLabel').textContent = objective.label; byId('objectiveCount').textContent = `${fmt(objective.current)} / ${fmt(objective.target)}`; byId<HTMLElement>('objectiveFill').style.width = `${Math.min(100, objective.current / objective.target * 100)}%`;
  const selected = CREW.find((member) => member.id === selectedId) ?? CREW[0]; const selectedOwned = state.crew[selected.id].count > 0;
  byId('agentEmoji').textContent = selectedOwned ? selected.emoji : '🔒'; byId('agentName').textContent = selected.name.toUpperCase(); byId('agentRole').textContent = selected.role; byId('agentMove').textContent = selectedOwned ? selected.move : `Recruit ${selected.name} before assigning crimes.`; byId<HTMLButtonElement>('soloButton').disabled = !selectedOwned; byId('soloButton').textContent = selectedOwned ? 'RUN SOLO MOVE' : 'NOT IN CREW';
  const perfect = state.perfectUntil > now; byId('vaultScene').classList.toggle('perfect', perfect); byId('vaultStatus').textContent = perfect ? `PERFECT ×4 · ${Math.ceil((state.perfectUntil - now) / 1000)}s` : 'LOCKED'; byId('breachLabel').textContent = `${Math.floor(state.breach)}%`; byId<HTMLElement>('breachFill').style.width = `${state.breach}%`;
  byId('eventCard').classList.toggle('hidden', !state.event); if (state.event) { byId('eventLabel').textContent = state.event.label; byId('eventDetail').textContent = `${state.event.detail} ${Math.max(0, Math.ceil((state.event.until - now) / 1000))}s left.`; }
  for (const member of CREW) {
    const owned = state.crew[member.id]; const recruitCost = getRecruitCost(state, member); const gadgetCost = getGadgetCost(state, member); const disguiseCost = getDisguiseCost(state, member); const card = document.querySelector<HTMLElement>(`[data-card="${member.id}"]`);
    card?.classList.toggle('locked', owned.count === 0); card?.classList.toggle('selected', selectedId === member.id); setText(`[data-count="${member.id}"]`, `×${owned.count}`); setText(`[data-rate="${member.id}"]`, `${fmt(getCrewRate(state, member, now))} CC/s`); setText(`[data-disguise-name="${member.id}"]`, DISGUISE_NAMES[owned.disguise]); setText(`[data-recruit-cost="${member.id}"]`, price(recruitCost)); setText(`[data-gadget-level="${member.id}"]`, `${owned.gadget}/10`); setText(`[data-gadget-cost="${member.id}"]`, price(gadgetCost)); setText(`[data-disguise-level="${member.id}"]`, `${owned.disguise}/4`); setText(`[data-disguise-cost="${member.id}"]`, price(disguiseCost));
    const buttons = [document.querySelector<HTMLButtonElement>(`[data-recruit="${member.id}"]`), document.querySelector<HTMLButtonElement>(`[data-gadget="${member.id}"]`), document.querySelector<HTMLButtonElement>(`[data-disguise="${member.id}"]`)]; const costs = [recruitCost, gadgetCost, disguiseCost]; buttons.forEach((button, index) => { if (!button) return; button.disabled = state.coins < costs[index] || index > 0 && owned.count === 0; button.classList.toggle('affordable', !button.disabled); }); card?.classList.toggle('has-affordable', buttons.some((button) => button && !button.disabled));
  }
  byId('keyName').textContent = KEY_NAMES[state.keyTier]; byId('botLevel').textContent = `${state.bots}/6`; byId('jammerLevel').textContent = `${state.jammer}/10`; byId('insideLevel').textContent = `${state.insideLlama}/10`;
  (['key', 'bot', 'jammer', 'inside'] as UpgradeId[]).forEach((id) => { const upgradeCost = getUpgradeCost(state, id); byId(`${id}Cost`).textContent = price(upgradeCost); const button = document.querySelector<HTMLButtonElement>(`[data-upgrade="${id}"]`); if (button) { button.disabled = state.coins < upgradeCost; button.classList.toggle('affordable', !button.disabled); } });
  const blueprintGain = getBlueprintGain(state); byId('blueprintCount').textContent = fmt(state.blueprints); byId('blueprintBonus').textContent = `Permanent output +${state.blueprints * 10}%`; byId('blueprintGain').textContent = fmt(blueprintGain); const escapeButton = byId<HTMLButtonElement>('escapeButton'); escapeButton.disabled = blueprintGain < 1; escapeButton.classList.toggle('affordable', !escapeButton.disabled);
  const finale = getFinaleProgress(state); byId('finaleStatus').textContent = `${finale.legendary}/10 Legendary · ${state.bots}/6 Bots · ${state.blueprints}/30 Blueprints`; const finaleButton = byId<HTMLButtonElement>('finaleButton'); finaleButton.disabled = !finale.ready || state.completed; finaleButton.classList.toggle('affordable', !finaleButton.disabled); finaleButton.textContent = state.completed ? 'ROOT ACCESS CRACKED ✓' : 'CRACK ROOT ACCESS'; byId('finalePanel').classList.toggle('ready', finale.ready && !state.completed);
  const victory = byId('victoryScreen'); if (!state.completed) victory.dataset.dismissed = 'false'; const visible = state.completed && victory.dataset.dismissed !== 'true'; victory.classList.toggle('is-visible', visible); victory.setAttribute('aria-hidden', String(!visible)); byId('victoryBlueprints').textContent = `${fmt(state.blueprints)} Master Blueprints`; byId('victoryCoins').textContent = `${fmt(state.lifetimeCoins)} lifetime Context Coins`;
};

crewGrid.addEventListener('click', (event) => { const target = event.target as HTMLElement; const select = target.closest<HTMLElement>('[data-select]'); const recruit = target.closest<HTMLButtonElement>('[data-recruit]'); const gadget = target.closest<HTMLButtonElement>('[data-gadget]'); const disguise = target.closest<HTMLButtonElement>('[data-disguise]'); if (select) { selectedId = select.dataset.select as CrewId; if (state.crew[selectedId].count > 0) doHeist(selectedId); else render(); } if (recruit) { const id = recruit.dataset.recruit as CrewId; buy(() => recruitCrew(state, id), `${CREW.find((member) => member.id === id)?.name} joined the crew.`); } if (gadget) { const id = gadget.dataset.gadget as CrewId; buy(() => buyGadget(state, id), 'Gadget acquired from a very legitimate van.'); } if (disguise) { const id = disguise.dataset.disguise as CrewId; buy(() => buyDisguise(state, id), 'Disguise upgraded. Completely unrecognisable.'); } });
byId('heistButton').addEventListener('click', () => doHeist()); byId('soloButton').addEventListener('click', () => doHeist(selectedId));
document.querySelector('.upgrade-list')?.addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-upgrade]'); if (!button) return; const id = button.dataset.upgrade as UpgradeId; buy(() => buyUpgrade(state, id), id === 'bot' ? 'Getaway Bot booted. It refuses to discuss ethics.' : 'Black-market upgrade installed.'); });
byId('escapeButton').addEventListener('click', () => { const gained = escapeRoute(state); if (!gained) return; selectedId = 'llama'; audio.alarm(); confetti(70); showToast(`Clean escape! +${gained} Master Blueprints`); saveGame(state); render(); });
byId('finaleButton').addEventListener('click', () => { if (!crackRootAccess(state)) return; audio.alarm(); confetti(150); showToast('THE INFINITE CONTEXT VAULT IS OPEN!'); saveGame(state); render(); byId<HTMLButtonElement>('viewHeistButton').focus(); });
byId('viewHeistButton').addEventListener('click', () => { const victory = byId('victoryScreen'); victory.dataset.dismissed = 'true'; victory.classList.remove('is-visible'); victory.setAttribute('aria-hidden', 'true'); byId<HTMLButtonElement>('heistButton').focus(); });
byId('soundButton').addEventListener('click', () => { soundEnabled = !soundEnabled; byId('soundButton').textContent = `SFX ${soundEnabled ? 'ON' : 'OFF'}`; if (soundEnabled) audio.buy(); }); byId('bgmButton').addEventListener('click', () => { bgmEnabled = !bgmEnabled; byId('bgmButton').textContent = `♫ BGM ${bgmEnabled ? 'ON' : 'OFF'}`; if (bgmEnabled) audio.startBgm(); else audio.stopBgm(); });
byId('guideButton').addEventListener('click', openGuide); byId('guideClose').addEventListener('click', closeGuide); byId('guideBack').addEventListener('click', () => { guideStep = Math.max(0, guideStep - 1); renderGuide(); }); byId('guideNext').addEventListener('click', () => { if (guideStep === guideSteps.length - 1) closeGuide(); else { guideStep += 1; renderGuide(); } }); byId('guideOverlay').addEventListener('click', (event) => { if (event.target === byId('guideOverlay')) closeGuide(); });
byId('resetButton').addEventListener('click', () => { if (!window.confirm('Erase all Token Heist progress? Token Office and Token Circus are safe.')) return; clearGame(); state = createInitialState(); selectedId = 'llama'; render(); showToast('Evidence destroyed. Crew memories suspiciously intact.'); });
window.addEventListener('keydown', (event) => { if (event.code === 'Escape' && !byId('guideOverlay').classList.contains('hidden')) { closeGuide(); return; } if (event.code !== 'Space' || event.repeat || ['INPUT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return; event.preventDefault(); doHeist(); });
window.addEventListener('pointerdown', () => audio.startBgm(), { once: true }); document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(state); audio.stopBgm(); } else if (bgmEnabled) audio.startBgm(); }); window.addEventListener('beforeunload', () => saveGame(state));
if (offlineSeconds > 2) { const gain = advanceTime(state, offlineSeconds); window.setTimeout(() => showToast(`The bots kept stealing: +${fmt(gain)} Context Coins`), 300); }
window.setInterval(() => { const current = performance.now(); advanceTime(state, Math.min(1, (current - lastTick) / 1000)); lastTick = current; render(); }, 250); window.setInterval(() => saveGame(state), 5_000); window.setInterval(() => { if (!state.event) triggerEvent(); }, 55_000);
render(); if (state.completed) window.setTimeout(() => { confetti(120); byId<HTMLButtonElement>('viewHeistButton').focus(); }, 180); try { if (!state.completed && !localStorage.getItem('token-heist-guide-seen-v1')) window.setTimeout(openGuide, 250); } catch { if (!state.completed) window.setTimeout(openGuide, 250); }
