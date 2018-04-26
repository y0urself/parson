var express = require('express');
var app = express();
//just a workaround to automatically open the url in browser
// var exec = require('child_process').exec;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var quiz = require('./quiz.js');
var mustache = require('mustache');
var mustacheExpress = require('mustache-express');
var fs = require('fs');
const passwordHash = require('password-hash');

const use_dynamo = process.env.DYNAMO === 'yes'
const master_pw = process.env.MASTER_PW || false

if (use_dynamo) {
    var AWS = require('aws-sdk');
    AWS.config.update({
        region: 'us-east-1'
    });
    var ddb = new AWS.DynamoDB.DocumentClient({
        apiVersion: '2012-08-10'
    });
}


var puzzles = {}

if (use_dynamo) {
    var dynamo = {
        put: function() {
            for (var i in puzzles) {
                var params = {
                    TableName: 'puzzles',
                    Item: dynamo.removeEmptyStringElements(puzzles[i])
                };
                ddb.put(params, function(err, data) {
                    if (err) {
                        console.log("Error", err);
                    } else {
                        //             console.log("Success", data);
                    }
                });
            }
        },
        fetch: function() {
            var params = {
                TableName: 'puzzles'
            };
            // Call DynamoDB to add the item to the table
            ddb.scan(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    var ob = {};
                    data = data.Items
                    for (var i in data) {
                        console.log(data[i])
                        ob[data[i].id] = data[i]
                    }
                    puzzles = ob
                    //             console.log("Success", data);
                    //             console.log(puzzles)
                }
            });

        },
        del: function(id) {
            var params = {
                TableName: 'puzzles',
                Key: {
                    id: id
                }
            };
            // Call DynamoDB to add the item to the table
            ddb.delete(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("suc", data);
                }
            });
        },
        removeEmptyStringElements: function(obj) {
            for (var prop in obj) {
                if (typeof obj[prop] === 'object') { // dive deeper in
                    dynamo.removeEmptyStringElements(obj[prop]);
                } else if (obj[prop] === '') { // delete elements that are empty strings
                    delete obj[prop];
                }
            }
            return obj;
        }

    }
} else {
    const storage = require('node-persist');
    storage.initSync();
    var dynamo = {
        put: function() {
            storage.setItemSync('puzzles', puzzles)
        },
        fetch: function() {
            puzzles = storage.getItemSync('puzzles');
        },
        del: function(id) {
            dynamo.put()
        }
    }
}

function texing(id) {
    var puzzle = getPuzzlePublic(puzzles[id]);
    var partstring = "";
    var i = 0;
    var keys = Object.keys(puzzle.parts);
    while (i < keys.length) {
        var k = keys[i];
        if ((i + 1) < keys.length && puzzle.parts[k].name.length <= 26) {
            partstring += "            \\ppart{" + k.replace('_', '\\_') + "}{" + puzzle.parts[k].name + "} &";
            i++
            k = keys[i];
            if (puzzle.parts[keys[i]].name.length <= 26) {
                partstring += "            \\ppart{" + k.replace('_', '\\_') + "}{" + puzzle.parts[k].name + "} \\\\[10pt]\n";
                i++
            } else {
                partstring += "            & \\\\[10pt]\n"
            }
        } else {
            partstring += "            \\multicolumn{2}{l}{\\dpart{" + k.replace('_', '\\_') + "}{" + puzzle.parts[k].name + "} }\\\\[10pt]\n";
            i++;
        }
    }
    puzzle.parts = partstring;
    return puzzle;
}

//*********************************************************************END

//alle IP-Adressen…
const hostname = '0.0.0.0';

//Mit Port 8080 oder gem. Env-Variable aus.
const port = process.env.PORT || 8081;

http.listen(port, function() {
    console.log('listening on *:' + port);
});

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/html');

console.log(puzzles)
dynamo.fetch()

function getPuzzlePublic(puzzle) {
    var sendquiz = Object.assign({}, puzzle)
    sendquiz.password = false;
    return sendquiz;
}


