$(document).ready(function() {
    var puzzles=JSON.parse(localStorage.getItem("puzzles")) || []
    $.each(puzzles, function(k,v) {
        var pi=$('.puzzleItem:last()').clone()
        $(pi).find('a').attr('href','/puzzles/'+k)
        $(pi).find('a').text(v+'(nur Lokal)')
        $(pi).appendTo('.list-group:eq(0)');
    });
    socket.emit('list',1);
    socket.on('list',function(msg) {
    
        console.log(msg)
    });
});