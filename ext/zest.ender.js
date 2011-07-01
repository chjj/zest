// Zest support for ender.js
// https://github.com/ender-js/Ender

// i try not to change the expected functionality here, however,
// these functions seem like they should belong in a dom library,
// not as part of the selector engine binding.
(function() {
  var zest = this.zest;
  delete this.zest;
  $._select = function(str, con) {
    if (/^\s*</.test(str)) {
      var out = [], d = (con || document).createElement('div');
      d.innerHTML = str;
      d = d.firstChild;
      while (d) {
        if (d.nodeType === 1) out.push(d);
        d = d.nextSibling;
      }
      return out;
    }
    return zest(str, con);
  };
  $.ender(function() {
    var includes = function(obj, el) {
      var i = obj.length;
      while (i--) if (obj[i] === el) return true;
    };
    return {
      find: function(sel) {
        var res = []
          , i = this.length
          , r, k;
        while (i--) {
          r = zest(sel, this[i]), k = r.length;
          while (k--) {
            if (!includes(res, r[k])) res.push(r[k]);
          }
        }
        return $(res);
      }
    };
  }());
}).call(this);