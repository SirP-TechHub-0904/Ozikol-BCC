(function (ythelper) {

    ythelper.thumbnailError = youtubeThumbnailError;
    ythelper.check = youtubeCheck;

    function youtubeThumbnailError(img, caller) {
        //console.debug("yterr: " + img.src + " [" + caller + "]");
        if (img.src.includes('maxresdefault'))
            img.src = img.src.replace('maxresdefault', 'hqdefault');
        else if (img.src.includes('hqdefault'))
        { 
            img.onerror = null;
            img.src = img.src.replace('hqdefault', 'sddefault');
        }
    }

    function youtubeCheck(img, caller) {
        //console.debug("ytc: " + img.src + " [" + caller + "]");
        if (img.naturalHeight == 90)
        { 
            youtubeThumbnailError(img, "check");
        }
    }

    function init() {
        var imgs = document.querySelectorAll('[data-yth=\'true\']');
        for (var i = 0; i < imgs.length; i++) {
            var img = imgs[i];
            img.onload = function () {
                ythelper.check(this, "load");
            };

            img.onerror = function () { ythelper.thumbnailError(this, "err"); };
            ythelper.check(img, "init");
        }

    }

    init();
}(window.ythelper = window.ythelper || {}));