function render() {
    var bucketParts={};
    var playParts={}
    var unser=window.serialized.split(';')
    level=0;
    for(var k in unser) {
        if(unser[k]=='')
            continue
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
    renderLevel()
}
function renderLevel() {
    $.each($('.part'), function() {
        var lvl=$(this).data('level')
        $(this).css('margin-left',lvl * grid)
    
    });
}