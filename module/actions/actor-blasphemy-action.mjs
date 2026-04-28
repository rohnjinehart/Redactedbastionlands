import { nl2p } from '../helpers/standard_event_assignment_shortcuts.mjs';

/**
 * Show the Use Blasphemy dialog, post the chosen power to chat,
 * and optionally roll 1d6 sin (Sin Amp) for the empowered version.
 *
 * @param {Actor} actor
 */
export async function actorBlasphemyAction(actor) {
  const powerIds = actor.system.currentBlasphemyPowers || [];
  const powers = powerIds
    .map(id => game.items.get(id))
    .filter(p => p && !p.system.isPassive);

  if (powers.length === 0) {
    ui.notifications.warn(`${actor.name} has no active blasphemy powers.`);
    return;
  }

  const data = await showBlasphemyDialog(powers);
  if (!data) return;

  const { powerId, sinAmp } = data;
  const power = game.items.get(powerId);
  if (!power) return;

  const catLevel = actor.system.CATLEVEL?.value ?? 0;
  const desc = window.formatCatText
    ? window.formatCatText(power.system.powerDescription, catLevel)
    : power.system.powerDescription;

  // Grace save — failure causes burnout
  const graceSave = await _rollGraceSave(actor);

  let ampDescSection = '';
  let sinSection = '';
  if (sinAmp) {
    const ampDesc = power.system.ampDescription || '';
    if (ampDesc) {
      ampDescSection = `
        <div style="margin-top:8px;padding:6px 8px;background:#1a0a1a;border-left:3px solid #bf5fff;border-radius:3px;">
          <strong style="color:#bf5fff;"><i class="fas fa-bolt" style="margin-right:4px;"></i>Sin Amp</strong>
          <div style="color:#dda0dd;">${nl2p(ampDesc)}</div>
        </div>`;
    }

    const sinRoll = await new Roll('1d6').roll();
    const currentSin = actor.system.sinOverflow?.value ?? 0;
    await actor.update({ 'system.sinOverflow.value': currentSin + sinRoll.total });
    await sinRoll.toMessage({
      flavor: `${actor.name} — Sin Amp: +${sinRoll.total} SIN`,
      speaker: ChatMessage.getSpeaker({ actor }),
    });
    sinSection = `
      <div style="margin-top:6px;padding:6px 8px;background:#1a0a0a;border-left:3px solid #e94560;border-radius:3px;">
        <strong style="color:#e94560;">Sin Amp</strong>
        — +<strong>${sinRoll.total}</strong> sin (${currentSin} → ${currentSin + sinRoll.total})
      </div>`;
  }

  const saveColor = graceSave.success ? '#2ecc71' : '#e94560';
  const saveLabel = graceSave.success ? 'Success' : 'Failure — Burnout';
  const graceSection = `
    <div style="margin-top:6px;padding:6px 8px;background:#111;border-left:3px solid ${saveColor};border-radius:3px;">
      <strong style="color:${saveColor};">Grace Save</strong>
      — rolled <strong>${graceSave.roll}</strong> vs Grace <strong>${graceSave.threshold}</strong>
      — <span style="color:${saveColor};">${saveLabel}</span>
    </div>`;

  ChatMessage.create({
    content: `
      <div style="background:#1a1a1a;border:1px solid #5a1a8a;border-radius:5px;padding:10px;color:#ddd;">
        <h3 style="margin:0 0 6px;color:#bf5fff;border-bottom:1px solid #5a1a8a;padding-bottom:4px;">
          ${power.system.powerName || power.name}
        </h3>
        <div>${nl2p(desc)}</div>
        ${ampDescSection}
        ${sinSection}
        ${graceSection}
      </div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
  });
}

// ---------------------------------------------------------------------------
// Grace save
// ---------------------------------------------------------------------------

async function _rollGraceSave(actor) {
  const grace = actor.system.grace;
  const roll = await new Roll('1d20').roll();
  const success = roll.total <= grace.value;

  if (!success) {
    await actor.update({ 'system.burnout': true });
  }

  return { roll: roll.total, threshold: grace.value, success };
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

async function showBlasphemyDialog(powers) {
  const options = powers
    .map(p => `<option value="${p.id}">${p.system.powerName || p.name}</option>`)
    .join('');

  const content = `
    <div class="rb-bl-wrap">
      <form class="rb-blasphemy-dialog">
        <div class="rb-bl-section">
          <label class="rb-bl-label">Power</label>
          <select id="rb-bl-power" class="rb-bl-select">
            ${options}
          </select>
        </div>
        <hr class="rb-bl-hr"/>
        <div class="rb-bl-section">
          <label class="rb-bl-row">
            <input type="checkbox" id="rb-sin-amp-check"/>
            <strong>Sin Amp</strong>
            <span class="rb-bl-hint">(roll 1d6 sin for the empowered version)</span>
          </label>
        </div>
      </form>
    </div>
    <style>
      .rb-bl-wrap,
      .app.dialog .dialog-content,
      .window-app .dialog-content { background: transparent; }

      .rb-bl-wrap {
        background: #1a1a1a;
        color: #e0e0e0;
        padding: 10px 12px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
      }
      .rb-blasphemy-dialog { display:flex; flex-direction:column; gap:10px; margin:0; padding:0; background:transparent; border:none; }
      .rb-bl-section       { display:flex; flex-direction:column; gap:5px; }
      .rb-bl-hr            { border:none; border-top:1px solid #333; margin:2px 0; }
      .rb-bl-label         { font-size:0.85em; color:#aaa; margin-bottom:3px; }
      .rb-bl-select {
        width:100%;
        background:#262626; color:#e0e0e0;
        border:1px solid #5a1a8a; border-radius:3px;
        padding:5px 8px; font-size:0.95em;
      }
      .rb-bl-select option { background:#1a1a1a; }
      .rb-bl-row   { display:flex; align-items:center; gap:8px; color:#e0e0e0; cursor:pointer; }
      .rb-bl-hint  { color:#888; font-size:0.80em; }
      .rb-bl-wrap input[type=checkbox] { accent-color:#bf5fff; cursor:pointer; width:16px; height:16px; }
    </style>`;

  return new Promise((resolve) => {
    new Dialog(
      {
        title: 'Use Blasphemy',
        content,
        buttons: {
          use: {
            label: '<i class="fas fa-bolt"></i> Use Power',
            callback: (html) => {
              const powerId = html[0].querySelector('#rb-bl-power').value;
              const sinAmp  = html[0].querySelector('#rb-sin-amp-check').checked;
              resolve({ powerId, sinAmp });
            },
          },
          cancel: { label: 'Cancel', callback: () => resolve(null) },
        },
        default: 'use',
      },
      { classes: ['dialog', 'cain'] }
    ).render(true);
  });
}
