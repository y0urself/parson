var app = require('express')();
//just a workaround to automatically open the url in browser
// var exec = require('child_process').exec;
var http = require('http').Server(app);
var io = require('socket.io')(http);
var quiz = require('./quiz.js');
var mustacheExpress = require('mustache-express');
const storage = require('node-persist');
storage.initSync();
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

puzzles=storage.getItemSync('puzzles');
console.log(puzzles)
app.get('/puzzles/:puzzleID', function(req, res){
    switch(req.params.puzzleID) {
        case 'new':
            res.render('new',{id:req.params.puzzleID});
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

app.get('/puzzles/:puzzleID/edit', function(req, res){
    res.render('edit',{urlprefix:'./',puzzles:puzzles});
});

app.get('/common.js', function(req, res){
  res.sendFile(__dirname + '/common.js');
});
app.get('/common.css', function(req, res){
  res.sendFile(__dirname + '/common.css');
});






io.on('connection', function(socket) {
//     socket.emit('gotRooms', this.getRoomsPublic());


//     socket.emit('state', quiz);
//     io.emit('serialized',lastSer)
//     socket.on('serialized',function(msg){
//         console.log(msg)
//         lastSer=msg
//         io.emit('serialized',msg)
//     });
    
    socket.on('request',function(msg){
        console.log('request:'+msg)
        if(puzzles[msg]==undefined)
            socket.emit('state','ERROR')
        else
            socket.emit('state',puzzles[msg])
            socket.quizid=msg
    });
    socket.on('serialized',function(msg){
        puzzles[socket.quizid].serialization=msg
        io.emit('serialized',puzzles[socket.quizid].serialization);
    });

    socket.on('new',function(msg){
        var q=new quiz(msg.name, msg.parts, msg.js_pre, msg.js_suf)
        console.log(q.id)
        puzzles[q.id]=q
        socket.emit('redirect','/puzzles/'+q.id)
        storage.setItemSync('puzzles',puzzles)
    });


//     socket.on('createRoom', this.handleClientMessages.createRoom);
//     socket.on('joinRoom', this.handleClientMessages.joinRoom);
});