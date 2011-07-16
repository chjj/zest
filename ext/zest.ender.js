/**
 * Zest support for ender.js
 * https://github.com/ender-js/Ender
 */

// i try not to change the expected functionality here, however,
// these functions seem like they should belong in a dom library,
// not as part of the selector engine binding.
(function() {
  var window = this
    , document = this.document
    , zest = this.zest;

  // remove zest
  delete this.zest;

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