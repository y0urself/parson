var express = require('express');
var app = express();
//just a workaround to automatically open the url in browser
// var exec = require('child_process').exec;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mustache = require('mustache');
var mustacheExpress = require('mustache-express');
var auth = require('http-auth');
var fs = require('fs');
const passwordHash = require('password-hash');

var bill = require('./bill.js');
var part = require('./part.js');
const use_dynamo = process.env.DYNAMO === 'yes'
const master_pw = process.env.MASTER_PW || false
const auth_admin = process.env.AUTH_ADMIN || false
const auth_pass = process.env.AUTH_PASS || false

if (use_dynamo) {
    var AWS = require('aws-sdk');
    AWS.config.update({
        region: 'us-east-1'
    });
    var ddb = new AWS.DynamoDB.DocumentClient({
        apiVersion: '2012-08-10'
    });
}


var bills = {}
var parts = {}

// Calls for Bills
if (use_dynamo) {
    var dynamo = {
        put_bills: function() {
            for (var i in bills) {
                var params = {
                    TableName: 'bills',
                    Item: dynamo.removeEmptyStringElements(bills[i])
                };
                ddb.put(params, function(err, data) {
                    if (err) {
                        console.log("Error", err);
                    } else {
                        console.log("Success", data);
                    }
                });
            }
        },
        put_bill: function(bill) {
            var params = {
                TableName: 'bills',
                Item: dynamo.removeEmptyStringElements(bills[i])
            };
            ddb.put(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("Success", data);
                }
            });
        },
        put_parts: function() {
            for (var i in parts) {
                var params = {
                    TableName: 'parts',
                    Item: dynamo_parts.removeEmptyStringElements(parts[i])
                };
                ddb.put(params, function(err, data) {
                    if (err) {
                        console.log("Error", err);
                    } else {
                        console.log("Success", data);
                    }
                });
            }
        },
        fetch_bills: function() {
            var params = {
                TableName: 'bills'
            };
            // Call DynamoDB to add the item to the table
            ddb.scan(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    var db_bills = {};
                    data = data.Items
                    for (var i in data) {
                        console.log(data[i])
                        db_bills[data[i].id] = data[i]
                    }
                    bills = db_bills
                    console.log("Success", data);
                    console.log(bills)
                }
            });

        },
        fetch_parts: function() {
            var params = {
                TableName: 'parts'
            };
            // Call DynamoDB to add the item to the table
            ddb.scan(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    var db_parts = {};
                    data = data.Items
                    for (var i in data) {
                        console.log(data[i])
                        db_parts[data[i].id] = data[i]
                    }
                    parts = db_parts
                    //             console.log("Success", data);
                    console.log(parts)
                }
            });

        },
        del_bill: function(id) {
            var params = {
                TableName: 'bills',
                Key: {
                    id: id
                }
            };
            // Call DynamoDB to delete the item from the table
            ddb.delete(params, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("suc", data);
                }
            });
        },
        del_part: function(id) {
            var params = {
                TableName: 'parts',
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
        put_bills: function() {
            storage.setItemSync('bills', bills)
        },
        put_bill: function(bill) {
            dynamo.put_bills()
        },
        put_parts: function() {
            storage.setItemSync('parts', parts)
        },
        fetch_bills: function() {
            bills = storage.getItemSync('bills');
        },
        fetch_parts: function() {
            parts = storage.getItemSync('parts');
        },
        del_bill: function(id) {
            dynamo.put_bill()
        },
        del_part: function(id) {
            dynamo_parts.put_parts()
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
                partstring += "            \\\\[10pt]\n"
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

if(auth_admin!==false) {
    app.use(auth.connect(auth.basic({
            realm: "Rechnungen."}, (username, password, callback) => { 
                callback(username === auth_admin && password === auth_pass);
            })
    ));
}
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/html');

dynamo.fetch_bills()
dynamo.fetch_parts()

console.log(bills)
console.log(parts)

var texTemplate;
fs.readFile(__dirname + '/tex/test.tex', function(err, data) {
    if (err) {
        throw err;
    }
    texTemplate = data.toString();
    mustache.parse(texTemplate, ['<<<', '>>>']);
});


app.get('/parts/:partID', function(req, res) {
    switch (req.params.partID) {
        case 'new_part':
            res.render('new_part', {});
            break;
        case 'local':
            res.render('part', {
                urlprefix: '/parts/',
                id: req.params.partID
            });
            break;
        default:
            res.render('part', {
                urlprefix: '/parts/',
                id: req.params.partID,
                part: parts[req.params.partID]
            });
    }
});

app.get('/bills/:billID', function(req, res) {
    switch (req.params.billID) {
        case 'new_bill':
            res.render('new_bill', {});
            break;
        case 'local':
            res.render('bill', {
                urlprefix: '/bills/',
                id: req.params.billID
            });
            break;
        default:
            res.render('bill', {
                urlprefix: '/bills/',
                id: req.params.billID,
                bill: bills[req.params.billID]
            });
    }
});

app.get(['/bills/', '/'], function(req, res) {
    var sendbills = [];
    for (var k in bills) {
        sendbills.push(bills[k])
    }
    res.render('list', {
        urlprefix: '/bills/',
        bills: sendbills
    });
});

app.get(['/parts/'], function(req, res) {
    var sendparts = [];
    for (var k in parts) {
        sendparts.push(parts[k])
    }
    res.render('parts', {
        urlprefix: '/parts/',
        parts: sendparts
    });
});

app.get(['/parts/:partID/edit_part', '/parts/:partID/duplicate'], function(req, res) {
    res.render('new_part', {
        id: req.params.partID
    });
});

app.get(['/bills/:billID/edit', '/bills/:billID/duplicate'], function(req, res) {
    res.render('new_bill', {
        id: req.params.billID
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
    socket.on('request_part', function(msg) {
        if (parts[msg] == undefined) {
            socket.emit('state', 'ERROR')
        } else {
            socket.emit('state', parts[msg])
            socket.part = parts[msg];
        }
    });

    socket.on('new_part', function(msg) {
        console.log("new part ...")
        var p = new part(msg.name, msg.parttype, msg.description, msg.bprice)
        parts[p.id] = p
        socket.emit('redirect', '/parts/' + p.id)
        dynamo_parts.put_parts()
        console.log("Parts" + parts)
    });
    
    socket.on('new_parts_from_bill', function(msg) {
        console.log("new parts from bill ...")
        part_ids = []
        console.log(msg)
        msg.forEach(function (item, index) {
            console.log(item, index);
            var p = new part(item.name, item.parttype, item.description, item.bprice)
            parts[p.id] = p
            part_ids.push(p.id)
          });
        socket.emit('part_ids', {
            ids: part_ids
        })   
        socket.emit('alert', {
            type: 'success', 
            message: 'Komponenten erfolgreich erstellt!', 
            timeout: 10000
        })        
        dynamo.put_parts()
        console.log("Parts" + parts)
    });
    
    socket.on('edit_part', function(msg) {
        if (parts[msg.qid] != undefined) {
            var p = new part(msg.name, msg.parttype, msg.description, msg.bprice, msg.qid)
            parts[p.id] = p
            socket.emit('redirect', '/parts/' + p.id)
            dynamo.put_parts();
            console.log(parts)
        }
    });
    
    socket.on('delete_part', function(msg) {
        if (parts[msg.qid] != undefined) {
            delete parts[msg.qid]
            dynamo.del_part(msg.qid)
            socket.emit('redirect', '/parts/')
            socket.emit('alert', {
                type: 'success', 
                message: 'Erfolgreich gelöscht!', 
                timeout: 10000
            })
            //dynamo.put_parts();
        }
        
    });
    
    ////// BILLS Stuff /////////
    socket.on('new_bill', function(msg) {
        var bi = new bill(msg.name, msg.surname, msg.street, msg.city, msg.date, msg.number, msg.type, msg.parts)
        console.log(bi)
        bills[bi.id] = bi
        socket.emit('redirect', '/bills/' + bi.id)
        dynamo.put_bills();
        console.log(bills)
    });

    socket.on('edit_bill', function(msg) {
        if (bills[msg.qid] != undefined) {
            var b = new bill(msg.name, msg.surname, msg.street, msg.city, msg.date, msg.number, msg.type, msg.parts, msg.qid)
            bills[b.id] = b
            socket.emit('redirect', '/bills/' + b.id)
            dynamo.put_bills();
            console.log(bills)
        }
    });
    
    socket.on('delete_bill', function(msg) {
        if (bills[msg.qid] != undefined) {
            delete bills[msg.qid]
            dynamo.del_bills(msg.qid)
            socket.emit('redirect', '/bills/')
            socket.emit('alert', {
                type: 'success', 
                message: 'Erfolgreich gelöscht!', 
                timeout: 10000
            })
            //dynamo.put_bills();
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

});