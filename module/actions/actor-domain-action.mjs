import { nl2p } from '../helpers/standard_event_assignment_shortcuts.mjs';

/**
 * Show the Use Domain dialog for an opponent, then post the chosen domain to chat.
 * Optionally posts the Savage Attack description instead of the normal description.
 *
 * @param {Actor} actor  — must be type 'opponent'
 */
export async function actorDomainAction(actor) {
  const domainIds = actor.system.domains ?? [];
  const domains = domainIds
    .map(id => game.items.get(id))
    .filter(d => d);

  if (domains.length === 0) {
    ui.notifications.warn(`${actor.name} has no domains assigned.`);
    return;
  }

  const data = await showDomainDialog(domains);
  if (!data) return;

  const { domainId, savageAttack } = data;
  const domain = game.items.get(domainId);
  if (!domain) return;

  const displayName = domain.system.domainName || domain.name;
  const desc        = domain.system.domainDescription || '';
  const savageDesc  = domain.system.savageAttackDescription || '';

  // Grace save — failure causes burnout
  const graceSave = await _rollGraceSave(actor);

  let savageSection = '';
  if (savageAttack && savageDesc) {
    savageSection = `
      <div style="margin-top:8px;padding:6px 8px;background:#1a0808;border-left:3px solid #e94560;border-radius:3px;">
        <strong style="color:#e94560;"><i class="fas fa-skull" style="margin-right:4px;"></i>Savage Attack</strong>
        <div style="color:#f5a0a0;">${nl2p(savageDesc)}</div>
      </div>`;
  } else if (savageAttack && !savageDesc) {
    savageSection = `
      <div style="margin-top:8px;padding:6px 8px;background:#1a0808;border-left:3px solid #e94560;border-radius:3px;">
        <em style="color:#888;">No savage attack description recorded.</em>
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
      <div style="background:#1a1a1a;border:1px solid #8b2020;border-radius:5px;padding:10px;color:#ddd;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;border-bottom:1px solid #8b2020;padding-bottom:6px;">
          <img src="${domain.img}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;border:1px solid #8b2020;flex-shrink:0;"/>
          <h3 style="margin:0;color:#ff8888;">${displayName}</h3>
        </div>
        <div>${nl2p(desc)}</div>
        ${savageSection}
        ${graceSection}
      </div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
  });
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

async function showDomainDialog(domains) {
  const options = domains
    .map(d => `<option value="${d.id}">${d.system.domainName || d.name}</option>`)
    .join('');

  const content = `
    <div class="rb-dm-wrap">
      <form class="rb-domain-dialog">
        <div class="rb-dm-section">
          <label class="rb-dm-label">Domain</label>
          <select id="rb-dm-domain" class="rb-dm-select">
            ${options}
          </select>
        </div>
        <hr class="rb-dm-hr"/>
        <div class="rb-dm-section">
          <label class="rb-dm-row">
            <input type="checkbox" id="rb-savage-check"/>
            <strong>Savage Attack</strong>
            <span class="rb-dm-hint">(use the domain's savage attack)</span>
          </label>
        </div>
      </form>
    </div>
    <style>
      .rb-dm-wrap,
      .app.dialog .dialog-content,
      .window-app .dialog-content { background: transparent; }

      .rb-dm-wrap {
        background: #1a1a1a;
        color: #e0e0e0;
        padding: 10px 12px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
      }
      .rb-domain-dialog { display:flex; flex-direction:column; gap:10px; margin:0; padding:0; background:transparent; border:none; }
      .rb-dm-section    { display:flex; flex-direction:column; gap:5px; }
      .rb-dm-hr         { border:none; border-top:1px solid #333; margin:2px 0; }
      .rb-dm-label      { font-size:0.85em; color:#aaa; margin-bottom:3px; }
      .rb-dm-select {
        width:100%;
        background:#262626; color:#e0e0e0;
        border:1px solid #8b2020; border-radius:3px;
        padding:5px 8px; font-size:0.95em;
      }
      .rb-dm-select option { background:#1a1a1a; }
      .rb-dm-row  { display:flex; align-items:center; gap:8px; color:#e0e0e0; cursor:pointer; }
      .rb-dm-hint { color:#888; font-size:0.80em; }
      .rb-dm-wrap input[type=checkbox] { accent-color:#e94560; cursor:pointer; width:16px; height:16px; }
    </style>`;

  return new Promise((resolve) => {
    new Dialog(
      {
        title: 'Use Domain',
        content,
        buttons: {
          use: {
            label: '<i class="fas fa-dragon"></i> Use Domain',
            callback: (html) => {
              const domainId    = html[0].querySelector('#rb-dm-domain').value;
              const savageAttack = html[0].querySelector('#rb-savage-check').checked;
              resolve({ domainId, savageAttack });
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

// ---------------------------------------------------------------------------
// Grace save
// ---------------------------------------------------------------------------

async function _rollGraceSave(actor) {
  const grace = actor.system.grace;
  const roll  = await new Roll('1d20').roll();
  const success = roll.total <= grace.value;

  if (!success) {
    await actor.update({ 'system.burnout': true });
  }

  return { roll: roll.total, threshold: grace.value, success };
}
