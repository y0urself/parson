var grid = 40;
var maxlevel = 10;
var url = window.location.pathname.split('/');
ParsonAPP.loadedfromstorage = false
ParsonAPP.quizID = url[url.length - 1];
ParsonAPP.undoHistory = [];
ParsonAPP.redoHistory = [];
ParsonAPP.serialized = '';
ParsonAPP.render = function() {
    var bucketParts = {};
    var playParts = []
    var unser = ParsonAPP.serialized.split(' ')
    level = 0;
    for (var k in unser) {
        if (unser[k] == '')
            continue
        if (unser[k] != '{' && unser[k] != '}' && ParsonAPP.parts[unser[k]] == undefined) {
            CommonAPP.alert({
                type: 'danger',
                message: 'Die Serialisierung passt nich zum Puzzle!'
            });
            playParts = {};
            break;
        }
        while (unser[k][0] == '{' || unser[k][0] == '}') {
            if (unser[k][0] == '{') {
                level++
            } else {
                level--
            }
            unser[k] = unser[k].substring(1)
        }
        if (unser[k] == '')
            continue
        playParts.push({
            'id': unser[k],
            'name': ParsonAPP.parts[unser[k]].name,
            'level': level,
            'js': ParsonAPP.parts[unser[k]].js,
            'optional':  ParsonAPP.parts[unser[k]].optional,
        });
    }
    for (var k in ParsonAPP.parts) {
        var found = false;
        for (var i = 0; i < playParts.length; i++) {
            if (playParts[i].id == k) {
                found = true;
                break;
            }
        }
        if (!found) {
            bucketParts[k] = ParsonAPP.parts[k]
        }
    }
    var bucketHTML = ''
    for (var k in bucketParts) {
        bucketHTML += '<div class="part'+(bucketParts[k].optional ? ' optional' : '')+'" data-id=' + k + '><div class=identifier>' + k + '</div><div class="title monotextarea">' + bucketParts[k].name + '</div></div>';
    }
    $('#bucket').html(bucketHTML);

    var playHTML = ''
    for (var k in playParts) {
        playHTML += '<div class="part'+(playParts[k].optional ? ' optional' : '')+'" data-id="' + playParts[k].id + '" data-level="' + playParts[k].level + '"><div class=identifier>' + playParts[k].id + '</div><div class="title monotextarea">' + playParts[k].name + '</div></div>';
    }
    $('#play').html(playHTML);
    ParsonAPP.renderLevel()
}
ParsonAPP.renderLevel = function() {
    $.each($('.part'), function() {
        var lvl = $(this).data('level')
        $(this).css('margin-left', lvl * grid)

    });
}
ParsonAPP.doLevel = function(event, ui) {
    var dropped = ui.item;
    var pos = ui.position.left
    var curMargin = $(dropped).data('level');
    if (curMargin == undefined) {
        curMargin = 0;
    } else {
        curMargin = parseInt(curMargin)
    }
    var newMargin = Math.round((pos + curMargin * grid) / grid);
    if (newMargin > maxlevel || newMargin < -1) {
        $("#bucket").append(dropped)
        $(dropped).remove()
    }
    newMargin = (newMargin > 0 ? newMargin : 0)
    $(dropped).data('level', newMargin)
    ParsonAPP.renderLevel();
    ParsonAPP.serializeQuiz();

}
ParsonAPP.serializeQuiz = function(ignoreHistory) {
    if (!(ignoreHistory === true) && ParsonAPP.serialized !== undefined) {
        ParsonAPP.undoHistory.push(ParsonAPP.serialized)
        ParsonAPP.redoHistory = []
    }
    var ids = [];
    var lastLevel = 0;
    var lii = '';
    var js = ParsonAPP.js_pre + ';';
    $.each($('#play > .part'), function(k, v) {
        var lvl = parseInt($(v).data('level'));
        var idt = '' + $(v).data('id');
        if (lvl > lastLevel) {
            lii += Array(lvl - lastLevel + 1).join("{ ")
            js += Array(lvl - lastLevel + 1).join("{")
        }
        if (lvl < lastLevel) {
            lii += Array(lastLevel - lvl + 1).join("} ")
            js += Array(lastLevel - lvl + 1).join("}")
        }
        lii += idt + ' ';
        js += ParsonAPP.parts[idt].js + '\n';
        lastLevel = lvl;
        ids.push(idt);
    });
    lii += Array(lastLevel + 1).join("} ");
    js += Array(lastLevel + 1).join("}");
    js += ';' + ParsonAPP.js_suf;
    $('#serialized').text(lii);

    var unused=Object.keys(ParsonAPP.parts).filter( function( el ) {
        return !(
                    ids.includes( el ) || 
                    ids.includes(ParsonAPP.parts[el].parent) || 
                    (
                        ParsonAPP.parts[el].children.some(function(k){
                            return ids.includes(k)
                        })
                    )
                );
    } );
    unused=unused.filter(function(el) {
        return !(unused.includes(ParsonAPP.parts[el].parent) || ParsonAPP.parts[el].optional==true)
    })
    $('#js_show').val(js_beautify(js));
    duplicates = [];
    for (var i = 1; i < ids.length; i++) {
        if(ParsonAPP.parts[ids[i]].parent!==undefined){
            if(ids.includes(ParsonAPP.parts[ids[i]].parent)){
                duplicates.push([ParsonAPP.parts[ids[i]].parent,ids[i]]);
            }
        }
    }
    duplicates.sort();
    $("#warnings").html("");
    if (!duplicates.length == 0) {
        console.log("duplicates detected");
        for (var i in duplicates) {
            var str = "Das Paar <span class=monotextarea>(" + duplicates[i][0] + "," + duplicates[i][1] + ")</span> wird doppelt verwendet</br>";
            $("#warnings").append(str);
        }
    }
    if (!unused.length == 0) {
        for (var i in unused) {
            var str = "Das Element " + unused[i] + ((ParsonAPP.parts[unused[i]].children.length==0 && ParsonAPP.parts[unused[i]].parent==undefined) ? '' : " (oder Alternativen)")+" wurde nicht genutzt.</br>";
            $("#warnings").append(str);
        }
    }
    ParsonAPP.setSerialized(lii)
    //     socket.emit('serialized', lii);
    //     ParsonAPP.serialized = lii
    //     localStorage.setItem("quizstate_" + quizID, JSON.stringify(ParsonAPP.serialized))
}
ParsonAPP.doReceive = function(event, ui) {
    $(ui.item).data('level', '0');
    ParsonAPP.serializeQuiz();
}
ParsonAPP.doNewDraggable = function() {
    $("#bucket").sortable({
        connectWith: "#play",
        receive: ParsonAPP.doReceive
    });
    $("#play").sortable({
        connectWith: "#bucket",
        stop: ParsonAPP.doLevel,
        receive: ParsonAPP.doLevel
    });
}
ParsonAPP.loadFromStorage = function() {
    if (!ParsonAPP.loadedfromstorage) {
        if (localStorage.getItem("quizstate_" + ParsonAPP.quizID) != undefined) {
            ParsonAPP.serialized = JSON.parse(localStorage.getItem("quizstate_" + ParsonAPP.quizID))
            $('#form_reload').val(ParsonAPP.serialized)
            $('#serialized').text(ParsonAPP.serialized)
        }
        if (localStorage.getItem("collaborate_" + ParsonAPP.quizID) != undefined) {
            $('#form_collab').val(localStorage.getItem("collaborate_" + ParsonAPP.quizID))
            ParsonAPP.joinCollab()
        }
    }
    ParsonAPP.loadedfromstorage = true;
}
ParsonAPP.undo = function() {
    if (ParsonAPP.undoHistory.length >= 1) {
        ParsonAPP.redoHistory.push(ParsonAPP.serialized)
        ParsonAPP.setSerialized(ParsonAPP.undoHistory.pop())
        ParsonAPP.serializeQuiz(true)
    }
}
ParsonAPP.redo = function() {
    if (ParsonAPP.redoHistory.length >= 1) {
        ParsonAPP.undoHistory.push(ParsonAPP.serialized)
        ParsonAPP.setSerialized(ParsonAPP.redoHistory.pop())
        ParsonAPP.serializeQuiz(true)
    }
}
ParsonAPP.setSerialized = function(serialized, send) {
    ParsonAPP.serialized = serialized
    if (send == undefined || send != false) {
        socket.emit('serialized', serialized);
    }
    localStorage.setItem("quizstate_" + ParsonAPP.quizID, JSON.stringify(ParsonAPP.serialized))
    $('#form_reload').val(ParsonAPP.serialized)
    $('#serialized').text(ParsonAPP.serialized)
    ParsonAPP.render()
}

