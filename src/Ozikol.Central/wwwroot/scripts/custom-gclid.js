function setCookie(name, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "; expires=" + date.toGMTString();
    document.cookie = name + "=" + value + expires + ";path=/";
}

function readCookie(name) {
    var n = name + '=';
    var cookie = document.cookie.split('; ');
    for (var i = 0; i < cookie.length; i++) {
        var c = cookie[i];
        while (c.charAt(0) == ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(n) == 0) { return c.substring(n.length, c.length); }
    }
    return null;
}

function getParam(p) {
    var match = RegExp('[?&]' + p + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var gclid = getParam('gclid');
if (gclid) {
    var gclsrc = getParam('gclsrc');
    if (!gclsrc || gclsrc.indexOf('aw') !== -1) {
        setCookie('gclid', gclid, 90);
    }
}

window.onload = function () {
    var elem = document.getElementById('gclid_field');
    if (typeof elem !== null && elem !== null && elem !== 'undefined') {
        document.getElementById("gclid_field").value = readCookie('gclid');
    }
}