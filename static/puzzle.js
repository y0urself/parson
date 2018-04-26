var grid = 40;
var maxlevel = 10;
var url = window.location.pathname.split('/');
ParsonAPP.loadedfromstorage = false
ParsonAPP.quizID=url[url.length - 1];
function joinCollab() {
    var collabGroup = $('#form_collab').val().trim()
    socket.emit('collaborate', collabGroup);
    localStorage.setItem("collaborate_" + quizID, $('#form_collab').val().trim())
}

// function createPDF() {
//     $.get('./'+quizID+'/tex', function(data) {
//         var pdftex = new PDFTeX('/tex/pdftex-worker.js');
//         pdftex.set_TOTAL_MEMORY(1000000).then(function(){
//             var latex_code = data
//     //         pdftex.set_TOTAL_MEMORY(250000)
//             pdftex.compile(latex_code)
//                 .then(function(pdf) {
//                     window.open(pdf)
//                 });
//         });
//     });
// }
$(document).ready(function() {
    $(document).bind('touchmove', function(e) {
        e.preventDefault();
    }, false);
    $('#loadLsg').on('click', function(e) {
        ParsonAPP.serialized = $('#form_reload').val().trim();
        ParsonAPP.render()
        ParsonAPP.serializeQuiz()
    });
    $('#collab').on('click', joinCollab);
    //     $('#createPDF').on('click', createPDF);
    $('#leave').on('click', function(e) {
        $('#form_collab').val("");
        joinCollab()
    });
    $('#eval').on('click', function(e) {
        var myInterpreter = new Interpreter("var js_input=" + $('#js_input').val() + ";" + $('#js_show').val());
        myInterpreter.run();
        $('#js_eval').val(myInterpreter.value)
    });
});






ParsonAPP.loadFromStorage=function() {
    if (!ParsonAPP.loadedfromstorage) {
        if (localStorage.getItem("quizstate_" + ParsonAPP.quizID) != undefined) {
            ParsonAPP.serialized = JSON.parse(localStorage.getItem("quizstate_" + ParsonAPP.quizID))
            $('#form_reload').val(ParsonAPP.serialized)
            $('#serialized').text(ParsonAPP.serialized)
        }
        if (localStorage.getItem("collaborate_" + ParsonAPP.quizID) != undefined) {
            $('#form_collab').val(localStorage.getItem("collaborate_" + ParsonAPP.quizID))
            joinCollab()
        }
    }
    ParsonAPP.loadedfromstorage = true;
}
ParsonAPP.undo = function() {
    if(ParsonAPP.undoHistory.length>=1){
        ParsonAPP.redoHistory.push(ParsonAPP.serialized)
        ParsonAPP.setSerialized(ParsonAPP.undoHistory.pop())
    }
}
ParsonAPP.redo = function() {
    if(ParsonAPP.redoHistory.length>=1){
        ParsonAPP.undoHistory.push(ParsonAPP.serialized)
        ParsonAPP.setSerialized(ParsonAPP.redoHistory.pop())
    }
}
ParsonAPP.setSerialized=function(serialized) {
    ParsonAPP.serialized=serialized
    socket.emit('serialized', serialized);
    localStorage.setItem("quizstate_" + ParsonAPP.quizID, JSON.stringify(ParsonAPP.serialized))
    $('#form_reload').val(ParsonAPP.serialized)
    $('#serialized').text(ParsonAPP.serialized)
    ParsonAPP.render()
}
ParsonAPP.sockethandlers={
    connect:function(msg) {
        socket.emit('request', url[url.length - 1])
    },
    state:function(msg) {
        ParsonAPP.loadFromStorage()
        $('.jumbotron > h1').text(msg.name)
        $('#description').text(msg.description)
        ParsonAPP.parts = msg.parts
        ParsonAPP.js_input = msg.js_input
        $('#js_input').val(msg.js_input)
        ParsonAPP.js_pre = msg.js_pre
        ParsonAPP.js_suf = msg.js_suf

        if ((msg.disableCollab === true)) {
            $('.form_group_collab').hide()
        }
        if ((msg.disableJS === true)) {
            $('#js_part').hide()
        }
        ParsonAPP.render()
        ParsonAPP.serializeQuiz()
        ParsonAPP.doNewDraggable();
    },
    serializationRequest:function(msg) {
        ParsonAPP.serializeQuiz()
    },
    serialized:function(msg) {
        ParsonAPP.setSerialized(msg)
    }
}



ParsonAPP.registerSocketHandlers=function() {
    socket.on('connect', ParsonAPP.sockethandlers.connect);
    socket.on('state', ParsonAPP.sockethandlers.state );
    socket.on('serialized', ParsonAPP.sockethandlers.serialized );
    socket.on('serializationRequest', ParsonAPP.sockethandlers.serializationRequest );
}



ParsonAPP.registerSocketHandlers()
document.onkeydown = function(e) {
    e = e || window.event;
    if (e.keyCode == '188') {
       ParsonAPP.undo()
    }
    else if (e.keyCode == '190') {
       ParsonAPP.redo()
    }
}