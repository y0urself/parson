var grid = 40;
var url = window.location.pathname.split('/');
var quizID = url[url.length - 1];
window.serialized = '';
$(document).ready(function() {
    $(document).bind('touchmove', function(e) {
        e.preventDefault();
    }, false);
});
var socket = io();
socket.on('connect', function(a) {
    socket.emit('request', url[url.length - 2])
});
socket.on('state', function(a) {
    $('.jumbotron > h1').text(a.name)
    window.parts = a.parts
    render();
});

socket.on('connect', function(a) {
    console.log(a)
});
socket.on('serialized', function(a) {
    console.log(a)
    $('#serialized').text(a)
    window.serialized = a
    render();
});