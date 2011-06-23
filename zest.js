// Zest - a css selector engine
// (c) Copyright 2011, Christopher Jeffrey (MIT Licensed)
(function() {
var window = this, 
    doc = this.document, 
    context, cache = {};

// ========== RULES ========== //
// we scan and slice in reverse
var rules = [
  ['SIMPLE', /(?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*$/], 
  ['CHILD', /\s*>\s*$/],
  ['ADJACENT', /\s*\+\s*$/],
  ['GENERAL', /\s*~\s*$/],
  ['DESCENDANT', /\s+$/]
];

// ========== HELPERS ========== //
// dom traversal
var next = function(el) {
  while (el = el.nextSibling) if (el.nodeType === 1) break;
  return el;
};
var prev = function(el) {
  while (el = el.previousSibling) if (el.nodeType === 1) break;
  return el;
};
var child = function(el) {
  el = el.firstChild;
  if (el && el.nodeType !== 1) el = next(el);
  return el;
};

// parse `nth` expressions
var nth = function(param) {
  var $ = param
    .replace('odd', '2n+1').replace('even', '2n+0')
    .replace(/\s+/g, '').replace(/^\+?(\d+)$/, '0n+$1')
    .replace(/^-(\d+)$/, '0n-$1')
    .match(/^([+-])?(\d+)?n([+-])?(\d+)?$/);
  return { 
    group: $[1] === '-' ? -($[2] || 1) : +($[2] || 1), 
    off: $[3] ? ($[3] === '-' ? -$[4] : +$[4]) : 0 
  };
};

var unquote = function(s, c) {
  return (c = s && s[0]) && (c === '"' || c === '\'') ? s.slice(1, -1) : s;
};

// ========== SIMPLE SELECTORS ========== //
// note: for type and child selectors, in order to 
// conform, the root element must never be considered.
var selector = {
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
    var func = attribute[op];
    return function(el) {
      return func(el.getAttribute(key), val);
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
      var d, i = 0, rel = child(el.parentNode);
      while (rel) {
        i++;
        if (rel === el) {
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
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
      do {
        if (el.lang) {
          return el.lang === param;
        }
      } while (el = el.parentNode);
    };
  },
  ':empty': function(el) {
    return !el.firstChild;
  },
  ':not': function(param) {
    var test = parse(param);
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
      var type = el.nodeName, t;
      var d, i = 0, rel = child(el.parentNode);
      while (rel) {
        if (rel.nodeName === type) i++;
        if (rel === el) { 
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
        }
        rel = next(rel);
      }
    };
  },
  ':only-of-type': function(el) {
    return selector[':first-of-type'](el) 
            && selector[':last-of-type'](el);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !selector[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled;
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === window.location.hash.slice(1);
  }
};

// ========== ATTRIBUTE OPERATORS ========== //
// dont use any regexes, these should be faster
var attribute = {
  '-': function(attr, val) {
    return attr != null;
  },
  '=': function(attr, val) {
    return attr === val;
  },
  '*=': function(attr, val) {
    return (attr || '').indexOf(val) !== -1;
  },
  '~=': function(attr, val) {
    var i = (attr || (attr = '')).indexOf(val);
    if (i === -1) return;
    var f = attr[i - 1], l = attr[i + val.length];
    return (f === ' ' && !l) || (l === ' ' && !f) || (!f && !l);
  },
  '|=': function(attr, val) {
    var i = (attr || '').indexOf(val);
    if (i === -1) return;
    var l = attr[i + val.length];
    return l === '-' || !l;
  },
  '^=': function(attr, val) {
    return (attr || '').indexOf(val) === 0;
  },
  '$=': function(attr, val) {
    return attr.length === (attr.indexOf(val) + val.length);
  }
};

// ========== COMBINATOR LOGIC ========== //
var combinator = {
  'CHILD': function(test) {
    return function(el) { 
      return test(el = el.parentNode) && el;
    };
  },
  'ADJACENT': function(test) {
    return function(el) { 
      return test(el = prev(el)) && el;
    };
  },
  'GENERAL': function(test) { 
    return function(el) { 
      while (el = prev(el)) {
        if (test(el)) return el;
      }
    };
  },
  'DESCENDANT': function(test) { 
    return function(el) { 
      while (el = el.parentNode) {
        if (test(el)) return el;
      }
    };
  },
  'NONE': function(test) {
    return function(el) {
      return test(el) && el;
    };
  }
};

// ========== PARSING ========== //
// parse selector selectors and return a `test`
var parse = function(sel) {
  if (typeof sel !== 'string') {
    if (sel.length > 1) {
      var func = [], i = 0, l = sel.length;
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
    // just one - that means it's a type or universal
    return sel[0] === '*' ? selector['*'] : selector.type(sel[0]);
  }
  
  var cap, param;
  switch (sel[0]) {
    case '.': return selector.attr('class', '~=', sel.slice(1));
    case '#': return selector.attr('id', '=', sel.slice(1));
    case '[': cap = sel.match(/^\[([\w-]+)(?:([^\w]?=)([^\]]+))?\]/);
              return selector.attr(cap[1], cap[2] || '-', unquote(cap[3]));
    case ':': cap = sel.match(/^(:[\w-]+)\(([^)]+)\)/);
              if (cap) sel = cap[1], param = unquote(cap[2]); 
              return param ? selector[sel](param) : selector[sel];
    default:  return sel === '*' ? selector[sel] : selector.type(sel);
  }
};

// tokenize the selector, return a compiled array of `test` 
// functions - this is faster than returning tokens
var compile = function(sel) {
  var func = [], comb = combinator.NONE, 
      name, i, rule, cap;
  while (sel.length) { 
    for (i = 0; rule = rules[i++];) {
      if (cap = sel.match(rule[1])) { 
        sel = sel.slice(0, -cap[0].length);
        // faster than comparing strings
        if (i === 1) { 
          cap = cap[0].split(/(?=[\[:.#])/);
          if (!name) name = cap[0];
          func.push(comb(parse(cap)));
        } else {
          comb = combinator[rule[0]];
          break;
        }
      }
    }
    if (!cap) break;
  }
  func = make(func);
  func.first = name;
  return func;
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
  
  var i = 0, res = [], 
      test, scope, el;
  
  // trim and add implicit universal selectors
  sel = sel.replace(/^\s+|\s+$/g, '')
           .replace(/(^|\s)(:|\[|\.|#)/g, '$1*$2');
  
  test = cache[sel] || (cache[sel] = compile(sel));
  scope = context.getElementsByTagName(test.first); 
  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
  return res;
};

// ========== COMPATIBILITY ========== //
exec = (function() {
  var wrapped = exec;
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
        return wrapped(sel);
      }
    };
  } else {
    return function(sel) {
      if (!~sel.indexOf(' ')) {
        if (sel[0] === '#' && /^#\w+$/.test(sel)) {
          return [context.getElementById(sel.slice(1))];
        }
        if (sel[0] === '.' && /^\.\w+$/.test(sel)) try {
          return slice.call(context.getElementsByClassName(sel.slice(1)));
        } catch(e) {}
        if (/^\w+$/.test(sel)) {
          return slice.call(context.getElementsByTagName(sel));
        }
      }
      return wrapped(sel);
    };
  }
})();

if (function() {
  var el = doc.createElement('div');
  el.appendChild(doc.createComment('')); 
  return !!el.getElementsByTagName('*')[0];
}()) {
  selector['*'] = function(el) {
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

zest.selectors = selector;
zest.attributes = attribute;
zest.combinators = combinator;
zest.rules = rules;

// expose
this.zest = zest;

}).call(this);