import CainActorBase from "./base-actor.mjs";

export default class CainMook extends CainActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Flat armor value
    schema.armor = new fields.NumberField({ required: true, initial: 0, min: 0 });

    // Inline weapons (same pattern as opponent)
    schema.weapons = new fields.ArrayField(
      new fields.SchemaField({
        name:   new fields.StringField({ required: true, initial: "" }),
        damage: new fields.StringField({ required: true, initial: "d6" }),
      }),
      { required: true, initial: [{ name: "", damage: "d6" }] }
    );

    return schema;
  }
}
