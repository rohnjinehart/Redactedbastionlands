import CainItemBase from "../base-item.mjs";

export default class CainAgendaTask extends CainItemBase {
    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = { required: true, nullable: false, integer: true };
        const schema = super.defineSchema();
    
        
        schema.task = new fields.StringField({ required: true, nullable: false, initial: "New Task" });
        schema.isBold = new fields.BooleanField({ required: true, nullable: false, initial: false});

    
        schema.formula = new fields.StringField({ blank: true });
        return schema;
    }

    get template() {
        return `systems/bastionlands/templates/item/agendas/item-agenda-sheet.hbs`;
    }
}
