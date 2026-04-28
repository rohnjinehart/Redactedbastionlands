// Import document classes.
import { CainActor } from './documents/actor.mjs';
import { CainItem } from './documents/item.mjs';
import { openTakeDamageDialog } from './actions/actor-take-damage-action.mjs';
// Import sheet classes.
import { CainActorSheet } from './sheets/actor-sheet.mjs';
import { CainItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { RB } from './helpers/config.mjs';

// Import DataModel classes
import * as models from './data/_module.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  game.bastionlands = {
    CainActor,
    CainItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.RB = RB;

  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = CainActor;

  CONFIG.Actor.dataModels = {
    character: models.CainCharacter,
    sin: models.CainNPC,
    mundane: models.CainMundane,
    npc: models.CainNPC,  // Backwards compatibility - deprecated, use 'sin' instead
    opponent: models.CainOpponent,
    human: models.CainHuman,
    mook: models.CainMook,
  }
  CONFIG.Item.documentClass = CainItem;
  CONFIG.Item.dataModels = {
    item: models.CainItem,
    agenda: models.CainAgenda,
    blasphemy: models.CainBlasphemy,
    blasphemyPower: models.CainBlasphemyPower,
    agendaTask: models.CainAgendaTask,
    agendaAbility: models.CainAgendaAbility,
    sinMark: models.CainSinMark,
    sinMarkAbility: models.CainSinMarkAbility,
    affliction: models.CainAffliction,
    domain: models.CainDomain,
    bond: models.CainBond,
    bondAbility: models.CainBondAbility,
    // Mythic Bastionlands item types
    weapon: models.RBWeapon,
    coat: models.RBArmor,
    plate: models.RBArmor,
    shield: models.RBArmor,
    helm: models.RBArmor,
    ability: models.RBAbility,
    misc: models.RBMiscItem,
  }

  console.log('[Redacted] Bastionlands | Initializing system');
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  const ActorsCollection = foundry?.documents?.collections?.Actors ?? Actors;
  const ItemsCollection = foundry?.documents?.collections?.Items ?? Items;
  const BaseActorSheet = foundry?.appv1?.sheets?.ActorSheet ?? ActorSheet;
  const BaseItemSheet = foundry?.appv1?.sheets?.ItemSheet ?? ItemSheet;

  ActorsCollection.unregisterSheet('core', BaseActorSheet);
  ActorsCollection.registerSheet('bastionlands', CainActorSheet, {
    makeDefault: true,
    label: 'CAIN.SheetLabels.Actor',
  });
  ItemsCollection.unregisterSheet('core', BaseItemSheet);
  ItemsCollection.registerSheet('bastionlands', CainItemSheet, {
    makeDefault: true,
    label: 'CAIN.SheetLabels.Item',
  });

  // Global talismans — still used by character/NPC actor sheets
  game.settings.register('bastionlands', 'globalTalismans', {
    name: 'Global Talismans',
    scope: 'world',
    config: false,
    type: Array,
    default: [
      {
        name: 'Tension',
        imagePath: 'systems/bastionlands/assets/Talismans/Talisman-A-0.png',
        currMarkAmount: 0,
        minMarkAmount: 0,
        maxMarkAmount: 3,
        isHidden: false,
      },
      {
        name: 'Pressure',
        imagePath: 'systems/bastionlands/assets/Talismans/Talisman-A-0.png',
        currMarkAmount: 0,
        minMarkAmount: 0,
        maxMarkAmount: 6,
        isHidden: false,
      },
      {
        name: 'Execution',
        imagePath: 'systems/bastionlands/assets/Talismans/Talisman-A-0.png',
        currMarkAmount: 0,
        minMarkAmount: 0,
        maxMarkAmount: 10,
        isHidden: false,
      },
    ],
  });

  game.settings.register('bastionlands', "GMTutorialFinished", {
    name: "GM Tutorial Finished",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register('bastionlands', 'hasAutoImportedCompendiums', {
    name: "Has Auto-Imported Compendiums",
    hint: "Tracks whether compendiums have been automatically imported to this world",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register('bastionlands', 'accessibilityModeChosen', {
    name: 'Accessibility Mode Chosen',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register('bastionlands', 'accessibilityMode', {
    name: 'Enable Accessibility Mode',
    hint: 'Toggle accessibility colors and changes for the player sheet.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      applyAccessibilityMode(value);
    }
  });

  game.settings.register('bastionlands', 'developerMode', {
    name: 'Developer Mode',
    hint: 'Enables developer debug information on item sheets.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  applyAccessibilityMode(game.settings.get('bastionlands', 'accessibilityMode'));

  // Use v13 namespaced getTemplate with fallback for v11/v12
  const getTemplateFn = foundry?.applications?.handlebars?.getTemplate ?? getTemplate;

  const blasphemyPowerTemplate = await getTemplateFn("systems/bastionlands/templates/item/parts/item-blasphemy-power-sheet.hbs");
  const blasphemyPowerPartialTemplate = await getTemplateFn("systems/bastionlands/templates/item/parts/item-blasphemy-power-partial.hbs");
  const sinMarkAbilityTemplate = await getTemplateFn("systems/bastionlands/templates/item/parts/item-sin-mark-partial.hbs");

  Handlebars.registerPartial("sinMarkAbility", sinMarkAbilityTemplate);
  Handlebars.registerPartial("blasphemyPower", blasphemyPowerTemplate);
  Handlebars.registerPartial("blasphemyPowerPartial", blasphemyPowerPartialTemplate);
  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Sin Overflow → Grace Reduction              */
/* -------------------------------------------- */

Hooks.on('preUpdateActor', (actor, updateData, options, userId) => {
  if (actor.type !== 'character' && actor.type !== 'human') return;

  let newSin = foundry.utils.getProperty(updateData, 'system.sinOverflow.value');
  if (newSin === undefined || newSin === null) return;

  const currentSin = actor.system.sinOverflow?.value ?? 0;
  const sinGain    = newSin - currentSin;

  // Demon trait: intercept sin gain and spend scrip first (1:1).
  if (sinGain > 0 && actor.type === 'character' && actor.system.demonTraitActive) {
    const hasDemon = (actor.system.currentAgendaAbilities ?? [])
      .some(id => game.items.get(id)?.name?.toLowerCase() === 'demon');

    if (hasDemon) {
      const currentScrip = actor.system.scrip ?? 0;
      const scripSpent   = Math.min(currentScrip, sinGain);
      const sinAfter     = sinGain - scripSpent;

      foundry.utils.setProperty(updateData, 'system.scrip', currentScrip - scripSpent);
      newSin = currentSin + sinAfter;
      foundry.utils.setProperty(updateData, 'system.sinOverflow.value', newSin);

      const parts = [];
      if (scripSpent > 0) parts.push(`spent <b>${scripSpent} scrip</b>`);
      if (sinAfter > 0)   parts.push(`gained <b>${sinAfter} sin</b> (scrip exhausted)`);
      if (parts.length)
        ChatMessage.create({
          content: `<div style="background:#1a0a1a;border:1px solid #660066;border-radius:4px;padding:8px 12px;">
            <strong style="color:#cc33ff;">⚑ Demon Trait</strong><br>
            <span style="color:#e0e0e0;"><b>${actor.name}</b> would gain ${sinGain} sin — ${parts.join(', ')}.</span>
          </div>`,
          speaker: ChatMessage.getSpeaker({ actor }),
        });
    }
  }

  const sinMax = actor.system.sinOverflow?.max ?? 10;

  // Trigger when crossing the cap for the first time, or when already capped and gaining more.
  // Do nothing if sin didn't reach the cap, or if already at cap with no additional gain.
  const isCrossing        = currentSin < sinMax && newSin >= sinMax;
  const isExcessWhileCapped = currentSin >= sinMax && newSin > sinMax;
  if (!isCrossing && !isExcessWhileCapped) return;

  const overflow = Math.max(0, newSin - sinMax);
  // Only create a new sin mark when crossing the threshold from below
  const isNewOverflow = isCrossing;

  // Cap sin at max
  foundry.utils.setProperty(updateData, 'system.sinOverflow.value', sinMax);

  // Grace reduction = overflow + sin mark count (including the new mark if one is being created)
  const currentMarkCount = actor.system.sinMarks?.length ?? 0;
  const sinMarkCount = isNewOverflow ? currentMarkCount + 1 : currentMarkCount;
  const graceReduction = overflow + sinMarkCount;

  const currentGrace = actor.system.grace?.value ?? 0;
  const graceAfter = Math.max(0, currentGrace - graceReduction);
  const graceLost = currentGrace - graceAfter;
  foundry.utils.setProperty(updateData, 'system.grace.value', graceAfter);

  // Pass data to the post-update hook via options
  options._sinOverflowData = { isNewOverflow, overflow, graceReduction, graceLost, graceAfter, sinMarkCount };
});

/* Sin overflow post-update: create sin mark if needed, then notify */
Hooks.on('updateActor', async (actor, updateData, options, userId) => {
  // Only the GM creates world items; only run once (on the initiating user)
  if (!game.user.isGM) return;
  if (userId !== game.user.id) return;
  const data = options._sinOverflowData;
  if (!data) return;

  const { isNewOverflow, overflow, graceReduction, graceLost, graceAfter, sinMarkCount } = data;

  let markLine = '';
  if (isNewOverflow) {
    // Collect names the actor already has (handles both UUIDs and world IDs)
    const existingNames = new Set(
      await Promise.all(
        (actor.system.sinMarks ?? []).map(ref =>
          ref?.startsWith('Compendium.') ? fromUuid(ref).then(i => i?.name) : Promise.resolve(game.items.get(ref)?.name)
        )
      ).then(names => names.filter(Boolean))
    );

    let chosenRef  = null;
    let chosenName = null;
    const pack = game.packs.get('bastionlands.sin-marks');
    if (pack) {
      const index     = await pack.getIndex();
      const available = index.filter(e => !existingNames.has(e.name));
      if (available.length > 0) {
        const entry = available[Math.floor(Math.random() * available.length)];
        chosenRef  = `Compendium.bastionlands.sin-marks.Item.${entry._id}`;
        chosenName = entry.name;
      }
    }

    if (chosenRef) {
      const sinMarks = foundry.utils.deepClone(actor.system.sinMarks ?? []);
      sinMarks.push(chosenRef);
      await actor.update({ 'system.sinMarks': sinMarks }, { _sinOverflowData: null });
      markLine = `<br><span style="color:#ffaaaa;">☠ Sin Mark added: <strong>${chosenName}</strong> (${sinMarkCount} total).</span>`;
    } else {
      markLine = `<br><span style="color:#ffaaaa;">☠ All available sin marks acquired, jesus christ man.</span>`;
    }
  }

  ChatMessage.create({
    content: `<div style="background:#1a0a0a;border:1px solid #e94560;border-radius:4px;padding:8px 12px;">
      <strong style="color:#e94560;">⚠ Sin Overflow</strong><br>
      <span style="color:#e0e0e0;"><b>${actor.name}</b>'s sin hit the cap with ${overflow} overflow — Grace reduced by <b>${graceReduction}</b> (${graceLost > 0 ? `→ ${graceAfter}` : 'already 0'}).${markLine}</span>
    </div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
  });
});

/* -------------------------------------------- */
/*  Attack Chat — Apply as Damage button        */
/* -------------------------------------------- */

Hooks.on('renderChatMessage', (message, html) => {
  html.on('click', '.rb-chat-take-damage', async (ev) => {
    const damage = parseInt(ev.currentTarget.dataset.damage) || 0;
    const actor  = game.user.targets.first()?.actor ?? game.user.character;
    if (!actor) {
      ui.notifications.warn('No actor found — target a token or assign a character to your user.');
      return;
    }
    openTakeDamageDialog(actor, damage);
  });
});

function applyAccessibilityMode(enabled) {
  if (enabled) {
    $('body').addClass('accessibility-mode');
  } else {
    $('body').removeClass('accessibility-mode');
  }
}

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('range', function(start, end, options) {
  let accum = '';
  for (let i = start; i < end; ++i) {
    accum += options.fn({ index: i });
  }
  return accum;
});

Handlebars.registerHelper('filter', function(items, type) {
  return items.filter(item => item.type === type);
});

Handlebars.registerHelper('hasItemsOfType', function(items, type, options) {
  const hasItems = items.some(item => item.type === type);
  return hasItems ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('calcPercentage', function(curr, max) {
  return (curr / max) * 100;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

Handlebars.registerHelper('times', function(n, block) {
  var accum = '';
  for(var i = 0; i < n; ++i) {
      block.data.index = i;
      block.data.first = i === 0;
      block.data.last = i === (n - 1);
      accum += block.fn(this);
  }
  return accum;
});

// Utility function to format CAT text - can be used outside of Handlebars
window.formatCatText = function(text, category) {
  const categoryTable = [
    { 'CAT': 0, 'people': 'one', 'size': 'human size', 'area': 'personal', 'range': 'touch', 'speed': 'average human', 'magnitude': 'small' },
    { 'CAT': 1, 'people': 'a few', 'size': 'heavy furniture', 'area': 'a few people', 'range': 'same room', 'speed': 'fast human', 'magnitude': 'noticable' },
    { 'CAT': 2, 'people': 'small group', 'size': 'large animal', 'area': 'entire room', 'range': 'across the street', 'speed': 'fast animal', 'magnitude': 'large' },
    { 'CAT': 3, 'people': 'large group', 'size': 'vehicle', 'area': 'a few rooms', 'range': 'down the block', 'speed': 'car', 'magnitude': 'very large' },
    { 'CAT': 4, 'people': 'a crowd', 'size': 'large vehicle', 'area': 'whole building', 'range': 'a few blocks away', 'speed': 'train', 'magnitude': 'massive' },
    { 'CAT': 5, 'people': 'a huge crowd', 'size': 'building', 'area': 'a city block', 'range': 'across town', 'speed': 'maglev', 'magnitude': 'destructive' },
    { 'CAT': 6, 'people': 'thousands of people', 'size': 'large building', 'area': 'a whole neighborhood', 'range': 'visual range', 'speed': 'airliner', 'magnitude': 'overwhelming' },
    { 'CAT': 7, 'people': 'many thousands of people', 'size': 'skyscraper', 'area': 'a whole town', 'range': 'over the horizon', 'speed': 'jet fighter', 'magnitude': 'cataclysmic' }
  ];

  let parse_cat_values = (inputString => {
    const regex = /\{<CAT([\/\*\+\-]\d+)?>\s+(\S+)\s+(\S+)\}/g;
    const matches = [...inputString.matchAll(regex)];
    return matches.map(match => ({
        string: Handlebars.escapeExpression(match[0]),
        operation: match[1] || '',
        type: match[2],
        modifier: match[3]
    }));
  });

  if (typeof text === 'string') {
      const CatFormattingData = parse_cat_values(text);
      let updatedText = Handlebars.escapeExpression(text);
      if (isNaN(category) || Number(category) < 0 || Number(category) > 7) {
        CatFormattingData.forEach(catData => {
          const operationText = catData.operation ? catData.operation : '';
          const replacementString = `<span><b> CAT${operationText}${(catData.modifier <=  0 ? '' : '+') + (catData.modifier == 0 ? '' : catData.modifier)}</b></span>`;
          updatedText = updatedText.replace(catData.string, replacementString)
        })
      } else {
        CatFormattingData.forEach(catData => {
          let operatedCat = Number(category);
          let calculationSteps = [];
          calculationSteps.push(`Base CAT: ${category}`);

          if (catData.operation) {
            const operator = catData.operation.charAt(0);
            const operand = Number(catData.operation.slice(1));
            switch(operator) {
              case '/':
                const beforeCeil = operatedCat / operand;
                operatedCat = Math.ceil(beforeCeil);
                calculationSteps.push(`${category} / ${operand} = ${beforeCeil.toFixed(2)} → ${operatedCat} (rounded up)`);
                break;
              case '*':
                operatedCat = operatedCat * operand;
                calculationSteps.push(`${category} * ${operand} = ${operatedCat}`);
                break;
              case '+':
                operatedCat = operatedCat + operand;
                calculationSteps.push(`${category} + ${operand} = ${operatedCat}`);
                break;
              case '-':
                operatedCat = operatedCat - operand;
                calculationSteps.push(`${category} - ${operand} = ${operatedCat}`);
                break;
            }
          }

          const beforeModifier = operatedCat;
          const finalCat = operatedCat + Number(catData.modifier);
          if (Number(catData.modifier) !== 0) {
            calculationSteps.push(`${beforeModifier} ${catData.modifier > 0 ? '+' : ''} ${catData.modifier} = ${finalCat}`);
          }

          const catIndex = Math.max(Math.min(finalCat, 7), 0);
          if (finalCat < 0 || finalCat > 7) {
            calculationSteps.push(`Clamped to CAT ${catIndex} (min 0, max 7)`);
          }

          calculationSteps.push(`Result: ${categoryTable[catIndex][catData.type]}`);
          const tooltipText = calculationSteps.join(' | ');
          const replacementString = `<span data-tooltip="${tooltipText}" style="cursor: help; border-bottom: 1px dotted #ff00cc;"><img style="vertical-align: middle; max-height: 2em; display: inline-block; border: none;" src="systems/bastionlands/assets/CAT/CAT${category}.png"/> <b>${categoryTable[catIndex][catData.type]}</b> <img style="vertical-align: middle; max-height: 2em; display: inline-block; border: none;" src="systems/bastionlands/assets/CAT/CAT${category}.png"/> </span>`;
          updatedText = updatedText.replace(catData.string, replacementString)
        })
      }

      updatedText = updatedText.split(Handlebars.escapeExpression("<b>")).join("<b>");
      updatedText = updatedText.split(Handlebars.escapeExpression("</b>")).join("</b>");
      updatedText = updatedText.split(Handlebars.escapeExpression("<i>")).join("<i>");
      updatedText = updatedText.split(Handlebars.escapeExpression("</i>")).join("</i>");

      return updatedText.replace(/\n/g, '<br>');
  } else {
      return text;
  }
};

Handlebars.registerHelper('formatted', function(text, category) {
  return new Handlebars.SafeString(window.formatCatText(text, category));
});

Handlebars.registerHelper('mod', function(value, modval, options){
  if(value===undefined || modval===undefined || parseInt(value) === NaN || !parseInt(modval) === NaN){
    throw new Error(`Mod helper did not receive a number: val=${value}, modval=${modval}`);
  }
  return parseInt(value) % parseInt(modval)
});

Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

Handlebars.registerHelper('CainOffset', function(value, offset, options) {
  if(value===undefined || offset===undefined || parseInt(value)===NaN || !parseInt(offset) === NaN){
    throw new Error(`offset helper did not receive a number: val=${value}, offset=${offset}`);
  }
  return parseInt(value) + parseInt(offset);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Register hotbar drop hook
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // FIX: Prevent #interface from scrolling (causes UI shift on chat messages)
  const interfaceEl = document.getElementById('interface');
  if (interfaceEl) {
    interfaceEl.style.overflow = 'hidden';

    const scrollObserver = new MutationObserver(() => {
      if (interfaceEl.scrollTop !== 0) {
        interfaceEl.scrollTop = 0;
      }
    });

    interfaceEl.addEventListener('scroll', () => {
      if (interfaceEl.scrollTop !== 0) {
        interfaceEl.scrollTop = 0;
      }
    }, { passive: false });

    scrollObserver.observe(interfaceEl, {
      attributes: true,
      childList: true,
      subtree: true
    });
  }

  // Automatic compendium import on world creation
  await checkAndImportCompendiums();

  const [brokenBlasphemies, brokenSinMarks, brokenAgendas] = testForProperLinkage();
  if (brokenBlasphemies || brokenSinMarks || brokenAgendas) {
    const dialogContent = `
      <div style="text-align: center;">
        <h2>Error in Item Linkage</h2>
        <p> Checked for issues with linking abilities and found issues in <b>${brokenBlasphemies ? "blasphemies " : ""}${brokenAgendas ? "agendas " : ""}${brokenSinMarks ? "sin marks" : ""}</b>.  These issues may cause the system to not function properly.  To fix, re-import any broken packs by deleting them from the items tab, then importing the packs. <br> <h3>Be sure to check the box that says keep item IDs</h3><br>If it still doesn't work, please reach out on discord or github.</p>
      </div>
    `;

    let dialog = new Dialog({
      title: 'Error in Item Linkage',
      content: dialogContent,
      buttons: {ok: {label: "Understood"}},
      close: () => {},
    });
    dialog.render(true);
  }
});

/* -------------------------------------------- */
/*  Compendium Auto-Import                      */
/* -------------------------------------------- */

async function checkAndImportCompendiums() {
  const hasAutoImported = game.settings.get('bastionlands', 'hasAutoImportedCompendiums');

  if (hasAutoImported) {
    console.log('CAIN | Compendiums already auto-imported');
    return;
  }

  const hasExistingItems = game.items.size > 0;

  if (hasExistingItems) {
    await game.settings.set('bastionlands', 'hasAutoImportedCompendiums', true);
    console.log('CAIN | Items already exist, skipping auto-import');
    return;
  }

  if (!game.user.isGM) {
    console.log('CAIN | Only GMs can auto-import compendiums');
    return;
  }

  console.log('CAIN | Starting automatic compendium import...');

  await ChatMessage.create({
    speaker: { alias: "CAIN System" },
    content: `<div style="background: #2a2a2a; border: 2px solid #ff6666; padding: 15px; border-radius: 8px; color: #fff;">
      <h2 style="margin: 0 0 10px 0; color: #ff8888;">Automatic Compendium Import</h2>
      <p style="margin: 5px 0; color: #e0e0e0;">Starting automatic import of all game content...</p>
      <p style="margin: 5px 0; font-size: 0.9em; color: #bbb;">This may take a moment. Please wait...</p>
    </div>`
  });

  const compendiumsToImport = [
    { key: 'bastionlands.items', label: 'Kit and Items' },
    { key: 'bastionlands.blasphemies', label: 'Blasphemies' },
    { key: 'bastionlands.agendas', label: 'Agendas' },
    { key: 'bastionlands.sin-marks', label: 'Sin Marks' },
    { key: 'bastionlands.afflictions', label: 'Afflictions' },
    { key: 'bastionlands.tables', label: 'Roll Tables' },
    { key: 'bastionlands.domains', label: 'Domains' },
    { key: 'bastionlands.virtues', label: 'Virtues (Bonds)' }
  ];

  let totalImported = 0;
  const importResults = [];

  try {
    for (const compendiumInfo of compendiumsToImport) {
      const pack = game.packs.get(compendiumInfo.key);

      if (!pack) {
        console.warn(`CAIN | Compendium ${compendiumInfo.key} not found`);
        importResults.push(`<li style="color: #ff9900;">${compendiumInfo.label}: <b>Not Found</b></li>`);
        continue;
      }

      console.log(`CAIN | Importing ${compendiumInfo.label}...`);
      const documents = await pack.importAll({ keepId: true });
      const importCount = documents.length;
      totalImported += importCount;
      importResults.push(`<li style="color: #44ff44;">${compendiumInfo.label}: <b>${importCount} items</b></li>`);
      console.log(`CAIN | Imported ${importCount} items from ${compendiumInfo.label}`);
    }

    await game.settings.set('bastionlands', 'hasAutoImportedCompendiums', true);

    await ChatMessage.create({
      speaker: { alias: "CAIN System" },
      content: `<div style="background: #2a2a2a; border: 2px solid #66ff66; padding: 15px; border-radius: 8px; color: #fff;">
        <h2 style="margin: 0 0 10px 0; color: #88ff88;">Import Complete!</h2>
        <p style="margin: 5px 0; color: #e0e0e0;">Successfully imported all game content:</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #e0e0e0;">${importResults.join('')}</ul>
        <p style="margin: 10px 0 5px 0; font-weight: bold; color: #e0e0e0;">Total: ${totalImported} items imported</p>
        <p style="margin: 5px 0; font-size: 0.9em; color: #bbb;">All items are now ready to use in your world!</p>
      </div>`
    });

    ui.notifications.info(`CAIN | Successfully imported ${totalImported} items from compendiums`);

  } catch (error) {
    console.error('CAIN | Error during automatic import:', error);

    await ChatMessage.create({
      speaker: { alias: "CAIN System" },
      content: `<div style="background: #2a2a2a; border: 2px solid #ff6666; padding: 15px; border-radius: 8px; color: #fff;">
        <h2 style="margin: 0 0 10px 0; color: #ff8888;">Import Error</h2>
        <p style="margin: 5px 0; color: #e0e0e0;">An error occurred during automatic import.</p>
        <p style="margin: 5px 0; font-size: 0.9em; color: #bbb;">Please try importing manually from the compendiums.</p>
      </div>`
    });

    ui.notifications.error('CAIN | Error during automatic compendium import. Check console for details.');
  }
}

/* -------------------------------------------- */
/*  Item Linkage Validation                     */
/* -------------------------------------------- */

function testForProperLinkage() {
  const brokenBlasphemies = (game.items
    .filter(item => item.type === "blasphemy")
    .map(blasphemy => blasphemy.system.powers)
    .flat()
    .filter(powerID => !game.items.get(powerID))
    .length > 0);
  const brokenSinMarks = (game.items
    .filter(item => item.type === "sinMark")
    .map(sinMark => sinMark.system.abilities)
    .flat()
    .filter(powerID => !game.items.get(powerID))
    .length > 0);
  const brokenAgendas = (game.items
    .filter(item => item.type === "agenda")
    .map(agenda => agenda.system.abilities)
    .flat()
    .filter(powerID => !game.items.get(powerID))
    .length > 0);

  console.log("Blasphemies: " + brokenBlasphemies);
  console.log("SinMarks: " + brokenSinMarks);
  console.log("Agendas: " + brokenAgendas);

  if (brokenBlasphemies) {
    const badBlasphemies = game.items
      .filter(item => item.type === "blasphemy")
      .filter(blasphemy => testItemsFromIDs(blasphemy.system.powers))
      .map(blasphemy => blasphemy.name);
    console.warn("Errors with linkage in blasphemies: " + badBlasphemies);
  }
  if (brokenAgendas) {
    const badAgendas = game.items
      .filter(item => item.type === "agenda")
      .filter(agenda => testItemsFromIDs(agenda.system.abilities))
      .map(agenda => agenda.name);
    console.warn("Errors with linkage in agendas: " + badAgendas);
  }
  if (brokenSinMarks) {
    const badSinMarks = game.items
      .filter(item => item.type === "sinMark")
      .filter(mark => testItemsFromIDs(mark.system.abilities))
      .map(mark => mark.name);
    console.warn("Errors with linkage in marks: " + badSinMarks);
  }
  return [brokenBlasphemies, brokenSinMarks, brokenAgendas];
}

function testItemsFromIDs(ids) {
  return (ids.filter(id => !game.items.get(id)).length > 0);
}

/* -------------------------------------------- */
/*  Macro Helpers                               */
/* -------------------------------------------- */

async function createItemMacro(data, slot) {
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn('You can only create macro buttons for owned Items');
  }
  const item = await Item.fromDropData(data);
  const command = `game.bastionlands.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'bastionlands.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

function rollItemMacro(itemUuid) {
  const dropData = { type: 'Item', uuid: itemUuid };
  Item.fromDropData(dropData).then((item) => {
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }
    item.roll();
  });
}
