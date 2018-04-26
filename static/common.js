var ParsonAPP = ParsonAPP || {};
var CommonAPP = CommonAPP || {};
var socket = io();


CommonAPP.socketHandlers={}
CommonAPP.socketHandlers.alert=function(a) {
    if (typeof a == 'string')
        a = {
            type: 'primary',
            message: a
        }
    $(".alertWrapper").removeClass(function(index, className) {
        return (className.match(/(^|\s)alert-\S+/g) || []).join(' ');
    });
    $('.alertWrapper').addClass('alert-top alert-' + a.type)
    $(".alertWrapper > p").text(a.message);
    $(".alertWrapper").show();
    if (a.timeout != undefined) {
        setTimeout(function() {
            $(".alertWrapper").hide();
        }, a.timeout);
    }
}
CommonAPP.socketHandlers.redirect=function(a) {
    window.location = a
}
CommonAPP.registerSocketHandlers=function() {
    CommonAPP.socket.on('redirect',CommonAPP.socketHandlers.redirect)
    CommonAPP.socket.on('alert',CommonAPP.socketHandlers.alert)

}
CommonAPP.init=function(socket){
    CommonAPP.socket=socket;
}

CommonAPP.init(socket)
CommonAPP.registerSocketHandlers()


