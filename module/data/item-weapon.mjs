import CainItemBase from "./base-item.mjs";

export default class RBWeapon extends CainItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.description = new fields.StringField({ required: true, blank: true });
    schema.damage = new fields.StringField({ required: true, initial: 'd6' });

    // Weapon properties from Mythic Bastionlands.
    schema.hefty = new fields.BooleanField({ required: true, initial: false });
    schema.long  = new fields.BooleanField({ required: true, initial: false });
    schema.slow  = new fields.BooleanField({ required: true, initial: false });

    schema.armor    = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 });
    schema.equipped = new fields.BooleanField({ required: true, initial: false });

    schema.blast    = new fields.BooleanField({ required: true, initial: false });
    schema.range    = new fields.BooleanField({ required: true, initial: false });
    schema.rangeType = new fields.StringField({
      required: true, initial: "engaged",
      choices: ["engaged", "near", "far"]
    });
    schema.magazine = new fields.BooleanField({ required: true, initial: false });
    schema.magazineSize    = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 6, min: 1 });
    schema.magazineCurrent = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 6, min: 0 });
    schema.ammoItemId = new fields.StringField({ required: true, initial: "" });

    return schema;
  }
}
