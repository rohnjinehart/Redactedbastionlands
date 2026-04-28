import CainItemBase from "../base-item.mjs";

export default class CainDomain extends CainItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.sinSource = new fields.StringField({ required: true, nullable: false, initial: "ogre" })
    schema.domainName = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.domainDescription = new fields.StringField({required: true, nullable: false, initial: ""});
    schema.savageAttackDescription = new fields.StringField({required: true, nullable: false, initial: ""});
    schema.selectsExorcist = new fields.BooleanField({required: true, nullable: false, initial: false});
    schema.afflictionEffect = new fields.StringField({required: false, nullable: true, initial: ''});
    return schema;
  }

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    // ogre by default
    this.parent.updateSource({
      img: "systems/bastionlands/assets/Sins/ogre.png"
    })
  }
}