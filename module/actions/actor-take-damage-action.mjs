/**
 * Open the Take Damage dialog for a given actor, optionally pre-filling
 * the damage input (e.g. from an attack roll chat button).
 *
 * @param {Actor}  actor
 * @param {number} [prefilledDamage=0]
 */
export async function openTakeDamageDialog(actor, prefilledDamage = 0) {
  const armor = actor.items
    .filter(i => (
      (i.type === 'coat' || i.type === 'weapon') &&
      i.system.equipped &&
      (i.system.armor ?? 0) > 0
    ))
    .reduce((sum, i) => sum + (i.system.armor ?? 0), 0)
    + (actor.system.armor ?? 0);

  let result;
  try {
    result = await Dialog.prompt({
      title: `Take Damage — ${actor.name}`,
      content: `
        <label>Incoming damage:
          <input type="number" id="dmg-input" value="${prefilledDamage}" min="0"
                 style="width:60px;margin-left:6px;"/>
        </label>
        <p style="color:#aaa;font-size:0.85em;">Armor total (from equipped items): ${armor}</p>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
          <span>Additional resistance:</span>
          <input type="number" id="bonus-armor-input" value="0" min="0"
                 style="width:60px;"/>
        </div>
        <p style="color:#aaa;font-size:0.85em;margin-top:2px;">Situational bonus — applies to this hit only.</p>
        <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;">
          <input type="checkbox" id="sin-shield-check"/>
          <span style="font-size:0.9em;">Sin Shield — roll d4 SIN, reducing damage taken by the amount of sin gained</span>
        </label>
      `,
      label: 'Apply',
      callback: html => ({
        damage:      parseInt(html.find('#dmg-input').val()) || 0,
        bonusArmor:  parseInt(html.find('#bonus-armor-input').val()) || 0,
        sinShield:   html.find('#sin-shield-check').is(':checked'),
      }),
    });
  } catch {
    return; // dialog was closed/cancelled
  }

  let { damage, bonusArmor, sinShield } = result;
  let effectiveArmor = armor + bonusArmor;

  if (sinShield) {
    const sinRoll = await new Roll('1d4').roll();
    const sinVal  = actor.system.sinOverflow?.value ?? 0;
    await actor.update({ 'system.sinOverflow.value': sinVal + sinRoll.total });
    effectiveArmor += sinRoll.total;
    sinRoll.toMessage({
      flavor:  `${actor.name} — Sin Shield: +${sinRoll.total} SIN, damage reduced by ${sinRoll.total}`,
      speaker: ChatMessage.getSpeaker({ actor }),
    });
  }

  return actorTakeDamageAction(actor, { damage, armor: effectiveArmor });
}

/* -------------------------------------------------------------------------- */

/**
 * Apply incoming damage to an actor.
 * Flow: damage - armor → resolve → body
 *
 * Outcomes:
 *   Evaded     — resolve absorbs all (leftover > 0)
 *   Scar       — resolve exactly depleted (leftover = 0) → prompts scar roll
 *   Wounded    — excess bleeds into body (leftover < 0)
 *   Mortal Wound — new body <= old body / 2
 *   Slain      — body reaches 0
 *
 * If 'exposed' is true the actor has no resolve; damage goes straight to body.
 *
 * @param {Actor}  actor
 * @param {Object} options
 * @param {number}  options.damage   - raw incoming damage value
 * @param {number}  [options.armor=0] - flat armor reduction (from equipped items)
 * @param {boolean} [options.exposed=false] - skip resolve entirely
 */
export async function actorTakeDamageAction(actor, { damage, armor = 0, exposed = false }) {
  const resolve     = actor.system.resolve.value;
  const bodyData    = actor.system.body;
  const bodyValue   = bodyData.value;

  const finalDamage  = Math.max(damage - armor, 0);
  const leftover     = exposed ? -finalDamage : resolve - finalDamage;

  const isEvaded      = leftover > 0;
  const isScar        = leftover === 0;
  const isWounded     = leftover < 0;
  const newBody       = isWounded ? Math.max(bodyValue + leftover, 0) : bodyValue;
  const newResolve    = exposed ? resolve : (isWounded ? 0 : resolve - finalDamage);
  const isMortalWound = isWounded && newBody <= Math.floor(bodyValue / 2);
  const isSlain       = newBody === 0;

  // Apply the update.
  await actor.update({
    'system.resolve.value': newResolve,
    'system.body.value':    newBody,
  });

  const title        = getTitle({ isEvaded, isScar, isWounded, isMortalWound, isSlain });
  const color        = isSlain ? '#ff0000' : isMortalWound ? '#ff6600' : isWounded ? '#e94560' : isEvaded ? '#4CAF50' : '#f39c12';
  const descriptions = getDescriptions({ exposed, armor, resolve, newResolve, bodyValue, newBody });

  const content = `
    <div class="rb-roll take-damage" style="background:#1a1a1a;border:1px solid #333;padding:10px;border-radius:5px;color:#ddd;">
      <h3 style="margin:0 0 6px;color:#fff;">Take Damage</h3>
      <p style="margin:3px 0;">Damage <strong>${damage}</strong> − Armor <strong>${armor}</strong> = <strong>${finalDamage}</strong></p>
      ${descriptions.map(d => `<p style="margin:3px 0;color:#aaa;">${d}</p>`).join('')}
      <p style="margin:6px 0;font-size:1.2em;font-weight:bold;color:${color};">${title}</p>
      ${isScar ? `<button class="rb-roll-scar" style="margin-top:6px;background:#6a0a0a;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">Roll Scar</button>` : ''}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}

function getTitle({ isEvaded, isScar, isWounded, isMortalWound, isSlain }) {
  if (isSlain)       return 'Slain';
  if (isMortalWound) return 'Mortal Wound';
  if (isWounded)     return 'Wounded';
  if (isScar)        return 'Scar';
  if (isEvaded)      return 'Evaded';
  return 'Hit';
}

function getDescriptions({ exposed, armor, resolve, newResolve, bodyValue, newBody }) {
  const lines = [];
  if (exposed) lines.push('Exposed — resolve bypassed.');
  if (resolve !== newResolve) lines.push(`Resolve: ${resolve} → ${newResolve}`);
  if (bodyValue !== newBody) lines.push(`Body: ${bodyValue} → ${newBody}`);
  return lines;
}
