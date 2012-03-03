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

;(function() {
  var zest = this.zest.noConflict()
    , document = this.document;

  $._select = function(str, context) {
    context = context || document;

    if (/^\s*</.test(str)) {
      context = context.nodeType !== 9
        ? context.ownerDocument
        : context;

      var el = context.createElement('div')
        , out = [];

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

  var has = function(obj, el) {
    var i = obj.length;
    while (i--) {
      if (obj[i] === el) return true;
    }
  };

  $.ender({
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
  });
}).call(this);
