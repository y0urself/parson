var grid = 40;
var maxlevel = 10;
var url = window.location.pathname.split('/');
var quizID = url[url.length - 1];
window.serialized = '';
window.loadedfromstorage = false

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
        window.serialized = $('#form_reload').val().trim();
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



function loadFromStorage() {
    if (!window.loadedfromstorage) {
        if (localStorage.getItem("quizstate_" + quizID) != undefined) {
            window.serialized = JSON.parse(localStorage.getItem("quizstate_" + quizID))
            $('#form_reload').val(window.serialized)
            $('#serialized').text(window.serialized)
        }
        if (localStorage.getItem("collaborate_" + quizID) != undefined) {
            $('#form_collab').val(localStorage.getItem("collaborate_" + quizID))
            joinCollab()
        }
    }
    window.loadedfromstorage = true;
}



ParsonAPP.undo = function() {
    if(ParsonAPP.undoHistory.length>1){
        window.serialized=ParsonAPP.undoHistory[ParsonAPP.undoHistory.length-2]
        ParsonAPP.redoHistory.push(window.serialized)
        ParsonAPP.undoHistory.splice(-1,1)
        $('#form_reload').val(window.serialized)
        $('#serialized').text(window.serialized)
        ParsonAPP.render()
    }
}
ParsonAPP.redo = function() {
    if(ParsonAPP.redoHistory.length>0){
        window.serialized=ParsonAPP.redoHistory[ParsonAPP.redoHistory.length-1]
        ParsonAPP.undoHistory.push(window.serialized)
        ParsonAPP.redoHistory.splice(-1,1)
        $('#form_reload').val(window.serialized)
        $('#serialized').text(window.serialized)
        ParsonAPP.render()
    }
}

document.onkeydown = function(e) {
    e = e || window.event;
    if (e.keyCode == '37') {
       ParsonAPP.undo()
    }
    else if (e.keyCode == '39') {
       ParsonAPP.redo()
    }
}
socket.on('connect', function(a) {
    socket.emit('request', url[url.length - 1])
});
socket.on('serializationRequest', function() {
    ParsonAPP.serializeQuiz();
});
socket.on('serialized', function(a) {
    $('#serialized').text(a)
    window.serialized = a
    ParsonAPP.render();
});
socket.on('state', function(a) {
    loadFromStorage()
    $('.jumbotron > h1').text(a.name)
    $('#description').text(a.description)
    window.parts = a.parts
    window.js_input = a.js_input
    $('#js_input').val(a.js_input)
    window.js_pre = a.js_pre
    window.js_suf = a.js_suf

    if ((a.disableCollab === true)) {
        $('.form_group_collab').hide()
    }
    if ((a.disableJS === true)) {
        $('#js_part').hide()
    }
    ParsonAPP.render()
    ParsonAPP.serializeQuiz()
    ParsonAPP.doNewDraggable();
});