var texTemplate;
fs.readFile(__dirname + '/tex/test.tex', function(err, data) {
    if (err) {
        throw err;
    }
    texTemplate = data.toString();
    mustache.parse(texTemplate, ['<<<', '>>>']);
});


app.get('/puzzles/:puzzleID', function(req, res) {
    switch (req.params.puzzleID) {
        case 'new':
            res.render('new', {});
            break;
        case 'local':
            res.render('puzzle', {
                urlprefix: '/puzzles/',
                id: req.params.puzzleID
            });
            break;
        default:
            res.render('puzzle', {
                urlprefix: '/puzzles/',
                id: req.params.puzzleID
            });
    }
});

app.get(['/puzzles/', '/'], function(req, res) {
    var sendpuzzles = [];
    for (var k in puzzles) {
        if (puzzles[k].hidePuzzle !== true)
            sendpuzzles.push(puzzles[k])
    }
    res.render('list', {
        urlprefix: '/puzzles/',
        puzzles: sendpuzzles
    });
});

// app.get('/puzzles/:puzzleID/show', function(req, res){
//     res.render('show',{urlprefix:'./',puzzles:puzzles});
// });

app.get(['/puzzles/:puzzleID/edit', '/puzzles/:puzzleID/duplicate'], function(req, res) {
    res.render('new', {
        id: req.params.puzzleID
    });
});
app.get(['/puzzles/:puzzleID/tex'], function(req, res) {
    var puzzle = texing(req.params.puzzleID);
    res.setHeader('Content-type', 'application/x-tex');
    res.setHeader('Content-disposition', 'attachment; filename=Parson-' + req.params.puzzleID + '.tex');
    res.send(
        mustache.render(texTemplate,
            puzzle
        )
    );
});

app.use(express.static('static'));

app.get('/common.js', function(req, res) {
    res.sendFile(__dirname + '/common.js');
});

app.get('/common.css', function(req, res) {
    res.sendFile(__dirname + '/common.css');
});

app.get('/acorn_interpreter.js', function(req, res) {
    res.sendFile(__dirname + '/acorn_interpreter.js');
});


var collab = {};


