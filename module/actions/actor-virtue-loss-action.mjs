/**
 * Roll a formula and subtract the result from a virtue (body / sin / psyche).
 * Triggers exhausted / exposed / impaired condition when the virtue hits 0.
 *
 * @param {Actor}  actor
 * @param {Object} options
 * @param {string}  options.vital          - 'body' | 'spirit' (Psyche) | 'virtue' | 'grace'
 * @param {string}  options.amountFormula - dice formula, e.g. 'd6'
 */
export async function actorVirtueLossAction(actor, { virtue, amountFormula }) {
  const virtueData = actor.system[virtue];
  if (!virtueData) {
    ui.notifications.warn(`Unknown virtue: ${virtue}`);
    return;
  }

  const roll     = await new Roll(amountFormula).roll();
  const amount   = roll.total;
  const oldValue = virtueData.value;
  const newValue = Math.max(oldValue - amount, 0);

  const isExhausted = newValue === 0 && virtue === 'body';
  const isExposed   = newValue === 0 && virtue === 'spirit';
  const isImpaired  = newValue === 0 && virtue === 'virtue';

  await actor.update({ [`system.${virtue}.value`]: newValue });

  const virtueName = virtue.charAt(0).toUpperCase() + virtue.slice(1);
  const condition  = isExhausted ? 'Exhausted' : isExposed ? 'Exposed' : isImpaired ? 'Impaired' : null;

  const content = `
    <div class="rb-roll virtue-loss" style="background:#1a1a1a;border:1px solid #333;padding:10px;border-radius:5px;color:#ddd;">
      <h3 style="margin:0 0 6px;color:#fff;">${virtueName} Loss</h3>
      <p style="margin:3px 0;">
        Rolled <strong>${roll.total}</strong> (${amountFormula}) —
        ${virtueName}: ${oldValue} → <strong>${newValue}</strong>
      </p>
      ${condition ? `<p style="margin:6px 0;font-size:1.1em;font-weight:bold;color:#e94560;">${condition}!</p>` : ''}
    </div>
  `;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: content,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
