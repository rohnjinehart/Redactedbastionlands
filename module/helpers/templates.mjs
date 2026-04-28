/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  // Use v13 namespaced loadTemplates with fallback for v11/v12
  const loadTemplatesFn = foundry?.applications?.handlebars?.loadTemplates ?? loadTemplates;

  return loadTemplatesFn([
    // Talismans
    'systems/bastionlands/templates/talisman-window.hbs',
    // Player Overview
    'systems/bastionlands/templates/player-overview.hbs',
    'systems/bastionlands/templates/player-overview/overview.hbs',
    'systems/bastionlands/templates/player-overview/skills.hbs',
    'systems/bastionlands/templates/player-overview/xp.hbs',
    'systems/bastionlands/templates/player-overview/talismans.hbs',
    // Actor partials.
    'systems/bastionlands/templates/actor/parts/actor-features.hbs',
    'systems/bastionlands/templates/actor/parts/actor-items.hbs',
    'systems/bastionlands/templates/actor/parts/actor-abilities.hbs',
    'systems/bastionlands/templates/actor/parts/actor-sin.hbs',
    'systems/bastionlands/templates/actor/parts/actor-talismans.hbs',
    // npc partials
    'systems/bastionlands/templates/actor/npc-parts/actor-description.hbs',
    'systems/bastionlands/templates/actor/npc-parts/actor-palace-pressure.hbs',
    'systems/bastionlands/templates/actor/npc-parts/actor-attacks.hbs',
    'systems/bastionlands/templates/actor/npc-parts/actor-domains.hbs',
    // Item partials
    'systems/bastionlands/templates/item/parts/item-effects.hbs',
    // Sin mark partials
    'systems/bastionlands/templates/item/item-sinMark-sheet.hbs',
    'systems/bastionlands/templates/item/item-sinMarkAbility-sheet.hbs',
    // Dice roller
    'systems/bastionlands/templates/dice/chat-dice-panel.hbs',
    'systems/bastionlands/templates/dice/dice-panel-app.hbs',
  ]);
};
