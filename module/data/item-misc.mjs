import CainItemBase from "./base-item.mjs";

export default class RBMiscItem extends CainItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity  = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });
    schema.kitPoint  = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.scripValue = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.isAmmo    = new fields.BooleanField({ required: true, initial: false });

    return schema;
  }
}