function sendSerializationToGroup(group, message) {
    if (collab[group] != undefined) {
        var group = collab[group];
        for (var i in group.sockets) {
            var thisSocket = io.sockets.sockets[group.sockets[i]]
            if (thisSocket != undefined) {
                thisSocket.emit('serialized', message);
            } else {
                delete group[i]
            }
        }
    }
}
io.on('connection', function(socket) {
    socket.on('request', function(msg) {
        if (puzzles[msg] == undefined) {
            socket.emit('state', 'ERROR')
        } else {
            socket.emit('state', getPuzzlePublic(puzzles[msg]));
            socket.puzzle = msg;
        }
    });
    socket.on('serialized', function(msg) {
        if (puzzles[socket.puzzle] != undefined) {
            if (socket.collab != undefined) {
                collab[socket.puzzle + "_" + socket.collab].serialization = msg
                sendSerializationToGroup(socket.puzzle + "_" + socket.collab, msg)
            }
        }
    });

    socket.on('new', function(msg) {
        var q = new quiz(msg.name, msg.description, msg.parts, msg.js_input, msg.js_pre, msg.js_suf, msg.disableCollab, msg.disableJS, msg.hidePuzzle, passwordHash.generate(msg.password))
        puzzles[q.id] = q
        socket.emit('redirect', '/puzzles/' + q.id)
        dynamo.put();
    });

    socket.on('edit', function(msg) {
        if (puzzles[msg.qid] != undefined) {
            if ((master_pw != false && msg.password == master_pw) || (passwordHash.isHashed(puzzles[msg.qid].password) && passwordHash.verify(msg.password, puzzles[msg.qid].password))) {
                var q = new quiz(msg.name, msg.description, msg.parts, msg.js_input, msg.js_pre, msg.js_suf, msg.disableCollab, msg.disableJS, msg.hidePuzzle, puzzles[msg.qid].password, msg.qid)
                puzzles[q.id] = q
                socket.emit('redirect', '/puzzles/' + q.id)
                dynamo.put();
            } else {
                console.log("wrong PW")
                socket.emit('alert', {
                    type: 'danger',
                    message: "Passwort Falsch!"
                })
            }
        }
    });

    socket.on('delete', function(msg) {
        if (puzzles[msg.qid] != undefined) {
            if ((master_pw != false && msg.password == master_pw) || (passwordHash.isHashed(puzzles[msg.qid].password) && passwordHash.verify(msg.password, puzzles[msg.qid].password))) {
                delete puzzles[msg.qid]
                dynamo.del(msg.qid)
                socket.emit('alert', 'Erfolgreich gelöscht!')
                socket.emit('redirect', '/puzzles/')
                dynamo.put();
            } else {
                console.log("wrong PW")
                socket.emit('alert', {
                    type: 'danger',
                    message: "Passwort Falsch!"
                })
            }
        }

    });


    //Admin-Function - Sendet eine Komplett Nutzerspezifizierte Nachricht an alle Connections.
    //Beispiel (im Browser): socket.emit('admin_broadcast',{password:'masterpw',topic:'alert',message:{type:'danger', message:"Server startet in 10 Minuten neu!"}});
    //Beispiel (im Browser): socket.emit('admin_broadcast',{password:'masterpw',topic:'redirect',message:"https://www.youtube.com/watch?v=oHg5SJYRHA0"});
    socket.on('admin_broadcast', function(msg) {
        if ((master_pw != false && msg.password == master_pw)) {
            io.emit(msg.topic, msg.message)
        }
    });

    // Collaborate: Links an user to a collaboration-Group
    socket.on('collaborate', function(msg) {
        if (msg == '') {
            if (socket.collab != undefined && socket.puzzle != undefined) {
                console.log("removing from colalblist" + socket.puzzle + "_" + socket.collab)
                if (collab[socket.puzzle + "_" + socket.collab].sockets.includes(socket.id)) {
                    var idx = collab[socket.puzzle + "_" + socket.collab].sockets.indexOf(socket.id)
                    collab[socket.puzzle + "_" + socket.collab].sockets.splice(idx, 1)
                }
                socket.emit('alert', {
                    type: 'success',
                    message: "Du hast die Gruppe >" + socket.collab + "< verlassen!"
                })
                delete socket.collab;
            }
        } else {
            socket.collab = msg;
            if (socket.puzzle == undefined) {
                console.log("Socket did not yet join a puzzle, ignoring")
            }
            if (collab[socket.puzzle + "_" + socket.collab] == undefined) {
                collab[socket.puzzle + "_" + socket.collab] = {
                    sockets: [socket.id],
                    serialization: ''
                };
                socket.emit('alert', {
                    type: 'success',
                    message: "Du hast die Gruppe >" + msg + "< neu erstellt!"
                })

                //request the client to send their serialization
                socket.emit('serializationRequest', '1');
            } else {
                if (!collab[socket.puzzle + "_" + socket.collab].sockets.includes(socket.id))
                    collab[socket.puzzle + "_" + socket.collab].sockets.push(socket.id);
                //group already existed, sending last known serialization
                var known_serialization = collab[socket.puzzle + "_" + socket.collab].serialization
                socket.emit('alert', {
                    type: 'success',
                    message: "Du bist der Gruppe >" + msg + "< beigetreten!"
                })
                if (known_serialization != '') {
                    sendSerializationToGroup(socket.puzzle + "_" + socket.collab, known_serialization)
                } else {
                    //request the client to send their serialization
                    socket.emit('serializationRequest', '1');
                    socket.emit('alert', {
                        type: 'warning',
                        message: "In der Gruppe existierte noch keine Lösung, daher wurde deine lokale Lösung verwendet!"
                    })
                }
            }
        }
    });
});