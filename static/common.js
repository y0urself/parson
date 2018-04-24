var ParsonAPP = ParsonAPP || {};
var socket = io();
socket.on('redirect', function(a){
    window.location=a
});
function fancyAlert(a){
    if(typeof a == 'string')
        a={type:'primary',message:a}
        

    $(".alertWrapper").removeClass(function (index, className) {
        return (className.match (/(^|\s)alert-\S+/g) || []).join(' ');
    });
    $('.alertWrapper').addClass('alert-top alert-'+a.type)
    $(".alertWrapper > p").text(a.message);
    $(".alertWrapper").show();
    if(a.timeout != undefined) {
        setTimeout(function(){
            $(".alertWrapper").hide(); 
        }, a.timeout);
    }
}
socket.on('alert', fancyAlert);


ParsonAPP.render=function() {
    var bucketParts={};
    var playParts={}
    var unser=window.serialized.split(' ')
    level=0;
    for(var k in unser) {
        if(unser[k]=='')
            continue
        if(unser[k]!='{' && unser[k]!= '}' && window.parts[unser[k]]==undefined) {
            console.log(unser[k])
            fancyAlert({type:'danger', message:'Die Serialisierung passt nich zum Puzzle!'});
            playParts={};
            break;
        }
        while(unser[k][0]=='{' || unser[k][0]=='}') {
            if(unser[k][0]=='{') {
                level++
            }else{
                level--
            }
            unser[k]=unser[k].substring(1)
        }
        if(unser[k]=='')
            continue
        playParts[unser[k]]={'name':window.parts[unser[k]].name, 'level':level, 'js':window.parts[unser[k]].js};
    }
    for(var k in window.parts) {
        if(playParts[k]==undefined) {
            bucketParts[k]=window.parts[k]
        }
    }
    console.log(bucketParts)
    var bucketHTML=''
    for(var k in bucketParts){
        bucketHTML+='<div class=part data-id='+k+'><div class=identifier>'+k+'</div><div class=title>'+bucketParts[k].name+'</div></div>';
    }
    $('#bucket').html(bucketHTML);

    var playHTML=''
    for(var k in playParts){
        playHTML+='<div class=part data-id="'+k+'" data-level="'+playParts[k].level+'"><div class=identifier>'+k+'</div><div class=title>'+playParts[k].name+'</div></div>';
    }
    $('#play').html(playHTML);
    ParsonAPP.renderLevel()
}
ParsonAPP.renderLevel=function() {
    $.each($('.part'), function() {
        var lvl=$(this).data('level')
        $(this).css('margin-left',lvl * grid)
    
    });
}
ParsonAPP.doLevel=function(event, ui) {
    var dropped = ui.item;
    var pos = ui.position.left
    console.log(ui.position)
    var curMargin=$(dropped).data('level');
    if(curMargin == undefined) {
        curMargin=0;
    }else{
        curMargin=parseInt(curMargin)
    }
    var newMargin=Math.round((pos+curMargin*grid) / grid);
    if(newMargin>maxlevel || newMargin<-1){
        $("#bucket").append(dropped)
        $(dropped).remove()
    }
    newMargin=(newMargin>0?newMargin:0)
    $(dropped).data('level',newMargin)
    ParsonAPP.renderLevel();
    ParsonAPP.serializeQuiz();
}



ParsonAPP.serializeQuiz=function() {
    var ids = [];
    var lastLevel=0;
    var lii='';
    var js=window.js_pre+';';
    $.each($('#play > .part'), function(k,v){
        var lvl=parseInt($(v).data('level'));
        var idt=$(v).data('id');
        console.log(lastLevel+'_'+lvl)
        if(lvl>lastLevel){
            lii+=Array(lvl-lastLevel+1).join("{ ")
            js+=Array(lvl-lastLevel+1).join("{")
        }
        if(lvl<lastLevel){
            lii+=Array(lastLevel-lvl+1).join("} ")
            js+=Array(lastLevel-lvl+1).join("}")
        }
        lii += idt+' ';
        console.log("ID: " + idt.replace(/[a-zA-Z]|_[0-9]/, ""));
        js+=window.parts[idt].js+'\n';
        lastLevel=lvl;
        ids.push(idt.replace(/[a-zA-Z]|_[0-9]/, ""));
    });
    lii+=Array(lastLevel+1).join("} ");
    js+=Array(lastLevel+1).join("}");
    js+=';'+window.js_suf;
    $('#serialized').text(lii);
    $('#js_show').val(js_beautify(js));

    ids.sort();
    console.log(ids);
    duplicates = [];
    for(var i = 1; i < ids.length; i++){
        if (ids[i] == ids[i-1]) {
            duplicates.push(ids[i]);
        }
    }
    duplicates.sort();
    $("#warnings").html("");
    if(!duplicates.length == 0){
        console.log("duplicates detected");
        for (var i in duplicates){
            var str = "Das Element " + duplicates[i] + " wird doppelt verwendet</br>";
            $("#warnings").append(str);
        }
    }

    socket.emit('serialized',lii);
    window.serialized=lii
    localStorage.setItem("quizstate_"+quizID, JSON.stringify(window.serialized))
}        




ParsonAPP.doNewDraggable=function() {
    $("#bucket").sortable({connectWith: "#play", receive:function(event, ui){
        $(ui.item).data('level','0');
        ParsonAPP.serializeQuiz();
    }});
    $("#play").sortable({connectWith: "#bucket", stop:ParsonAPP.doLevel, receive:ParsonAPP.doLevel});
}
            
