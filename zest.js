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

// ========== COMPATIBILITY ========== //
var qsa = document.querySelectorAll && (function() {
  try {
    document.querySelectorAll(':root');
    return true;
  } catch(e) {
    return e && /:emp|:roo|:not|:nth|:las|:onl|of-|:ena|:dis|:che|:ind|\|=|\|/;
  }
})();

var slice = (function() {
  try {
    Array.prototype.slice.call(document.getElementsByTagName('*'));
    return function(obj) {
      return Array.prototype.slice.call(obj);
    };
  } catch(e) { e = undefined; // gc wont clean this up
    return function(obj) {
      var a = [], i = obj.length;
      while (i--) a[i] = obj[i];
      return a;
    };
  }
})();

var comments = (function() {
  var d = document.createElement('div');
  d.appendChild(document.createComment('')); 
  return !!d.getElementsByTagName('*')[0];
})();

// ========== SIMPLE SELECTORS ========== //
var _simples = {
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
      if (rel) do {
        i++;
        if (rel === el) {
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
        }
      } while(rel = _next(rel));
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
      if (rel) do {
        if (rel.nodeName === type) i++;
        if (rel === el) { 
          d = p.off - i;
          return !p.group ? !d : !(d % p.group);
        }
      } while(rel = _next(rel));
    };
  },
  ':only-of-type': function(el) {
    return _simples[':first-of-type'](el) 
      && _simples[':last-of-type'](el);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !_simples[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled;
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === location.hash.slice(1);
  },
  //':subject': function(el) {
  //  subject = el;
  //  return true;
  //},
  'name': function(name) {
    name = name.toLowerCase(); 
    return function(el) {
      return (el.nodeName.toLowerCase() === name || name === '*'); 
    };
  },
  'attr': function(reg, attr) {
    return function(el) {
      return reg.test(el.getAttribute(attr) || '');
    };
  }
};

// ========== COMBINATOR LOGIC ========== //
var _combinators = {
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
  var attr, op, val, m, reg, param;
  
  if (typeof sel !== 'string') {
    if (sel.length > 1) {
      var func = [], i = 0, l = sel.length;
      for (; i < l; i++) {
        if (!sel[i]) continue;
        func.push(parse(sel[i]));
      }
      l = func.length;
      return function(el) {
        for (i = 0; i < l; i++) {
          if (!func[i](el)) return;
        }
        return el;
      };
    } else {
      // its a name
      return _simples.name(sel[0]);
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
      m = sel.match(/^\[([\w-]+)(?:(=|~=|\^=|\$=|\|=)([^\]]+))?\]/);
      attr = m[1], op = m[2] || '=', val = m[3] || '.+';
      break;
    case ':':
      param = sel.match(/^(:[\w-]+)\(([^)]+)\)/);
      if (param) sel = param[1], param = param[2].replace(/^['"]|['"]$/g, '');
      return param ? _simples[sel](param) : _simples[sel];
    default: // name
      return _simples.name(sel);
  }
  val = val.replace(/^['"]|['"]$/g, '');
  switch (op) {
    case '=':  reg = new RegExp('^' + val + '$');
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
  return _simples.attr(reg, attr);
};

// tokenize the selector, return an array of `test` functions
// returning functions is faster than returning tokens
var compile = function(sel) {
  var func = [], comb = _combinators.NONE, name, i, rule;
  while (sel.length) { //for (;;) {
    i = 0;
    while (rule = rules[i++]) {
      if (cap = sel.match(rule[1])) { 
        sel = sel.slice(0, -cap[0].length);
        if (rule[0] === 'ELEMENT') {
          cap = cap[0].split(/(?=[\[:.#])/);
          if (!name) name = cap[0];
          func.push(comb(parse(cap))); 
        } else {
          comb = _combinators[rule[0]];
          break;
        }
      }
    }
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
var exec = function(sel, con) {
  var i = 0, res = [];
  context = con || document;
  
  if (false && qsa && (qsa === true || !qsa.test(sel))) {
    return slice(context.querySelectorAll(sel));
  }
  
  // split up groups
  if (~sel.indexOf(',')) {
    sel = sel.split(/,(?![^\[]*["'])/);
    while (i < sel.length) {
      res = res.concat(exec(sel[i++], context));
    }
    // this array should be "uniquified", 
    // but it would kill performance
    return res;
  }
  
  // trim
  sel = sel.replace(/^\s+|\s+$/g, '');
  
  if (false && !~sel.indexOf(' ')) {
    if (/^(\w+|\*)$/.test(sel)) {
      return slice(context.getElementsByTagName(sel));
    }
    if (/^#\w+$/.test(sel)) {
      return [context.getElementById(sel.slice(1))];
    }
    if (/^\.\w+$/.test(sel)) try {
        return slice(context.getElementsByClassName(sel.slice(1)));
    } catch(e) {}
  }
  
  // add implicit `any` selectors: e.g. :first-child becomes *:first-child
  sel = sel.replace(/(^|\s)(:|\[|\.|#)/g, '$1*$2');
  
  var k = 0, el, test = cache[sel] || (cache[sel] = compile(sel)),
      scope = context.getElementsByTagName(test.first);
  if (comments && test.first === '*') {
    while (el = scope[i++]) {
      if (el.nodeType === 8) continue;
      if (test(el)) res[k++] = el;
    }
  } else {
    while (el = scope[i++]) if (test(el)) res[k++] = el;
  }
  return res;
};

// wrap in a try/catch
var zest = function zest(sel, context) {
  try {
    return exec(sel, context);
  } catch(e) {
    if (console) console.log(e.stack || e + '');
    return [];
  }
};

zest.selectors = _simples;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = zest;
} else {
  this.zest = zest;
}
}).call(this);