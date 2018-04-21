const uuidv1 = require('uuid/v1');
function quiz(name, parts, js_pre, js_suf, id) {
    if(id==undefined)
        this.id=uuidv1().substring(0,8);
    else
        this.id=id
    this.name=name
    this.js_pre=js_pre
    this.js_suf=js_suf
    this.parts = parts
}

module.exports=quiz
