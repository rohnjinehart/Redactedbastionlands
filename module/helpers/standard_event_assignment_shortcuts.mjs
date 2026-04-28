
/**
 * Convert plain textarea text to HTML, respecting paragraph and line breaks.
 * Double newlines become paragraph tags; single newlines become <br>.
 */
export function nl2p(text, pStyle = 'margin:4px 0;line-height:1.5;') {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map(para => `<p style="${pStyle}">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export class HTMLShortcut{
    constructor(setObj){
        this.htmlObj = setObj
    }

    setLeftClick(selector, func){
        this.htmlObj.find(selector).click(func);
    }
    
    setChange(selector, func){
        this.htmlObj.find(selector).change(func);
    }
    
    setRightClick(selector, func){
        this.htmlObj.find(selector).on('contextmenu', func);
    }
    
    setLeftAndRightClick(selector, funcLeft, funcRight){
        let obj = this.htmlObj.find(selector);
        obj.click(funcLeft);
        obj.on('contextmenu', funcRight);
    }
}
