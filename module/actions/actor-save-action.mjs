/**
 * Roll a d20 save against one of the three virtues.
 * Success: roll total <= virtue value.
 *
 * @param {Actor}  actor
 * @param {Object} options
 * @param {string}  options.virtue       - 'body' | 'spirit' (Psyche) | 'virtue' | 'grace'
 * @param {boolean} [options.applyBurnout=false] - set burnout on the actor on failure
 */
export async function actorSaveAction(actor, { virtue, applyBurnout = false }) {
  const virtueData = actor.system[virtue];
  if (!virtueData) {
    ui.notifications.warn(`Unknown virtue: ${virtue}`);
    return;
  }

  const roll = await new Roll('1d20').roll();
  const success = roll.total <= virtueData.value;

  if (applyBurnout && !success) {
    await actor.update({ 'system.burnout': true });
  }

  const virtueDisplayNames = { body: 'Body', spirit: 'Psyche', virtue: 'Virtue', grace: 'Grace' };
  const virtueName = virtueDisplayNames[virtue] ?? (virtue.charAt(0).toUpperCase() + virtue.slice(1));
  const label      = success ? 'Success' : 'Failure';
  const color      = success ? '#4CAF50' : '#e94560';

  const content = `
    <div class="rb-roll save-roll" style="background:#1a1a1a;border:1px solid #333;padding:10px;border-radius:5px;color:#ddd;">
      <h3 style="margin:0 0 6px;color:#fff;">${virtueName} Save</h3>
      <p style="margin:3px 0;">
        Rolled <strong>${roll.total}</strong> vs ${virtueName} <strong>${virtueData.value}</strong>
      </p>
      <p style="margin:3px 0;font-size:1.2em;font-weight:bold;color:${color};">${label}</p>
      ${applyBurnout && !success ? '<p style="color:#f39c12;font-style:italic;">Burnout applied.</p>' : ''}
    </div>
  `;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: content,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
