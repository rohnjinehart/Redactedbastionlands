import CainItemBase from "./base-item.mjs";

// Abilities, feats, and gambits from Mythic Bastionlands compendiums.
export default class RBAbility extends CainItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.description = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
