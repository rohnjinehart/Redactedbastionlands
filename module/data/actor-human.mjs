import CainActorBase from "./base-actor.mjs";

export default class CainHuman extends CainActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.role        = new fields.StringField({ required: true, initial: "" });
    schema.description = new fields.StringField({ required: true, initial: "" });

    schema.sinOverflow = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 20 }),
      max:   new fields.NumberField({ ...requiredInteger, initial: 10, min: 0, max: 20 }),
    });

    // World item IDs for dragged-in MB abilities
    schema.abilities = new fields.ArrayField(
      new fields.StringField({ required: true, initial: "" })
    );

    // Agenda section
    schema.agendaAppetites = new fields.ArrayField(
      new fields.SchemaField({
        title:       new fields.StringField({ required: true, initial: "" }),
        description: new fields.StringField({ required: true, initial: "" }),
      }),
      { required: true, initial: [] }
    );
    schema.agendaAversions = new fields.ArrayField(
      new fields.SchemaField({
        title:       new fields.StringField({ required: true, initial: "" }),
        description: new fields.StringField({ required: true, initial: "" }),
      }),
      { required: true, initial: [] }
    );
    schema.currentAgendaAbilities = new fields.ArrayField(
      new fields.StringField(), { required: true, initial: [] }
    );

    // Blasphemy section
    schema.animas = new fields.ArrayField(
      new fields.SchemaField({
        description: new fields.StringField({ required: true, initial: "" }),
      }),
      { required: true, initial: [] }
    );
    schema.currentBlasphemyPowers = new fields.ArrayField(
      new fields.StringField(), { required: true, initial: [] }
    );

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
