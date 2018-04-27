socket.on('state', function(a) {
    window.parts = a.parts
    fillParts()
    $('#form_title').val(a.name)
    $('#form_description').val(a.description)
    $('#form_js_input').val(a.js_input)
    $('#form_js_pre').val(a.js_pre)
    $('#form_js_suf').val(a.js_suf)
    $('#disableCollab').prop("checked", (a.disableCollab === true))
    $('#disableJS').prop("checked", (a.disableJS === true))
    $('#hidePuzzle').prop("checked", (a.hidePuzzle === true))
});

var url = window.location.pathname.split('/');
window.qid = false;
if (url[url.length - 1] == 'edit') {
    window.qid = url[url.length - 2]
    socket.emit('request', window.qid)
}
if (url[url.length - 1] == 'duplicate') {
    socket.emit('request', url[url.length - 2])
}

function fillParts() {
    var k = 0;
    for (var i in window.parts) {
        $('.form_id').eq(k).val(i)
        $('.form_name').eq(k).val(window.parts[i].name)
        $('.form_js').eq(k).val(window.parts[i].js)
        checkAppend();
        k++
    }
}
jQuery.fn.extend({
    autoHeight: function() {
        function autoHeight_(element) {
            return jQuery(element)
                .css({
                    'height': 'auto',
                    'overflow-y': 'hidden'
                })
                .height(element.scrollHeight);
        }
        return this.each(function() {
            autoHeight_(this).on('input', function() {
                autoHeight_(this);
            });
        });
    }
});

$(function(){
    $("#parts_table > tbody").sortable({
        items: ".form_row:not(:last-child)",
        handle: '.btn_move',
        cancel: 'input,textarea,button:not(.btn_move),select,option'
        
    });
});

function checkAppend() {
    var empty = false;
    $.each($(".form_row"), function(k, v) {
        if ($(v).find('.form_id').first().val() == '' &&
            $(v).find('.form_name').first().val() == ''
        )
            empty = true;
    });
    if (!empty) {
        var html = $(".form_row:first").get(0).outerHTML
        $(".form_row:last").after(html);
    }
}

function duplicateRow(row) {
    var html = $(row).get(0).outerHTML
    var added = $(html).insertAfter(row);
    var oldID = $(row).find('.form_id').first().val()

    var newID = oldID.replace(/[a-z]/gi, function(x) {
        var cc = x.charCodeAt()
        if (cc >= 65 && cc <= 90)
            cc = ((cc - 65) + 1) % 26 + 65
        if (cc >= 97 && cc <= 122)
            cc = ((cc - 97) + 1) % 26 + 97
        return String.fromCharCode(cc)
    });
    var oldName = $(row).find('.form_name').first().val()
    var oldJS = $(row).find('.form_js').first().val()
    $(added).find('.form_id').first().val(newID)
    $(added).find('.form_name').first().val(oldName)
    $(added).find('.form_js').first().val(oldJS)
}

$(document).ready(function() {
    $('textarea').autoHeight();
    $("body").on('input', '.form_id, .form_name', checkAppend);
    $("#single-tab").on('click', function(e) {
        areaToSingle();
    });
    $("#multiple-tab").on('click', function(e) {
        singleToArea();
    });
    $("#form_duplicate_all").on('click', function(e) {
        $.each($('.form_row:not(:last)'), function(k, v) {
            duplicateRow(v);
        });
    });
    $("#form_sort").on('click', function(e) {
        var sortedArray = $(".form_row:not(:last)").get().sort(function(aElm, bElm) {
            /* What a nice implementation! Wow. Thanks to https://stackoverflow.com/a/15479354/1154316 */
            var a=$(aElm).find(".form_id").val()
            var b=$(bElm).find(".form_id").val()
            var ax = [], bx = [];

            a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
            b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
    
            while(ax.length && bx.length) {
                var an = ax.shift();
                var bn = bx.shift();
                var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
                if(nn) return nn;
            }

            return ax.length - bx.length;
        });
        $(".form_row:not(:last)").remove()
        $(sortedArray).prependTo("#parts_table > tbody");
    });
    $("body").on('click', '.form_delete', function(e) {
        $(this).closest('.form_row').remove();
    });
    $("body").on('click', '.form_duplicate', function(e) {
        var row = $(this).closest('.form_row');
        duplicateRow(row);
    });
    $("#form_shuffle").on('click', function(e) {
        if (url[url.length - 1] == 'edit') {
            if (!window.confirm("Achtung! Wenn Nutzer das Quiz schon mal bearbeitet haben, macht das 'mischen' ihre Lösung komplett kaputt, da die IDs neu zu Codezeilen zugeordnet werden. Trotzdem mischen?"))
                return false;
        }
        var $firstCells = $("#parts_table tr td:first-child"),
            $copies = $firstCells.clone(true);

        $copies = $copies.not(":last");

        [].sort.call($copies, function() {
            return Math.random() - 0.5;
        });

        $copies.each(function(i) {
            $firstCells.eq(i).replaceWith(this);
        });
        e.preventDefault();
        return false;
    });
    $("#form_add").on('click', function(e) {
        if ($('#form_codearea').val().trim() != '') {
            areaToSingle()
        }
        var len = $(".form_row").length
        var parts = {};
        var i = 0;
        while (i < len - 1) {
            key = $('.form_id').eq(i).val().trim()
            val = {
                'name': $('.form_name').eq(i).val().trim(),
                'js': $('.form_js').eq(i).val().trim()
            }
            if (key != '' || val != '')
                parts[key] = val
            i++
        }
        var quiz = {
            qid: window.qid,
            name: $('#form_title').val(),
            description: $('#form_description').val(),
            parts: parts,
            password: $('#form_password').val(),
            js_input: $('#form_js_input').val(),
            js_pre: $('#form_js_pre').val(),
            js_suf: $('#form_js_suf').val(),
            disableCollab: $('#disableCollab').is(':checked'),
            disableJS: $('#disableJS').is(':checked'),
            hidePuzzle: $('#hidePuzzle').is(':checked')
        };
        if ($('#deletePuzzle').is(':checked')) {
            socket.emit('delete', quiz);
        } else {
            socket.emit((window.qid == false ? 'new' : 'edit'), quiz);
        }
        e.preventDefault();
        return false;
    });
});

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function areaToSingle() {
    var arrays = $('#form_codearea').val().split("\n")
    if ($('#shuffleArr').is(':checked'))
        shuffleArray(arrays);
    var i = 0;
    for (var k in arrays) {
        var val = arrays[k].trim();
        if (val == '') continue
        vals = val.split('|');
        if (vals.length > 1) {
            $('.form_name').eq(i).val(vals[1])
            $('.form_id').eq(i).val(vals[0])
            if (vals.length > 2) {
                $('.form_js').eq(i).val(vals[2])
            }
        } else {
            $('.form_name').eq(i).val(arrays[k].trim())
            $('.form_id').eq(i).val('' + (parseInt(i) + 1) + 'A')
        }
        checkAppend()
        i++;
    }
    console.log($(".form_row").length + "   " + i);
    while (i < $(".form_row").length - 1) {
        $(".form_row").eq(i).remove();
        i++;
    }
    $('#form_codearea').val('');
}

function singleToArea() {
    var len = $(".form_row").length
    var i = 0;
    var input = "";
    while (i < len - 1) {
        console.log($('.form_id').eq(i).val());
        var key = $('.form_id').eq(i).val() || "";
        var name = $('.form_name').eq(i).val() || "";
        var js = $('.form_js').eq(i).val() || "";
        input += key + "|" + name + "|" + js + "\n";
        i++
    }

    $('#form_codearea').val(input);
}