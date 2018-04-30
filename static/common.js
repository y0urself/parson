var ParsonAPP = ParsonAPP || {};
var CommonAPP = CommonAPP || {};
var socket = io();

CommonAPP.alert = function(a) {
    if (typeof a == 'string')
        a = {
            type: 'primary',
            message: a
        }
    var al=$('<div class="alertWrapper alert-top alert alert-'+a.type+'" role="alert">'+
        '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
        '<p>'+a.message+'</p>'+
    '</div>').appendTo('.alertContainer')
    if (a.timeout != undefined) {
        setTimeout(function() {
            $(al).fadeOut(function(){$(al).slideUp(function(){$(al).remove()})});
        }, a.timeout);
    }
}
CommonAPP.socketHandlers = {}
CommonAPP.socketHandlers.alert = function(a){
    CommonAPP.alert(a);
}
CommonAPP.socketHandlers.redirect = function(a) {
    window.location = a
}
CommonAPP.registerSocketHandlers = function() {
    CommonAPP.socket.on('redirect', CommonAPP.socketHandlers.redirect)
    CommonAPP.socket.on('alert', CommonAPP.socketHandlers.alert)

}
CommonAPP.init = function(socket) {
    CommonAPP.socket = socket;
}

CommonAPP.init(socket)
CommonAPP.registerSocketHandlers()