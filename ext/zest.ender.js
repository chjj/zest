/**
 * zest.js support for ender.js
 *
 * zest.js
 * Copyright (c) 2011-2012, Christopher Jeffrey
 * https://github.com/chjj/zest
 *
 * ender.js
 * copyright @ded and @fat
 * https://github.com/ender-js
 */

// I try not to change the expected functionality here, however,
// these functions seem like they should belong in a dom library,
// not as part of the selector engine binding.

;(function() {
  var window = this
    , document = this.document
    , zest = this.zest.noConflict();

  $._select = function(str, context) {
    context = context || document;
    if (/^\s*</.test(str)) {
      context = context.nodeType === 9
              ? context : context.ownerDocument;

      var out = []
        , el = context.createElement('div');

      el.innerHTML = str;
      el = el.firstChild;
      while (el) {
        if (el.nodeType === 1) out.push(el);
        el = el.nextSibling;
      }

      return out;
    }
    return zest(str, context);
  };

  $.ender(function() {
    var has = function(obj, el) {
      var i = obj.length;
      while (i--) {
        if (obj[i] === el) return true;
      }
    };
    return {
      find: function(sel) {
        var res = []
          , i = this.length
          , r
          , k;

        while (i--) {
          r = zest(sel, this[i]);
          k = r.length;
          while (k--) {
            if (!has(res, r[k])) res.push(r[k]);
          }
        }
        return $(res);
      }
    };
  }());
}).call(this);
