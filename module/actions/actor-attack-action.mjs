/**
 * Show the attack dialog, resolve options, roll attack, and post to chat.
 * If Smite is checked, a Body save is rolled automatically — failure sets Burnout.
 *
 * @param {Actor} actor
 */
export async function actorAttackAction(actor) {
  const data = await showAttackDialog(actor);
  if (!data) return;

  const { weaponIds, impairedWeaponIds, smite, smiteType, impaired, bonusDice } = data;

  // Block attack if any selected magazine weapon is empty (item weapons only).
  const itemWeaponIds = weaponIds.filter(id => !id.startsWith('opp-'));
  const magazineWeapons = actor.items.filter(i =>
    i.type === 'weapon' && itemWeaponIds.includes(i.id) && i.system.magazine
  );
  const emptyMags = magazineWeapons.filter(i => (i.system.magazineCurrent ?? 0) <= 0);
  if (emptyMags.length > 0) {
    const names = emptyMags.map(i => i.name).join(', ');
    ui.notifications.warn(`${names} ${emptyMags.length === 1 ? 'has an' : 'have'} empty magazine${emptyMags.length === 1 ? '' : 's'} — reload before attacking.`);
    return;
  }

  // Smite triggers an automatic Body save before the attack resolves.
  let smiteOutcome = null;
  if (smite) {
    smiteOutcome = await _rollSmiteSave(actor);
  }

  const sources = _buildSources(actor, { weaponIds, impairedWeaponIds, bonusDice, impaired, smite, smiteType });

  if (sources.length === 0) {
    ui.notifications.warn('No damage sources. Equip a weapon or enable Impaired.');
    return;
  }

  // Roll each source die independently, take the highest (MB "pool and keep highest").
  const rolls = await Promise.all(sources.map(s => new Roll(s.formula).roll()));
  const best  = rolls.reduce((hi, r) => (r.total > hi.total ? r : hi), rolls[0]);

  const sourceList = sources.map((s, i) =>
    `<li>${s.name}: <strong>${rolls[i].total}</strong> (${s.formula}${s.impaired ? ', impaired→d4' : ''})</li>`
  ).join('');

  let smiteSection = '';
  if (smite && smiteOutcome) {
    const col   = smiteOutcome.success ? '#4CAF50' : '#e94560';
    const label = smiteOutcome.success ? 'Success' : 'Failure — Burnout';
    smiteSection = `
      <div style="margin-top:6px;padding:6px;background:#111;border-radius:3px;border-left:3px solid ${col};">
        <strong style="color:${col};">Smite — Body Save</strong>:
        rolled <strong>${smiteOutcome.roll}</strong> vs Body <strong>${smiteOutcome.threshold}</strong>
        — <span style="color:${col};">${label}</span>
      </div>`;
  }

  const blastNote = (smite && smiteType === 'blast')
    ? `<p style="color:#f39c12;margin:4px 0;font-weight:bold;">BLAST — hits all targets in area.</p>`
    : '';

  const content = `
    <div class="rb-roll attack-roll" style="background:#1a1a1a;border:1px solid #333;padding:10px;border-radius:5px;color:#ddd;">
      <h3 style="margin:0 0 6px;color:#fff;">Attack</h3>
      <ul style="margin:4px 0;padding-left:1.2em;">${sourceList}</ul>
      <p style="margin:6px 0;font-size:1.1em;">
        Damage: <strong style="color:#e94560;font-size:1.3em;">${best.total}</strong>
        <span style="font-size:0.85em;color:#aaa;">(highest of ${sources.length} die${sources.length !== 1 ? 's' : ''})</span>
      </p>
      ${blastNote}
      ${smiteSection}
      <div style="margin-top:8px;text-align:right;">
        <button class="rb-chat-take-damage"
                data-damage="${best.total}"
                style="background:#1a2a1a;border:1px solid #2a6a2a;color:#88cc88;padding:3px 10px;border-radius:3px;cursor:pointer;font-size:0.85em;">
          <i class="fas fa-shield-alt"></i> Apply as Damage
        </button>
      </div>
    </div>`;

  await best.toMessage({
    speaker:  ChatMessage.getSpeaker({ actor }),
    flavor:   content,
    rollMode: game.settings.get('core', 'rollMode'),
  });

  // Consume one round from each magazine weapon that was used.
  for (const w of magazineWeapons) {
    const fresh = actor.items.get(w.id);
    if (fresh) await fresh.update({ 'system.magazineCurrent': Math.max(0, (fresh.system.magazineCurrent ?? 0) - 1) });
  }
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

async function showAttackDialog(actor) {
  let weaponRows;

  if (actor.type === 'opponent') {
    const oppWeapons = actor.system.weapons ?? [];
    weaponRows = oppWeapons.map((w, i) => {
      const dmg = w.damage || 'd6';
      return `
        <div class="rb-atk-weapon-row">
          <input type="checkbox" name="weapon" value="opp-${i}" checked/>
          <span>${w.name || '(unnamed)'} (${dmg})</span>
          <label class="rb-atk-impaired-lbl">
            <input type="checkbox" name="weapon_impaired" value="opp-${i}"/> Impaired
          </label>
        </div>`;
    }).join('') || '<p style="color:#888;font-style:italic;margin:0;">No weapons — will roll unarmed d4.</p>';
  } else {
    const weapons    = actor.items.filter(i => i.type === 'weapon');
    const equipped   = weapons.filter(i => i.system.equipped);
    const unequipped = weapons.filter(i => !i.system.equipped);

    const weaponRow = (w, isEquipped) => {
      const rangeLabel = w.system.range
        ? `Range(${(w.system.rangeType ?? 'engaged').charAt(0).toUpperCase() + (w.system.rangeType ?? 'engaged').slice(1)})`
        : '';
      const props = [
        w.system.hefty ? 'Hefty' : '',
        w.system.long  ? 'Long'  : '',
        w.system.slow  ? 'Slow'  : '',
        w.system.blast ? 'Blast' : '',
        rangeLabel,
      ].filter(Boolean).join(', ');
      const propStr = props ? `, ${props}` : '';
      const dimStyle = isEquipped ? '' : 'opacity:0.6;';
      const uneqLabel = isEquipped ? '' : ' <em style="color:#888;font-size:0.8em;">(unequipped)</em>';
      const magBadge = w.system.magazine
        ? (() => {
            const cur = w.system.magazineCurrent ?? 0;
            const max = w.system.magazineSize ?? 0;
            const col = cur <= 0 ? '#e94560' : cur <= Math.ceil(max * 0.25) ? '#f39c12' : '#4CAF50';
            return ` <span style="font-family:monospace;color:${col};font-size:0.85em;">[${cur}/${max}]</span>`;
          })()
        : '';
      return `
        <div class="rb-atk-weapon-row" style="${dimStyle}">
          <input type="checkbox" name="weapon" value="${w.id}" ${isEquipped ? 'checked' : ''}/>
          <span>${w.name} (${w.system.damage}${propStr})${uneqLabel}${magBadge}</span>
          <label class="rb-atk-impaired-lbl">
            <input type="checkbox" name="weapon_impaired" value="${w.id}"/> Impaired
          </label>
        </div>`;
    };

    weaponRows = [
      ...equipped.map(w => weaponRow(w, true)),
      ...unequipped.map(w => weaponRow(w, false)),
    ].join('') || '<p style="color:#888;font-style:italic;margin:0;">No weapons — will roll unarmed d4.</p>';
  }

  const content = `
    <div class="rb-atk-wrap">
      <form class="rb-attack-dialog">
        <div class="rb-atk-section">${weaponRows}</div>
        <hr class="rb-atk-hr"/>
        <div class="rb-atk-section">
          <label class="rb-atk-row">
            <input type="checkbox" id="rb-smite-check"/>
            <strong>Smite</strong>
            <span class="rb-atk-hint">(rolls Body save; fail = Burnout)</span>
          </label>
          <div id="rb-smite-opts">
            <label class="rb-atk-row"><input type="radio" name="smite_type" value="damage" checked/> +d12</label>
            <label class="rb-atk-row"><input type="radio" name="smite_type" value="blast"/> Blast</label>
          </div>
        </div>
        <hr class="rb-atk-hr"/>
        <div class="rb-atk-section">
          <label class="rb-atk-row">
            <input type="checkbox" id="rb-impaired-check"/>
            Impaired
            <span class="rb-atk-hint">(all sources become d4)</span>
          </label>
        </div>
        <hr class="rb-atk-hr"/>
        <div class="rb-atk-section">
          <label class="rb-atk-row">
            Bonus Dice
            <input type="text" id="rb-bonus-dice" class="rb-atk-input" placeholder="e.g. d6"/>
          </label>
        </div>
      </form>
    </div>
    <style>
      /* Force dark theme on the entire dialog window */
      .rb-atk-wrap,
      .app.dialog .dialog-content,
      .window-app .dialog-content { background: transparent; }

      .rb-atk-wrap {
        background: #1a1a1a;
        color: #e0e0e0;
        padding: 10px 12px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
      }
      .rb-attack-dialog { display:flex; flex-direction:column; gap:8px; margin:0; padding:0; background:transparent; border:none; }
      .rb-atk-section   { display:flex; flex-direction:column; gap:5px; }
      .rb-atk-hr        { border:none; border-top:1px solid #333; margin:4px 0; }
      .rb-atk-weapon-row { display:flex; align-items:center; gap:8px; color:#e0e0e0; }
      .rb-atk-impaired-lbl { margin-left:auto; font-size:0.82em; color:#888; display:flex; align-items:center; gap:4px; cursor:pointer; }
      .rb-atk-row { display:flex; align-items:center; gap:8px; color:#e0e0e0; cursor:pointer; }
      .rb-atk-hint { color:#888; font-size:0.80em; }
      .rb-atk-input {
        width:72px; margin-left:8px;
        background:#262626; color:#e0e0e0;
        border:1px solid #444; border-radius:3px;
        padding:2px 5px;
      }
      .rb-atk-input::placeholder { color:#555; }
      #rb-smite-opts {
        display:none; flex-direction:row; gap:16px;
        margin-left:22px; margin-top:4px;
      }
      /* checkbox / radio accent */
      .rb-atk-wrap input[type=checkbox],
      .rb-atk-wrap input[type=radio] { accent-color: #e94560; cursor:pointer; }
    </style>`;

  return new Promise((resolve) => {
    new Dialog(
      {
        title: 'Attack',
        content,
        buttons: {
          roll: {
            label: '<i class="fas fa-dice"></i> Roll Attack',
            callback: (html) => {
              const el = id => html[0].querySelector(id);
              const weaponIds         = Array.from(html[0].querySelectorAll('input[name=weapon]:checked')).map(i => i.value);
              const impairedWeaponIds = Array.from(html[0].querySelectorAll('input[name=weapon_impaired]:checked')).map(i => i.value);
              const smite     = el('#rb-smite-check').checked;
              const smiteType = html[0].querySelector('input[name=smite_type]:checked')?.value ?? 'damage';
              const impaired  = el('#rb-impaired-check').checked;
              const bonusDice = el('#rb-bonus-dice').value.trim();
              resolve({ weaponIds, impairedWeaponIds, smite, smiteType, impaired, bonusDice });
            },
          },
          cancel: { label: 'Cancel', callback: () => resolve(null) },
        },
        default: 'roll',
        render: (html) => {
          const check = html[0].querySelector('#rb-smite-check');
          const opts  = html[0].querySelector('#rb-smite-opts');
          check.addEventListener('change', () => {
            opts.style.display = check.checked ? 'flex' : 'none';
          });
        },
      },
      { classes: ['dialog', 'cain'] }
    ).render(true);
  });
}

// ---------------------------------------------------------------------------
// Smite save
// ---------------------------------------------------------------------------

async function _rollSmiteSave(actor) {
  const body   = actor.system.body;
  const roll   = await new Roll('1d20').roll();
  const success = roll.total <= body.value;

  if (!success) {
    await actor.update({ 'system.burnout': true });
  }

  return { roll: roll.total, threshold: body.value, success };
}

// ---------------------------------------------------------------------------
// Source building
// ---------------------------------------------------------------------------

function _buildSources(actor, { weaponIds, impairedWeaponIds, bonusDice, impaired, smite, smiteType }) {
  const sources = [];

  if (impaired) {
    sources.push({ name: 'Impaired', formula: 'd4', impaired: true });
  } else {
    // Opponent inline weapons (opp-N) and character item weapons
    for (const id of weaponIds) {
      if (id.startsWith('opp-')) {
        const idx = parseInt(id.slice(4), 10);
        const w = (actor.system.weapons ?? [])[idx];
        if (!w) continue;
        const isImpaired = impairedWeaponIds.includes(id);
        sources.push({ name: w.name || '(unnamed)', formula: isImpaired ? 'd4' : (w.damage || 'd6'), impaired: isImpaired });
      } else {
        const w = actor.items.get(id);
        if (!w) continue;
        const isImpaired = impairedWeaponIds.includes(id);
        sources.push({ name: w.name, formula: isImpaired ? 'd4' : (w.system.damage || 'd6'), impaired: isImpaired });
      }
    }
  }

  if (bonusDice && Roll.validate(bonusDice)) {
    sources.push({ name: 'Bonus', formula: bonusDice, impaired: false });
  }

  // Smite adds a d12 only when type is 'damage'; 'blast' uses the same pool but notes the area effect.
  if (smite && smiteType === 'damage') {
    sources.push({ name: 'Smite', formula: 'd12', impaired: false });
  }

  // Fall back to unarmed if nothing was selected.
  if (sources.length === 0) {
    sources.push({ name: 'Unarmed', formula: 'd4', impaired: false });
  }

  return sources;
}
