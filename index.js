var app = require('express')();
//just a workaround to automatically open the url in browser
// var exec = require('child_process').exec;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var quiz = require('./quiz.js');
var mustacheExpress = require('mustache-express');
const passwordHash = require('password-hash');

const use_dynamo = process.env.DYNAMO === 'yes'

if(use_dynamo) {
    var AWS = require('aws-sdk');
    AWS.config.update({region:'us-east-1'});
    var ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
}


var puzzles = {}

if(use_dynamo) {
    var dynamo = {
        put:function() {
            for(var i in puzzles) {
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
                var ob={};
                data=data.Items
                for(var i in data) {
                    console.log(data[i])
                    ob[data[i].id]=data[i]
                }
                puzzles=ob
    //             console.log("Success", data);
    //             console.log(puzzles)
              }
            });
        
        },
        del:function(id) {
            var params = {
              TableName: 'puzzles',
              Key: {id:id}
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
            if (typeof obj[prop] === 'object') {// dive deeper in
              dynamo.removeEmptyStringElements(obj[prop]);
            } else if(obj[prop] === '') {// delete elements that are empty strings
              delete obj[prop];
            }
          }
          return obj;
        }

    }
}else{
    const storage = require('node-persist');
    storage.initSync();
    var dynamo = {
        put:function() {
            storage.setItemSync('puzzles',puzzles)
        },
        fetch:function() {
            puzzles=storage.getItemSync('puzzles');
        },
        del:function(id) {
            dynamo.put()
        }
    }
}
//*********************************************************************END

//alle IP-Adressen…
const hostname = '0.0.0.0';

//Mit Port 8080 oder gem. Env-Variable aus.
const port = process.env.PORT || 8081;

http.listen(port, function(){
  console.log('listening on *:'+port);
});

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/html');

console.log(puzzles)
dynamo.fetch()




// dynamo.getItem('test')
app.get('/puzzles/:puzzleID', function(req, res){
    switch(req.params.puzzleID) {
        case 'new':
            res.render('new',{});
        break;
        case 'local':
            res.render('puzzle',{urlprefix:'/puzzles/',id:req.params.puzzleID});
        break;
        default:
            res.render('puzzle',{urlprefix:'/puzzles/',id:req.params.puzzleID});
    }
});

// app.get('/puzzles/', function(req, res){
//     res.render('list',{urlprefix:'./',puzzles:puzzles});
// });

app.get(['/puzzles/','/'], function(req, res){
    res.render('list',{urlprefix:'/puzzles/',puzzles:Object.values(puzzles)});
});

app.get('/puzzles/:puzzleID/show', function(req, res){
    res.render('show',{urlprefix:'./',puzzles:puzzles});

});

app.get(['/puzzles/:puzzleID/edit','/puzzles/:puzzleID/duplicate'], function(req, res){
    res.render('new',{id:req.params.puzzleID});
});

app.get('/common.js', function(req, res){
  res.sendFile(__dirname + '/common.js');
});
app.get('/common.css', function(req, res){
  res.sendFile(__dirname + '/common.css');
});
app.get('/acorn_interpreter.js', function(req, res){
  res.sendFile(__dirname + '/acorn_interpreter.js');
});


var collab = {};


io.on('connection', function(socket) {
    socket.on('request',function(msg){
        console.log('request:'+msg)
        if(puzzles[msg]==undefined){
            socket.emit('state','ERROR')
        }else{
            var sendquiz = Object.assign({},puzzles[msg])
            sendquiz.password=false;
            socket.emit('state',sendquiz);
            socket.puzzle=msg;
            var col = new Colaboration(msg).add(socket);
        }
    });
    socket.on('serialized',function(msg){
        if(puzzles[socket.quizid] != undefined){ 
            puzzles[socket.quizid].serialization=msg
            io.emit('serialized',puzzles[socket.quizid].serialization);
        }
    });

    socket.on('new',function(msg){
        var q=new quiz(msg.name, msg.parts, msg.js_input, msg.js_pre, msg.js_suf, passwordHash.generate(msg.password))
        puzzles[q.id]=q
        console.log('new:')
        console.log(q)
        socket.emit('redirect','/puzzles/'+q.id)
        dynamo.put();
    });

    socket.on('edit',function(msg){
        if(puzzles[msg.qid]!=undefined) {
            if(msg.password == 'my sup3r s3c4re? Master Password!' || (passwordHash.isHashed(puzzles[msg.qid].password) && passwordHash.verify(msg.password,puzzles[msg.qid].password))){
                var q=new quiz(msg.name, msg.parts, msg.js_input, msg.js_pre, msg.js_suf, puzzles[msg.qid].password, msg.qid)
                puzzles[q.id]=q
                socket.emit('redirect','/puzzles/'+q.id)
                dynamo.put();
            }else{
                console.log("wrong PW")
                socket.emit('alert','Passort falsch!')
            }
        }
    });

    socket.on('delete',function(msg){
        if(puzzles[msg.qid]!=undefined) {
            if(msg.password == 'my sup3r s3c4re? Master Password!' || (passwordHash.isHashed(puzzles[msg.qid].password) && passwordHash.verify(msg.password,puzzles[msg.qid].password))){
                delete puzzles[msg.qid]
                dynamo.del(msg.qid)
                socket.emit('alert','Erfolgreich gelöscht!')
                socket.emit('redirect','/puzzles/')
                dynamo.put();
            }else{
                console.log("wrong PW")
                socket.emit('alert','Passort falsch!')
            }
        }

    });

    socket.on('colaborate', function(msg){
        console.log('colab:'+msg);
        socket.collab=msg;
        if(collab[msg]==undefined){
            collab[socket.puzzle+"_"+socket.collab] = [socket.id];
        }else{
            collab[socket.puzzle+"_"+socket.collab].push(socket.id);
            console.log(collab[socket.puzzle+"_"+socket.collab]);
        }
    });

//     socket.on('createRoom', this.handleClientMessages.createRoom);
//     socket.on('joinRoom', this.handleClientMessages.joinRoom);
});