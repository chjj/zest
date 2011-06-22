// Zest - a css selector engine
// (c) Copyright 2011, Christopher Jeffrey (MIT Licensed)
(function() {
var window = this, 
    doc = this.document, 
    context, cache = {};

// ========== RULES ========== //
// the scanner will scan and slice in reverse
var rules = [
  ['SIMPLE_SELECTOR', /(?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*$/], 
  ['CHILD_COMBINATOR', /\s*>\s*$/],
  ['ADJACENT_SIBLING', /\s*\+\s*$/],
  ['GENERAL_SIBLING', /\s*~\s*$/],
  ['DESCENDANT_COMBINATOR', /\s+$/]
];

// ========== HELPERS ========== //
// dom traversal
var next = function(el) {
  while (el = el.nextSibling) {
    if (el.nodeType === 1) break;
  }
  return el;
};
var prev = function(el) {
  while (el = el.previousSibling) {
    if (el.nodeType === 1) break;
  }
  return el;
};
var child = function(el) {
  el = el.firstChild;
  if (el && el.nodeType !== 1) el = next(el);
  return el;
};

// parse `nth` expressions
var nth = function(param) {
  param = param
    .replace('odd', '2n+1').replace('even', '2n+0')
    .replace(/\s+/g, '').replace(/^\+?(\d+)$/, '0n+$1')
    .replace(/^-(\d+)$/, '0n-$1');
  var m = param.match(/^([+-])?(\d+)?n([+-])?(\d+)?$/);
  return { 
    group: m[1] === '-' ? -(m[2] || 1) : +(m[2] || 1), 
    off: m[3] ? (m[3] === '-' ? -m[4] : +m[4]) : 0 
  };
};

// ========== SIMPLE SELECTORS ========== //
// note: for type and child selectors, in order to 
// conform, the root element must never be considered.
var simple = {
  '*': function() {
    return true;
  },
  'type': function(type) {
    type = type.toLowerCase(); 
    return function(el) {
      return el.nodeName.toLowerCase() === type; 
    };
  },
  'attr': function(reg, attr) {
    return function(el) {
      return reg.test(el.getAttribute(attr) || '');
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
    return simple[':first-of-type'](el) 
            && simple[':last-of-type'](el);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !simple[':checked'](el);
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

// ========== COMBINATOR LOGIC ========== //
var combinator = {
  'CHILD_COMBINATOR': function(test) {
    return function(el) { 
      return test(el = el.parentNode) && el;
    };
  },
  'ADJACENT_SIBLING': function(test) {
    return function(el) { 
      return test(el = prev(el)) && el;
    };
  },
  'GENERAL_SIBLING': function(test) { 
    return function(el) { 
      while (el = prev(el)) {
        if (test(el)) return el;
      }
    };
  },
  'DESCENDANT_COMBINATOR': function(test) { 
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
// parse simple selectors and return a `test`
var parse = function(sel) {
  var attr, op, val, cap, reg, param;
  
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
    } else {
      // its `*` or a type selector
      return simple[sel[0]] || simple.type(sel[0]);
    }
  }
  
  switch (sel[0]) {
    case '.': 
      attr = 'class', op = '~=', val = sel.slice(1);
      break;
    case '#': 
      attr = 'id', op = '=', val = sel.slice(1);
      break;
    case '[': 
      cap = sel.match(/^\[([\w-]+)(?:(=|~=|\^=|\$=|\|=)([^\]]+))?\]/);
      attr = cap[1], op = cap[2] || '=', val = cap[3] || '.+';
      break;
    case ':':
      param = sel.match(/^(:[\w-]+)\(([^)]+)\)/);
      if (param) sel = param[1], param = param[2].replace(/^['"]|['"]$/g, '');
      return param ? simple[sel](param) : simple[sel];
    default: // its `*` or a type selector
      return simple[sel] || simple.type(sel);
  }
  
  val = val.replace(/^['"]|['"]$/g, '');
  switch (op) {
    case '=': reg = new RegExp('^' + val + '$');
      break;
    case '*=': reg = new RegExp(val);
      break;
    case '~=': reg = new RegExp('(^|\\s)' + val + '(\\s|$)');
      break;
    case '|=': reg = new RegExp('(^|-)' + val + '(-|$)');
      break;
    case '^=': reg = new RegExp('^' + val);
      break;
    case '$=': reg = new RegExp(val + '$');
      break;
    default: throw new Error('Bad attribute operator.');
  }
  return simple.attr(reg, attr);
};

// tokenize the selector, return a compiled array of `test` 
// functions - this is faster than returning tokens
var compile = function(sel) {
  var func = [], 
      comb = combinator.NONE, 
      name, i, rule, cap;
  while (sel.length) { 
    for (i = 0; rule = rules[i++];) {
      if (cap = sel.match(rule[1])) { 
        sel = sel.slice(0, -cap[0].length);
        // optimization: faster than comparing strings
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
  var i = 0, res = [], el, test, scope;
  
  // split up groups
  if (~sel.indexOf(',')) {
    sel = sel.split(/,\s*(?![^\[]*["'])/);
    while (i < sel.length) {
      var cur = exec(sel[i++], context), cl = cur.length;
      while (cl--) {
        var rl = res.length;
        while (rl-- && res[rl] !== cur[cl]);
        if (res[rl] !== cur[cl]) {
          res.push(cur[cl]);
        }
      }
    }
    return res.reverse();
  }
  
  // trim
  sel = sel.replace(/^\s+|\s+$/g, '');
  
  // add implicit universal selectors
  sel = sel.replace(/(^|\s)(:|\[|\.|#)/g, '$1*$2');
  
  test = cache[sel] || (cache[sel] = compile(sel));
  scope = context.getElementsByTagName(test.first); 
  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
  return res;
};

// ========== COMPATIBILITY ========== //
var slice = (function() {
  try {
    Array.prototype.slice.call(document.getElementsByTagName('*'));
    return function(obj) {
      return Array.prototype.slice.call(obj);
    };
  } catch(e) { 
    e = null; 
    return function(obj) {
      var a = [], i = 0, l = obj.length;
      for (; i < l; i++) a.push(obj[i]);
      return a;
    };
  }
})();

var wrapped = exec;
if (document.querySelectorAll) {
  exec = function(sel) {
    try {
      return slice(context.querySelectorAll(sel));
    } catch(e) {
      return wrapped(sel);
    }
  };
} else {
  exec = function(sel) {
    if (!~sel.indexOf(' ')) {
      if (sel[0] === '#' && /^#\w+$/.test(sel)) {
        return [context.getElementById(sel.slice(1))];
      }
      if (sel[0] === '.' && /^\.\w+$/.test(sel)) try {
        return slice(context.getElementsByClassName(sel.slice(1)));
      } catch(e) {}
      if (/^\w+$/.test(sel)) {
        return slice(context.getElementsByTagName(sel));
      }
    }
    return wrapped(sel);
  };
}

if (function() {
  var el = doc.createElement('div');
  el.appendChild(doc.createComment('')); 
  return !!el.getElementsByTagName('*')[0];
}()) {
  simple['*'] = function(el) {
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

zest.selectors = simple;

// expose
this.zest = zest;

}).call(this);