ParsonAPP.joinCollab = function() {
    var collabGroup = $('#form_collab').val().trim()
    socket.emit('collaborate', collabGroup);
    localStorage.setItem("collaborate_" + ParsonAPP.quizID, $('#form_collab').val().trim())
    $('#form_collab').val("");
}
ParsonAPP.sockethandlers = {
    connect: function(msg) {
        socket.emit('request', url[url.length - 1])
    },
    state: function(msg) {
        ParsonAPP.loadFromStorage()
        $('.col-sm-8 > h1').text(msg.name)
        $('#description').text(msg.description)
        ParsonAPP.parts = msg.parts
//         enrich parts by their children
        for(var k in ParsonAPP.parts) {
            ParsonAPP.parts[k].children = ParsonAPP.parts[k].children || []
        }
        for(var k in ParsonAPP.parts) {
            if(ParsonAPP.parts[k].parent!=undefined) {
                var parent=ParsonAPP.parts[k].parent
                ParsonAPP.parts[parent].children.push(k)
            }
        }
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
    serializationRequest: function(msg) {
        ParsonAPP.serializeQuiz()
    },
    serialized: function(msg) {
        ParsonAPP.setSerialized(msg, false)
    }
}



ParsonAPP.registerSocketHandlers = function() {
    socket.on('connect', ParsonAPP.sockethandlers.connect);
    socket.on('state', ParsonAPP.sockethandlers.state);
    socket.on('serialized', ParsonAPP.sockethandlers.serialized);
    socket.on('serializationRequest', ParsonAPP.sockethandlers.serializationRequest);
}



ParsonAPP.registerSocketHandlers()
document.onkeydown = function(e) {
    e = e || window.event;
    if (e.keyCode == '188') {
        ParsonAPP.undo()
    } else if (e.keyCode == '190') {
        ParsonAPP.redo()
    }
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
    ParsonAPP.group = false;
    $('#collab').on('click', function(e) {
    	console.log($('#form_collab').val())
    	if ($('#form_collab').val() == "") {
    		ParsonAPP.joinCollab();
    		ParsonAPP.group = false;
    		$(this).html("Betreten")
    	} else if(!ParsonAPP.group) {
    		ParsonAPP.joinCollab();
	        ParsonAPP.group = true;
    		$(this).html("Verlassen");
    	} else if(ParsonAPP.group && !$('#form_collab').val() == "") {
    		var tmp = $('#form_collab').val();
    		//workaround for leaving old and join new collab
	        $('#form_collab').val("");
	        ParsonAPP.joinCollab();
	        $('#form_collab').val(tmp);
	        ParsonAPP.joinCollab();
	        ParsonAPP.group = true;
    		$(this).html("Verlassen");
    	} else {
    		$('#form_collab').val("");
	        ParsonAPP.joinCollab();
	        ParsonAPP.group = false;
    		$(this).html("Beitreten");
    	}
    //     $('#createPDF').on('click', createPDF);
    // $('#leave').on('click', function(e) {
//         $('#form_collab').val("");
//         ParsonAPP.joinCollab()
	});
    $('#eval').on('click', function(e) {
        var initFunc = function(interpreter, scope) {
            var print = function(text) {
                $('#js_eval').val($('#js_eval').val() + text + "\n")
                //                 var $textarea = $('#js_eval');
                //                 $textarea.scrollTop($textarea[0].scrollHeight);
            };
            interpreter.setProperty(scope, 'print_internal', interpreter.createNativeFunction(print));
        };
        if (ParsonAPP.stepper !== undefined) {
            window.clearTimeout(ParsonAPP.stepper)
            $('#js_eval').val($('#js_eval').val() + "---------------\nAborted by user after " + window.steps + " steps (" + (Date.now() - window.startrun) + "ms)\n---------------\n")
            delete ParsonAPP.stepper
        }
        try{
            var myInterpreter = new Interpreter(
                    "var js_input=" + $('#js_input').val() + ";"+
                    "function print(a){"+
                    "if(typeof a == 'string'){"+
                    " print_internal(a);"+
                    "}else{"+
                    " print_internal(JSON.stringify(a))"+
                    "}" + 
                    "};" + 
                    $('#js_show').val(), 
                    initFunc);
        } catch(err) {
            $('#js_eval').val($('#js_eval').val() + "---------------\nCan't run code: Syntax Error:" + JSON.stringify(err.message) + "\n---------------\n")
            return false
        }
        window.steps = 0
        window.startrun = Date.now()

        function nextStep(launchItSelf) {
            if(launchItSelf!==false){
                //this does two steps per ticked timeout, to speed up this a little bit.
                //todo: add a slider for speed, which may change both the timeout
                //(to make it yet more slow) as well the no. of iterations here
                //(to make it faster than timeouts allow)
                //todo: remove double output
                //nextStep(false);
            }
            try {
                if (myInterpreter.step()) {
                    $('#js_steps').val(window.steps++);
                    if(launchItSelf!==false){
                        ParsonAPP.stepper = window.setTimeout(nextStep, 1);
                    }
                } else {
                    $('#js_eval').val($('#js_eval').val() + "---------------\nFinished in " + window.steps + " steps (" + (Date.now() - window.startrun) + "ms)\n---------------\n")
                    delete ParsonAPP.stepper
                }
            } catch (err) {
                delete ParsonAPP.stepper
                $('#js_eval').val($('#js_eval').val() + "---------------\nAborted after " + window.steps + " steps (" + (Date.now() - window.startrun) + "ms)\n" + JSON.stringify(err.message) + "\n---------------\n")
            }
        }
        nextStep();
    });
});