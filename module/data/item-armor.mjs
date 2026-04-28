import CainItemBase from "./base-item.mjs";

// Shared model for all armor item types: coat, plate, shield, helm.
// Each sub-type carries an armor value that reduces incoming damage.
export default class RBArmor extends CainItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.description = new fields.StringField({ required: true, blank: true });
    schema.armor   = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });
    schema.equipped = new fields.BooleanField({ required: true, initial: false });

    return schema;
  }
}
