import CainActorBase from "./base-actor.mjs";

export default class CainOpponent extends CainActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Basic Identity
    schema.opponentType = new fields.StringField({
      required: true,
      initial: "ogre",
      choices: ["ogre", "idol", "hound", "centipede", "toad", "lord", "imago", "other", "mother"]
    });
    schema.subType = new fields.StringField({ required: true, initial: "" }); // e.g., "Security", "Pest", "Binder"

    // Core Stats
    schema.category = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 7 });

    // Execution Talisman (flexible for solo/group/horde)
    schema.executionTalisman = new fields.SchemaField({
      solo: new fields.NumberField({ ...requiredInteger, initial: 2, min: 0, max: 20 }),
      group: new fields.NumberField({ ...requiredInteger, initial: 4, min: 0, max: 20 }),
      horde: new fields.NumberField({ ...requiredInteger, initial: 6, min: 0, max: 20 }),
      current: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      useVariant: new fields.StringField({ required: true, initial: "solo", choices: ["solo", "group", "horde"] })
    });

    // Tags/Keywords - e.g., "Intangible", "Armored", "Freakishly Strong"
    schema.tags = new fields.ArrayField(
      new fields.StringField({ required: true, initial: "" })
    );

    // Range - melee, short, long, extreme
    schema.range = new fields.StringField({
      required: true,
      initial: "severed",
      choices: ["severed", "fused", "bound"]
    });

    // Stress Output - structured for automatic rolling
    schema.stressFormula = new fields.SchemaField({
      roll1: new fields.StringField({ required: true, initial: "4" }),      // Stress on roll of 1
      roll2to3: new fields.StringField({ required: true, initial: "3" }),   // Stress on roll of 2-3
      roll4plus: new fields.StringField({ required: true, initial: "2" }),  // Stress on roll of 4+
      formula: new fields.StringField({ required: true, initial: "1d6" }),  // Dice formula (1d6, 2d3+1, etc.)
      bonusEffect: new fields.StringField({ required: true, initial: "" })  // "+1 sin", "worm hook", etc.
    });

    // Description - brief summary of the opponent
    schema.description = new fields.StringField({ required: true, initial: "" });

    // Tendencies - "It tends to do this thing"
    schema.tendencies = new fields.StringField({ required: true, initial: "" });

    // Conditional Effects - "If you do this thing, someone gets an advantage/disadvantage"
    schema.conditionalEffects = new fields.StringField({ required: true, initial: "" });

    // Reactions - how they attack/respond
    schema.reactions = new fields.SchemaField({
      attackWith: new fields.StringField({ required: true, initial: "" }), // "With what"
      stressAmount: new fields.StringField({ required: true, initial: "" }), // "and how much"
      complication: new fields.StringField({ required: true, initial: "" }), // "Create a complication"
      threat: new fields.StringField({ required: true, initial: "" }), // "Create a threat"
      dieRoll: new fields.StringField({ required: true, initial: "" }) // "sometimes with a die roll attached"
    });

    // Special Abilities Array (for Drifters/Anomalies)
    schema.specialAbilities = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, initial: "" }),
        description: new fields.StringField({ required: true, initial: "" }),
        trigger: new fields.StringField({ required: true, initial: "" }) // e.g., "Threat (1-2)", "Always", "Complication"
      })
    );

    // Afflictions they can inflict - array of item IDs for drag-drop support
    schema.afflictions = new fields.ArrayField(
      new fields.StringField({ required: true, initial: "" })
    );

    // Capabilities (bullet points like "General human capabilities")
    schema.capabilities = new fields.ArrayField(
      new fields.StringField({ required: true, initial: "" })
    );

    // Descriptive Fields
    schema.behavior = new fields.StringField({ required: true, initial: "" });
    schema.appearance = new fields.StringField({ required: true, initial: "" });

    // Scaling & Advanced
    schema.scalesWithPressure = new fields.BooleanField({ required: true, initial: false });
    schema.pressureModifier = new fields.StringField({ required: true, initial: "" }); // e.g., "execution +CAT at 3+ pressure"

    // Source book reference
    schema.source = new fields.StringField({ required: true, initial: "" }); // e.g., "Core p.XX", "Games for Freaks p.XX"

    // Flat armor value (opponents don't use equipped items)
    schema.armor = new fields.NumberField({ required: true, initial: 0, min: 0 });

    // Weapons list
    schema.weapons = new fields.ArrayField(
      new fields.SchemaField({
        name:   new fields.StringField({ required: true, initial: "" }),
        damage: new fields.StringField({ required: true, initial: "d6" }),
      }),
      { required: true, initial: [{ name: "", damage: "d6" }] }
    );

    schema.domains = new fields.ArrayField(
      new fields.StringField({ required: true, initial: "" })
    );

    schema.traumas = new fields.ArrayField(new fields.SchemaField({
      question: new fields.StringField({ required: true, initial: "" }),
      answered: new fields.BooleanField({ required: true, initial: false })
    }), { required: true, initial: [
      { question: "", answered: false },
      { question: "", answered: false },
      { question: "", answered: false }
    ]});

    return schema;
  }

  prepareDerivedData() {
    // Calculate current execution talisman max based on variant
    const variant = this.executionTalisman.useVariant;
    this.executionTalisman.max = this.executionTalisman[variant] || this.executionTalisman.solo;
  }
}
