import CainDataModel from "./base-model.mjs";

export default class CainActorBase extends CainDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    // Vitals: Body, Psyche, Virtue, Grace. Combat damage always hits body after armor + guard absorption.
    // NOTE: 'psyche' conflicts with CAIN's existing flat NumberField, so Psyche is stored as 'spirit'.
    schema.body = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });
    schema.spirit = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });
    schema.virtue = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });
    schema.grace = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });

    // Resolve absorbs damage before it reaches body.
    schema.resolve = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    // Set when a save fails with applyBurnout option.
    schema.burnout = new fields.BooleanField({ required: true, initial: false });

    schema.biography = new fields.StringField({ required: true, initial: "<b>QUESTIONNAIRE</b><ul><li>How did you first manifest your powers?</li><li>Is your sin-seed in your brain or in your heart?</li><li>What do you hide in the deepest parts of you?</li><li>Is your hand your hand?</li><li>Do you remember the face of your mother?</li></ul>" });
    schema.notes = new fields.StringField({ required: true, initial: "" });

    return schema;
  }
}
