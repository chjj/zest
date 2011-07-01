// Zest - a css selector engine
// (c) Copyright 2011, Christopher Jeffrey (MIT Licensed)
(function() {
var window = this
  , doc = this.document
  , context;

// ========== HELPERS ========== //
// dom traversal
var next = function(el) {
  while ((el = el.nextSibling) && el.nodeType !== 1);
  return el;
};
var prev = function(el) {
  while ((el = el.previousSibling) && el.nodeType !== 1);
  return el;
};
var child = function(el) {
  if (el = el.firstChild) {
    while (el.nodeType !== 1 && (el = el.nextSibling));
  }
  return el;
};

// parse `nth` expressions
var nth = function($) {
  $ = $.replace(/\s+/g, '');
  if ($ === 'even') $ = '2n+0';
  else if ($ === 'odd') $ = '2n+1';
  else if (!~$.indexOf('n')) $ = '0n' + $;
  $ = /^([+-])?(\d+)?n([+-])?(\d+)?$/.exec($);
  return {
    group: $[1] === '-' ? -($[2] || 1) : +($[2] || 1),
    offset: $[4] ? ($[3] === '-' ? -$[4] : +$[4]) : 0
  };
};

var unquote = function(s, c) {
  return (c = s && s[0]) && (c === '"' || c === '\'') ? s.slice(1, -1) : s;
};

// ========== SIMPLE SELECTORS ========== //
// note: for type and child selectors, in order to
// conform, the root element must never be considered.
var selectors = {
  '*': function() {
    return true;
  },
  'type': function(type) {
    type = type.toLowerCase();
    return function(el) {
      return el.nodeName.toLowerCase() === type;
    };
  },
  'attr': function(key, op, val) {
    var func = operators[op];
    return function(el) {
      var attr = el[key] != null ? el[key] : el.getAttribute(key);
      return attr != null && func(attr + '', val);
    };
  },
  ':first-child': function(el) {
    return !prev(el) && el.parentNode !== context;
  },
  ':last-child': function(el) {
    return !next(el) && el.parentNode !== context;
  },
  ':nth-child': function(p) {
    p = nth(p);
    return function(el) {
      if (el.parentNode === context) return;
      var diff, pos = 0
        , rel = child(el.parentNode);
      while (rel) {
        pos++;
        if (rel === el) {
          diff = pos - p.offset;
          return !p.group ? !diff : !(diff % p.group);
        }
        rel = next(rel);
      }
    };
  },
  ':only-child': function(el) {
    return (!prev(el) && !next(el)) && el.parentNode !== context;
  },
  ':root': function(el) {
    return el.ownerDocument.documentElement === el;
  },
  ':lang': function(param) {
    return function(el) {
      while (el) {
        if (el.lang) return el.lang.indexOf(param) === 0;
        el = el.parentNode;
      }
    };
  },
  ':empty': function(el) {
    return !el.firstChild;
  },
  ':not': function(sel) {
    var test = compile(sel);
    return function(el) {
      return !test(el);
    };
  },
  ':first-of-type': function(el) {
    if (el.parentNode === context) return;
    var type = el.nodeName;
    while (el = prev(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':last-of-type': function(el) {
    if (el.parentNode === context) return;
    var type = el.nodeName;
    while (el = next(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':nth-of-type': function(p) {
    p = nth(p);
    return function(el) {
      if (el.parentNode === context) return;
      var type = el.nodeName
        , diff, pos = 0
        , rel = child(el.parentNode);
      while (rel) {
        if (rel.nodeName === type) pos++;
        if (rel === el) {
          diff = pos - p.offset;
          return !p.group ? !diff : !(diff % p.group);
        }
        rel = next(rel);
      }
    };
  },
  ':only-of-type': function(el) {
    return selectors[':first-of-type'](el)
            && selectors[':last-of-type'](el);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !selectors[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled;
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === window.location.hash.substring(1);
  }
};

// ========== ATTRIBUTE OPERATORS ========== //
// dont use any regexes, these should be faster
var operators = {
  '-': function() {
    return true;
  },
  '=': function(attr, val) {
    return attr === val;
  },
  '*=': function(attr, val) {
    return attr.indexOf(val) !== -1;
  },
  '~=': function(attr, val) {
    var i = attr.indexOf(val);
    if (i === -1) return;
    var f = attr[i - 1], l = attr[i + val.length];
    return (f === ' ' && !l) || (!f && l === ' ') || (!f && !l);
  },
  '|=': function(attr, val) {
    var i = attr.indexOf(val);
    if (i !== 0) return;
    var l = attr[i + val.length];
    return l === '-' || !l;
  },
  '^=': function(attr, val) {
    return attr.indexOf(val) === 0;
  },
  '$=': function(attr, val) {
    return (attr.indexOf(val) + val.length) === attr.length;
  }
};

// ========== COMBINATOR LOGIC ========== //
var combinators = {
  ' ': function(test) {
    return function(el) {
      while (el = el.parentNode) {
        if (test(el)) return el;
      }
    };
  },
  '>': function(test) {
    return function(el) {
      return test(el = el.parentNode) && el;
    };
  },
  '+': function(test) {
    return function(el) {
      return test(el = prev(el)) && el;
    };
  },
  '~': function(test) {
    return function(el) {
      while (el = prev(el)) {
        if (test(el)) return el;
      }
    };
  },
  'noop': function(test) {
    return function(el) {
      return test(el) && el;
    };
  }
};

// ========== PARSING ========== //
// parse simple selectors, return a `test`
var parse = function(sel) {
  var cap, param;

  if (typeof sel !== 'string') {
    if (sel.length > 1) {
      var func = []
        , i = 0
        , l = sel.length;
      for (; i < l; i++) {
        func.push(parse(sel[i]));
      }
      l = func.length;
      return function(el) {
        for (i = 0; i < l; i++) {
          if (!func[i](el)) return;
        }
        return true;
      };
    }
    // optimization: shortcut
    return sel[0] === '*' ? selectors['*'] : selectors.type(sel[0]);
  }

  switch (sel[0]) {
    case '.': return selectors.attr('class', '~=', sel.substring(1));
    case '#': return selectors.attr('id', '=', sel.substring(1));
    case '[': cap = /^\[([\w-]+)(?:([^\w]?=)([^\]]+))?\]/.exec(sel);
              return selectors.attr(cap[1], cap[2] || '-', unquote(cap[3]));
    case ':': cap = /^(:[\w-]+)\(([^)]+)\)/.exec(sel);
              if (cap) sel = cap[1], param = unquote(cap[2]);
              return param ? selectors[sel](param) : selectors[sel];
    case '*': return selectors['*'];
    default:  return selectors.type(sel);
  }
};

// parse and compile the selector
// into a single filter function
var rule = /\s*((?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*)\s*$/
  , implicit = /(^|\s)(:|\[|\.|#)/g
  , simple = /(?=[\[:.#])/;

var compile = function(sel) {
  var filter = []
    , comb = combinators.noop
    , qname, cap, op, len;

  // add implicit universal selectors
  sel = sel.replace(implicit, '$1*$2');

  while (cap = rule.exec(sel)) {
    len = sel.length - cap[0].length;
    cap = cap[1].split(simple);
    if (!qname) qname = cap[0];
    filter.push(comb(parse(cap)));
    if (len) {
      op = sel[len - 1];
      // the problem with the descendant combinator is
      // it's just whitespace, we may have cut it off
      // entirely with the regex. if the combinator
      // doesn't exist, assume it was a whitespace.
      comb = combinators[op] || combinators[op = ' '];
      sel = sel.substring(0, op !== ' ' ? --len : len);
    } else {
      break;
    }
  }

  // compile to a single function
  filter = make(filter);

  // optimize the first qname
  filter.qname = qname;

  return filter;
};

var make = function(func) {
  return function(el) {
    var i = 0, f;
    while (f = func[i++]) {
      if (!(el = f(el))) return;
    }
    return true;
  };
};

// ========== EXECUTION ========== //
var exec = function(sel) {
  // split up groups
  if (~sel.indexOf(',')) {
    var res = [];
    sel = sel.split(/,\s*(?![^\[]*["'])/);
    for (var s = 0, sl = sel.length; s < sl; s++) {
      var cur = exec(sel[s], context);
      for (var c = 0, cl = cur.length; c < cl; c++) {
        var item = cur[c], rl = res.length;
        while (rl-- && res[rl] !== item);
        if (rl === -1) res.push(item);
      }
    }
    return res;
  }

  var i = 0
    , res = []
    , test = compile(sel)
    , scope = context.getElementsByTagName(test.qname)
    , el;

  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
  return res;
};

// ========== COMPATIBILITY ========== //
exec = (function() {
  var _exec = exec;
  var slice = (function() {
    try {
      Array.prototype.slice.call(document.getElementsByTagName('*'));
      return Array.prototype.slice;
    } catch(e) {
      e = null;
      return function() {
        var a = [], i = 0, l = this.length;
        for (; i < l; i++) a.push(this[i]);
        return a;
      };
    }
  })();
  if (doc.querySelectorAll) {
    return function(sel) {
      try {
        return slice.call(context.querySelectorAll(sel));
      } catch(e) {
        return _exec(sel);
      }
    };
  } else {
    return function(sel) {
      if (!~sel.indexOf(' ')) {
        if (sel[0] === '#' && /^#\w+$/.test(sel)) {
          return [context.getElementById(sel.substring(1))];
        }
        if (sel[0] === '.' && /^\.\w+$/.test(sel)) try {
          return slice.call(context.getElementsByClassName(sel.substring(1)));
        } catch(e) {}
        if (/^\w+$/.test(sel)) {
          return slice.call(context.getElementsByTagName(sel));
        }
      }
      return _exec(sel);
    };
  }
})();

// IE includes comments with `*`
if (function() {
  var el = doc.createElement('div');
  el.appendChild(doc.createComment(''));
  return !!el.getElementsByTagName('*')[0];
}()) {
  selectors['*'] = function(el) {
    if (el.nodeType === 1) return true;
  };
}

// ========== ZEST ========== //
var zest = function(sel, con) {
  context = con || doc;
  try {
    return exec(sel);
  } catch(e) {
    if (typeof console !== 'undefined') {
      console.log(e.stack || e + '');
    }
    return [];
  }
};

zest.selectors = selectors;
zest.operators = operators;
zest.combinators = combinators;

zest.compile = compile;
zest.matches = function(el, sel) {
  return !!compile(sel)(el);
};
zest.cache = function() {
  var cache = {}, _compile = compile;
  zest.compile = compile = function(sel) {
    return cache[sel] || (cache[sel] = _compile(sel));
  };
};
// zest.cache();

// expose
this.zest = zest;

}).call(this);