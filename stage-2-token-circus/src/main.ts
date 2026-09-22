import './style.css';
import {
  COSTUME_NAMES, PERFORMERS, WHIP_NAMES,
  advanceTime, buyCostume, buyPerformer, buyTrick, buyUpgrade, crackWhip,
  createInitialState, curtainCall, fireGreatTokenCannon, getCostumeCost,
  getFinaleProgress, getNextObjective, getPerformerCost, getPerformerRate,
  getProduction, getTicketGain, getTrickCost, getUpgradeCost, getVenue,
  getWhipValue, promptPerformer,
  type CircusEvent, type PerformerId, type UpgradeId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app');

const fmt = (value: number): string => {
  if (!Number.isFinite(value)) return 'MAX';
  if (value < 1_000) return value < 10 && value % 1 !== 0 ? value.toFixed(1) : Math.floor(value).toLocaleString();
  const units: Array<[number, string]> = [[1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [scale, suffix] = units.find(([scale]) => value >= scale) ?? [1, ''];
  const scaled = value / scale;
  return `${scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : Math.floor(scaled)}${suffix}`;
};

const cost = (value: number): string => Number.isFinite(value) ? `${fmt(value)} T` : 'MAXED';

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <span class="stage-tag">STAGE 02</span>
        <div class="brand">TOKEN <span>CIRCUS</span></div>
        <small id="venueLabel">Parking Lot Tent</small>
      </div>
      <div class="resource-block" aria-live="polite">
        <span class="resource-kicker">TOKENS IN THE HAT</span>
        <strong id="tokenValue">0</strong>
        <span id="rateValue">+0 / sec</span>
      </div>
      <div class="top-actions">
        <a class="stage-link" href="/">← TOKEN OFFICE</a>
        <button id="soundButton" class="utility-button" type="button">SOUND ON</button>
        <button id="resetButton" class="utility-button danger" type="button">RESET</button>
      </div>
    </header>

    <main class="game-grid">
      <section class="show-column" aria-label="Main circus performance">
        <div class="objective-strip">
          <span>RINGMASTER'S NEXT BAD IDEA</span>
          <strong id="objectiveLabel">Recruit Qwen</strong>
          <b id="objectiveCount">0 / 90</b>
          <div class="meter"><i id="objectiveFill"></i></div>
        </div>

        <div id="circusRing" class="circus-ring">
          <div class="curtain curtain-left" aria-hidden="true"></div>
          <div class="curtain curtain-right" aria-hidden="true"></div>
          <div class="spotlight" aria-hidden="true"></div>
          <div class="marquee"><span>TONIGHT ONLY*</span><small>*also every night</small></div>
          <div id="ovationBanner" class="ovation-banner">STANDING OVATION ×3</div>
          <div id="performerStage" class="performer-stage" aria-live="polite">
            <span id="stageEmoji" class="stage-emoji">🦙</span>
            <strong id="stageName">LLAMA</strong>
            <p id="stageAct">Jumps through token hoops</p>
            <button id="performButton" class="perform-button" type="button">PROMPT THIS MODEL</button>
          </div>
          <button id="whipButton" class="whip-button" type="button" aria-label="Crack the prompt whip">
            <span class="whip-icon">⚡</span>
            <strong>CRACK PROMPT WHIP</strong>
            <small>SPACE · <b id="whipYield">+1 Token</b></small>
          </button>
          <div class="ring-floor" aria-hidden="true"></div>
        </div>

        <div class="hype-panel">
          <div><span>AUDIENCE HYPE</span><b id="hypeLabel">0%</b></div>
          <div class="hype-meter"><i id="hypeFill"></i></div>
          <small>Fill it to trigger 12 seconds of ×3 Standing Ovation.</small>
        </div>

        <div id="eventCard" class="event-card hidden">
          <span>🚨 UNSCHEDULED CIRCUS INCIDENT</span>
          <strong id="eventLabel"></strong>
          <p id="eventDetail"></p>
        </div>
      </section>

      <section class="roster-column" aria-label="AI performer roster">
        <div class="section-heading">
          <div><span>THE QUESTIONABLE TALENT</span><h1>AI PERFORMERS</h1></div>
          <p>Click an act to put it in the ring. Buy doubles because employment law is complicated.</p>
        </div>
        <div id="performerGrid" class="performer-grid"></div>
      </section>

      <aside class="upgrade-column" aria-label="Circus upgrades">
        <section class="panel booth-panel">
          <div class="panel-title"><span>UPGRADE BOOTH</span><b>NO REFUNDS</b></div>
          <div class="upgrade-list">
            <button class="upgrade-card" data-upgrade="whip" type="button">
              <span class="upgrade-icon">⚡</span><span><strong id="whipName">Pool Noodle</strong><small>Stronger manual prompts</small></span><b id="whipCost">180 T</b>
            </button>
            <button class="upgrade-card" data-upgrade="cannon" type="button">
              <span class="upgrade-icon">💥</span><span><strong>AUTO-WHIP CANNONS <i id="cannonLevel">0/5</i></strong><small>Whips automatically. Probably legal.</small></span><b id="cannonCost">4K T</b>
            </button>
            <button class="upgrade-card" data-upgrade="spotlight" type="button">
              <span class="upgrade-icon">🔦</span><span><strong>SPOTLIGHT <i id="spotlightLevel">0/10</i></strong><small>Boost prompt-whip power</small></span><b id="spotlightCost">550 T</b>
            </button>
            <button class="upgrade-card" data-upgrade="audience" type="button">
              <span class="upgrade-icon">🍿</span><span><strong>LOUDER AUDIENCE <i id="audienceLevel">0/10</i></strong><small>Boost every performer's output</small></span><b id="audienceCost">1.2K T</b>
            </button>
          </div>
        </section>

        <section class="panel ticket-panel">
          <div class="ticket-stub">
            <span>ADMIT ONE REALITY</span>
            <strong id="ticketCount">0</strong>
            <b>GOLDEN TICKETS</b>
            <small id="ticketBonus">Permanent bonus ×1.00</small>
          </div>
          <div class="curtain-copy">
            <span>CURTAIN CALL</span>
            <p>Reset this show for permanent Golden Tickets and a fancier venue.</p>
            <button id="curtainButton" type="button">END SHOW · +<b id="ticketGain">0</b> TICKETS</button>
          </div>
        </section>

        <section id="finalePanel" class="panel finale-panel">
          <span>THE GREAT TOKEN CANNON</span>
          <strong id="finaleStatus">0/10 Legendary · 0/5 Cannons · 0/25 Tickets</strong>
          <button id="finaleButton" type="button">FIRE THE FINALE</button>
        </section>
      </aside>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <div id="confetti" class="confetti" aria-hidden="true"></div>
  </div>
`;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
};

const performerGrid = byId<HTMLDivElement>('performerGrid');
performerGrid.innerHTML = PERFORMERS.map((performer) => `
  <article class="performer-card" data-card="${performer.id}" style="--accent:${performer.accent}">
    <button class="performer-select" data-select="${performer.id}" type="button">
      <span class="performer-emoji">${performer.emoji}</span>
      <span class="performer-copy"><strong>${performer.name}</strong><small>${performer.act}</small></span>
      <b data-count="${performer.id}">×0</b>
    </button>
    <div class="performer-stats"><span data-rate="${performer.id}">0 T/s</span><span data-costume-name="${performer.id}">Cardboard</span></div>
    <div class="performer-actions">
      <button data-buy="${performer.id}" type="button">RECRUIT <b data-buy-cost="${performer.id}">0 T</b></button>
      <button data-trick="${performer.id}" type="button">TRICK <span data-trick-level="${performer.id}">LV 1</span><b data-trick-cost="${performer.id}">0 T</b></button>
      <button data-costume="${performer.id}" type="button">COSTUME <span data-costume-level="${performer.id}">0/4</span><b data-costume-cost="${performer.id}">0 T</b></button>
    </div>
  </article>
`).join('');

let { state, offlineSeconds } = loadGame();
let selectedId: PerformerId = 'llama';
let soundEnabled = true;
let lastTick = performance.now();
let toastTimer = 0;
let lastEventPrompt = state.promptCount;

class CircusAudio {
  private context: AudioContext | null = null;
  private tone(frequency: number, duration = 0.08, type: OscillatorType = 'square'): void {
    if (!soundEnabled) return;
    this.context ??= new AudioContext();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
  whip(): void { this.tone(560, 0.05, 'sawtooth'); window.setTimeout(() => this.tone(900, 0.07), 35); }
  buy(): void { this.tone(440, 0.08); window.setTimeout(() => this.tone(660, 0.08), 70); }
  fail(): void { this.tone(120, 0.12, 'sawtooth'); }
  fanfare(): void { [523, 659, 784, 1047].forEach((note, index) => window.setTimeout(() => this.tone(note, 0.18, 'triangle'), index * 90)); }
}

const audio = new CircusAudio();

const showToast = (message: string): void => {
  const toast = byId<HTMLDivElement>('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
};

const makeConfetti = (amount = 28): void => {
  const host = byId<HTMLDivElement>('confetti');
  const colors = ['#ffd54a', '#ff365f', '#38e8ff', '#8b5cf6', '#ffffff'];
  for (let index = 0; index < amount; index += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
    host.append(piece);
    window.setTimeout(() => piece.remove(), 3600);
  }
};

const funnyEvents: Array<Omit<NonNullable<CircusEvent>, 'until'>> = [
  { label: 'LLAMA ATE THE PROMPT', detail: 'It claims the system message was artisanal. Output ×2 for 20 seconds.', multiplier: 2 },
  { label: 'CLAUDE EXCEEDED THE CONTEXT WINDOW', detail: 'The monologue now has an intermission. Output ×2.5 for 15 seconds.', multiplier: 2.5 },
  { label: 'GROK STARTED BEEF WITH THE POPCORN', detail: 'Ticket sales are inexplicably up. Output ×1.75 for 25 seconds.', multiplier: 1.75 },
  { label: 'GEMINI BROUGHT AN EXTRA TWIN', detail: 'Nobody checked the guest list. Output ×3 for 12 seconds.', multiplier: 3 },
  { label: 'KIMI MOONWALKED THROUGH THE FIREWALL', detail: 'The audience thinks this is part of the act. Output ×2 for 20 seconds.', multiplier: 2 },
  { label: 'CHATGPT SAID “ABSOLUTELY!”', detail: 'Then attempted all nine tricks. Output ×2.2 for 18 seconds.', multiplier: 2.2 },
];

const triggerFunnyEvent = (): void => {
  const selected = funnyEvents[Math.floor(Math.random() * funnyEvents.length)];
  const seconds = selected.multiplier >= 3 ? 12 : selected.multiplier >= 2.5 ? 15 : selected.multiplier >= 2.2 ? 18 : selected.multiplier >= 2 ? 20 : 25;
  state.event = { ...selected, until: Date.now() + seconds * 1000 };
  showToast(selected.label);
  makeConfetti(16);
  audio.fanfare();
};

const maybeTriggerEvent = (): void => {
  if (state.promptCount - lastEventPrompt < 24) return;
  lastEventPrompt = state.promptCount;
  triggerFunnyEvent();
};

const floatGain = (amount: number): void => {
  const ring = byId<HTMLDivElement>('circusRing');
  const label = document.createElement('span');
  label.className = 'gain-float';
  label.textContent = `+${fmt(amount)} T`;
  label.style.left = `${38 + Math.random() * 24}%`;
  ring.append(label);
  window.setTimeout(() => label.remove(), 900);
};

const doPrompt = (performerId?: PerformerId): void => {
  const wasOvation = state.ovationUntil > Date.now();
  const gained = performerId ? promptPerformer(state, performerId) : crackWhip(state);
  if (gained <= 0) return;
  selectedId = performerId ?? selectedId;
  audio.whip();
  floatGain(gained);
  byId<HTMLDivElement>('circusRing').classList.remove('cracked');
  requestAnimationFrame(() => byId<HTMLDivElement>('circusRing').classList.add('cracked'));
  if (!wasOvation && state.ovationUntil > Date.now()) {
    makeConfetti(48);
    audio.fanfare();
    showToast('STANDING OVATION! All output ×3');
  }
  maybeTriggerEvent();
  render();
};

const tryPurchase = (action: () => boolean, success: string): void => {
  if (action()) {
    audio.buy();
    showToast(success);
    saveGame(state);
  } else {
    audio.fail();
    showToast('Not enough Tokens. The clown accountant said no.');
  }
  render();
};

const render = (): void => {
  const now = Date.now();
  const production = getProduction(state, now) + getWhipValue(state, now) * state.cannons * 0.2;
  byId('tokenValue').textContent = fmt(state.tokens);
  byId('rateValue').textContent = `+${fmt(production)} / sec`;
  byId('venueLabel').textContent = getVenue(state);
  byId('whipYield').textContent = `+${fmt(getWhipValue(state, now))} Tokens`;
  byId('hypeLabel').textContent = `${Math.floor(state.hype)}%`;
  byId<HTMLElement>('hypeFill').style.width = `${state.hype}%`;

  const objective = getNextObjective(state);
  byId('objectiveLabel').textContent = objective.label;
  byId('objectiveCount').textContent = `${fmt(objective.current)} / ${fmt(objective.target)}`;
  byId<HTMLElement>('objectiveFill').style.width = `${Math.min(100, objective.current / objective.target * 100)}%`;

  const selected = PERFORMERS.find((performer) => performer.id === selectedId) ?? PERFORMERS[0];
  const selectedOwned = state.performers[selected.id].count > 0;
  byId('stageEmoji').textContent = selectedOwned ? selected.emoji : '🔒';
  byId('stageName').textContent = selected.name.toUpperCase();
  byId('stageAct').textContent = selectedOwned ? selected.act : `Recruit ${selected.name} before demanding unpaid tricks.`;
  const performButton = byId<HTMLButtonElement>('performButton');
  performButton.disabled = !selectedOwned;
  performButton.textContent = selectedOwned ? 'PROMPT THIS MODEL' : 'MODEL NOT ON PAYROLL';

  const ovationActive = state.ovationUntil > now;
  byId('ovationBanner').classList.toggle('active', ovationActive);
  byId('circusRing').classList.toggle('ovation', ovationActive);
  byId('eventCard').classList.toggle('hidden', !state.event);
  if (state.event) {
    byId('eventLabel').textContent = state.event.label;
    byId('eventDetail').textContent = `${state.event.detail} ${Math.max(0, Math.ceil((state.event.until - now) / 1000))}s left.`;
  }

  for (const performer of PERFORMERS) {
    const owned = state.performers[performer.id];
    const performerCost = getPerformerCost(state, performer);
    const trickCost = getTrickCost(state, performer);
    const costumeCost = getCostumeCost(state, performer);
    const card = document.querySelector<HTMLElement>(`[data-card="${performer.id}"]`);
    card?.classList.toggle('locked', owned.count === 0);
    card?.classList.toggle('selected', selectedId === performer.id);
    const set = (selector: string, value: string): void => { const node = document.querySelector<HTMLElement>(selector); if (node) node.textContent = value; };
    set(`[data-count="${performer.id}"]`, `×${owned.count}`);
    set(`[data-rate="${performer.id}"]`, `${fmt(getPerformerRate(state, performer, now))} T/s`);
    set(`[data-costume-name="${performer.id}"]`, COSTUME_NAMES[owned.costume]);
    set(`[data-buy-cost="${performer.id}"]`, cost(performerCost));
    set(`[data-trick-level="${performer.id}"]`, `LV ${owned.trick}`);
    set(`[data-trick-cost="${performer.id}"]`, cost(trickCost));
    set(`[data-costume-level="${performer.id}"]`, `${owned.costume}/4`);
    set(`[data-costume-cost="${performer.id}"]`, cost(costumeCost));
    const buyButton = document.querySelector<HTMLButtonElement>(`[data-buy="${performer.id}"]`);
    const trickButton = document.querySelector<HTMLButtonElement>(`[data-trick="${performer.id}"]`);
    const costumeButton = document.querySelector<HTMLButtonElement>(`[data-costume="${performer.id}"]`);
    if (buyButton) buyButton.disabled = state.tokens < performerCost;
    if (trickButton) trickButton.disabled = owned.count === 0 || state.tokens < trickCost;
    if (costumeButton) costumeButton.disabled = owned.count === 0 || state.tokens < costumeCost;
  }

  byId('whipName').textContent = WHIP_NAMES[state.whipTier];
  byId('cannonLevel').textContent = `${state.cannons}/5`;
  byId('spotlightLevel').textContent = `${state.spotlight}/10`;
  byId('audienceLevel').textContent = `${state.audience}/10`;
  (['whip', 'cannon', 'spotlight', 'audience'] as UpgradeId[]).forEach((id) => {
    byId(`${id}Cost`).textContent = cost(getUpgradeCost(state, id));
    const button = document.querySelector<HTMLButtonElement>(`[data-upgrade="${id}"]`);
    if (button) button.disabled = state.tokens < getUpgradeCost(state, id);
  });

  const ticketGain = getTicketGain(state);
  byId('ticketCount').textContent = fmt(state.goldenTickets);
  byId('ticketBonus').textContent = `Permanent bonus ×${(1 + state.goldenTickets * 0.08).toFixed(2)}`;
  byId('ticketGain').textContent = fmt(ticketGain);
  byId<HTMLButtonElement>('curtainButton').disabled = ticketGain < 1;

  const finale = getFinaleProgress(state);
  byId('finaleStatus').textContent = `${finale.legendary}/10 Legendary · ${state.cannons}/5 Cannons · ${state.goldenTickets}/25 Tickets`;
  byId<HTMLButtonElement>('finaleButton').disabled = !finale.ready || state.completed;
  byId<HTMLButtonElement>('finaleButton').textContent = state.completed ? 'CONTEXT CONQUERED ✓' : 'FIRE THE FINALE';
  byId('finalePanel').classList.toggle('ready', finale.ready && !state.completed);
};

performerGrid.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const selectable = target.closest<HTMLElement>('[data-select]');
  const buy = target.closest<HTMLButtonElement>('[data-buy]');
  const trick = target.closest<HTMLButtonElement>('[data-trick]');
  const costumeButton = target.closest<HTMLButtonElement>('[data-costume]');
  if (selectable) {
    selectedId = selectable.dataset.select as PerformerId;
    if (state.performers[selectedId].count > 0) doPrompt(selectedId); else render();
  }
  if (buy) {
    const id = buy.dataset.buy as PerformerId;
    tryPurchase(() => buyPerformer(state, id), `${PERFORMERS.find((entry) => entry.id === id)?.name ?? 'Model'} joined the circus!`);
  }
  if (trick) {
    const id = trick.dataset.trick as PerformerId;
    tryPurchase(() => buyTrick(state, id), 'New trick learned. Insurance premium increased.');
  }
  if (costumeButton) {
    const id = costumeButton.dataset.costume as PerformerId;
    tryPurchase(() => buyCostume(state, id), 'Costume upgraded. Dignity not included.');
  }
});

byId('whipButton').addEventListener('click', () => doPrompt());
byId('performButton').addEventListener('click', () => doPrompt(selectedId));

document.querySelector('.upgrade-list')?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-upgrade]');
  if (!button) return;
  const id = button.dataset.upgrade as UpgradeId;
  tryPurchase(() => buyUpgrade(state, id), id === 'cannon' ? 'Auto-Whip Cannon loaded!' : 'The upgrade booth accepts your questionable purchase.');
});

byId('curtainButton').addEventListener('click', () => {
  const gained = curtainCall(state);
  if (!gained) return;
  selectedId = 'llama';
  audio.fanfare();
  makeConfetti(64);
  showToast(`Curtain call! +${gained} Golden Tickets`);
  saveGame(state);
  render();
});

byId('finaleButton').addEventListener('click', () => {
  if (!fireGreatTokenCannon(state)) return;
  audio.fanfare();
  makeConfetti(140);
  showToast('THE GREAT TOKEN CANNON HAS BREACHED CONTEXT!');
  saveGame(state);
  render();
});

byId('soundButton').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  byId('soundButton').textContent = `SOUND ${soundEnabled ? 'ON' : 'OFF'}`;
  if (soundEnabled) audio.buy();
});

byId('resetButton').addEventListener('click', () => {
  if (!window.confirm('Fire the entire circus and erase all Token Circus progress? Token Office is unaffected.')) return;
  clearGame();
  state = createInitialState();
  selectedId = 'llama';
  render();
  showToast('The circus has been legally dissolved.');
});

window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || ['INPUT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return;
  event.preventDefault();
  doPrompt();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(state); });
window.addEventListener('beforeunload', () => saveGame(state));

if (offlineSeconds > 2) {
  const offlineGain = advanceTime(state, offlineSeconds);
  window.setTimeout(() => showToast(`The show continued without you: +${fmt(offlineGain)} Tokens`), 300);
}

window.setInterval(() => {
  const current = performance.now();
  advanceTime(state, Math.min(1, (current - lastTick) / 1000));
  lastTick = current;
  render();
}, 250);
window.setInterval(() => saveGame(state), 5_000);
window.setInterval(() => { if (!state.event) triggerFunnyEvent(); }, 55_000);

render();
