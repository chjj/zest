// Zest - a css selector engine
// (c) Copyright 2011, Christopher Jeffrey (MIT Licensed)
(function() {
var context, cache = {};

// ========== RULES ========== //
// the scanner will scan and slice in reverse
var rules = [
  ['ELEMENT', /(?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*$/], 
  ['CHILD_COMBINATOR', /\s*>\s*$/],
  ['ADJACENT_SIBLING', /\s*\+\s*$/],
  ['GENERAL_SIBLING', /\s*~\s*$/],
  ['DESCENDANT_COMBINATOR', /\s+$/]
];

// ========== HELPERS ========== //
var _next = function(el) {
  while (el = el.nextSibling) {
    if (el.nodeType === 1) break;
  }
  return el;
};

var _prev = function(el) {
  while (el = el.previousSibling) {
    if (el.nodeType === 1) break;
  }
  return el;
};

var _child = function(el) {
  el = el.firstChild;
  if (el && el.nodeType !== 1) el = _next(el);
  return el;
};

// parse `nth` expressions
var nth = function(param) {
  param = param
    .replace('odd', '2n+1').replace('even', '2n+0')
    .replace(/\s+/g, '').replace(/^\+?(\d+)$/, '0n+$1')
    .replace(/^-(\d+)$/, '0n-$1');
  var m = param.match(/^([+-])?(\d+)?n([+-])?(\d+)?$/),
      group = (m[1] === '-') ? -(m[2] || 1) : +(m[2] || 1), 
      off = m[3] ? (m[3] === '-') ? -m[4] : +m[4] : 0;
  return { group: group, off: off };
};

// ========== SIMPLE SELECTORS ========== //
// note: for type and child selectors, in order to 
// conform, the root element must never be considered.
var _simple = {
  '*': function() {
    return true;
  },
  'name': function(name) {
    name = name.toLowerCase(); 
    return function(el) {
      return el.nodeName.toLowerCase() === name; 
    };
  },
  'attr': function(reg, attr) {
    return function(el) {
      return reg.test(el.getAttribute(attr) || '');
    };
  },
  ':first-child': function(el) {
    return !_prev(el) && el.parentNode !== context;
  },
  ':last-child': function(el) {
    return !_next(el) && el.parentNode !== context;
  },
  ':nth-child': function(p) {
    p = nth(p);
    return function(el) {
      if (el.parentNode === context) return;
      var d, i = 0, rel = _child(el.parentNode);
      while (rel) {
        i++;
        if (rel === el) {
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
        }
        rel = _next(rel);
      }
    };
  },
  ':only-child': function(el) {
    return (!_prev(el) && !_next(el)) && el.parentNode !== context;
  },
  ':root': function(el) {
    return el.ownerDocument.documentElement === el;
  },
  ':lang': function(param) {
    return function(el) {
      do {
        if (el.lang === param) return true;
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
    while (el = _prev(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':last-of-type': function(el) {
    if (el.parentNode === context) return;
    var type = el.nodeName;
    while (el = _next(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':nth-of-type': function(p) {
    p = nth(p);
    return function(el) {
      if (el.parentNode === context) return;
      var type = el.nodeName, t;
      var d, i = 0, rel = _child(el.parentNode);
      while (rel) {
        if (rel.nodeName === type) i++;
        if (rel === el) { 
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
        }
        rel = _next(rel);
      }
    };
  },
  ':only-of-type': function(el) {
    return _simple[':first-of-type'](el) 
      && _simple[':last-of-type'](el);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !_simple[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled;
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === location.hash.slice(1);
  }
};

// ========== COMBINATOR LOGIC ========== //
var _combinator = {
  'CHILD_COMBINATOR': function(test) {
    return function(el) { 
      return test(el = el.parentNode) && el;
    };
  },
  'ADJACENT_SIBLING': function(test) {
    return function(el) { 
      return test(el = _prev(el)) && el;
    };
  },
  'GENERAL_SIBLING': function(test) { 
    return function(el) { 
      while (el = _prev(el)) {
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
      // its a name
      return _simple[sel[0]] || _simple.name(sel[0]);
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
      return param ? _simple[sel](param) : _simple[sel];
    default: // name
      return _simple[sel] || _simple.name(sel);
  }
  
  val = val.replace(/^['"]|['"]$/g, ''); // should probably escape regex here
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
  return _simple.attr(reg, attr);
};

// tokenize the selector, return a compiled array of `test` 
// functions - this is faster than returning tokens
var compile = function(sel) {
  var func = [], comb = _combinator.NONE, name, i, rule, cap;
  while (sel.length) { 
    for (i = 0; rule = rules[i++];) {
      if (cap = sel.match(rule[1])) { 
        sel = sel.slice(0, -cap[0].length);
        if (rule[0] === 'ELEMENT') {
          cap = cap[0].split(/(?=[\[:.#])/);
          if (!name) name = cap[0];
          func.push(comb(parse(cap)));
          //continue;
        } else {
          comb = _combinator[rule[0]];
          break; 
        }
      }
    }
    //if (!cap) break;
  }
  func = make(func);
  func.first = name;
  return func;
};

var make = function(func) {
  return function (el) {
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
      res = res.concat(exec(sel[i++], context));
    }
    return res;
  }
  
  // trim
  sel = sel.replace(/^\s+|\s+$/g, '');
  
  // add implicit universal selectors
  sel = sel.replace(/(^|\s)(:|\[|\.|#)/g, '$1*$2');
  
  test = cache[sel] || (cache[sel] = compile(sel));
  scope = context.getElementsByTagName(test.first); // move to compile?
  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
  return res;
};

// ========== COMPATIBILITY ========== //
var _exec = exec;

var slice = (function() {
  try {
    Array.prototype.slice.call(document.getElementsByTagName('*'));
    return function(obj) {
      return Array.prototype.slice.call(obj);
    };
  } catch(e) { 
    e = null; // gc wont clean this up
    return function(obj) {
      var a = [], i = 0, l = obj.length;
      for (; i < l; i++) a.push(obj[i]);
      return a;
    };
  }
})();

if (document.querySelectorAll) {
  exec = function(sel) {
    try {
      return slice(context.querySelectorAll(sel));
    } catch(e) {
      return _exec(sel);
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
    return _exec(sel);
  };
}

if (function() {
  var d = document.createElement('div');
  d.appendChild(document.createComment('')); 
  return !!d.getElementsByTagName('*')[0];
}()) {
  _simple['*'] = function(el) {
    if (el.nodeType === 1) return true;
  };
}

// ========== ZEST ========== //
// wrap in a try/catch
var zest = function zest(sel, con) {
  context = con || document;
  try {
    return exec(sel);
  } catch(e) {
    if (typeof console !== 'undefined') {
      console.log(e.stack || e + '');
    }
    return [];
  }
};

zest.selectors = _simple;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = zest;
} else {
  this.zest = zest;
}
}).call(this);