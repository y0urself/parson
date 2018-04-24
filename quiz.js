const uuidv1 = require('uuid/v1');
function quiz(name, description, parts, js_input, js_pre, js_suf, password, id) {
    if(id==undefined)
        this.id=uuidv1().substring(0,8);
    else
        this.id=id
        
    this.password=password
    this.name=name
    this.description=description
    this.js_input=js_input
    this.js_pre=js_pre
    this.js_suf=js_suf
    this.parts = parts
}

module.exports=quiz
