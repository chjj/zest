/**
 * Zest (https://github.com/chjj/zest)
 * A css selector engine.
 * Copyright (c) 2011-2012, Christopher Jeffrey. (MIT Licensed)
 */

;(function() {

/**
 * Shared
 */

var window = this
  , document = this.document
  , old = this.zest
  , subject
  , context;

/**
 * Helpers
 */

var next = function(el) {
  while ((el = el.nextSibling)
         && el.nodeType !== 1);
  return el;
};

var prev = function(el) {
  while ((el = el.previousSibling)
         && el.nodeType !== 1);
  return el;
};

var child = function(el) {
  if (el = el.firstChild) {
    while (el.nodeType !== 1
           && (el = el.nextSibling));
  }
  return el;
};

var unquote = function(str) {
  if (!str) return str;
  var ch = str[0];
  return ch === '"' || ch === '\''
    ? str.slice(1, -1)
    : str;
};

var indexOf = (function() {
  if (Array.prototype.indexOf) {
    return Array.prototype.indexOf;
  }
  return function(obj, item) {
    var i = this.length;
    while (i--) {
      if (this[i] === item) return i;
    }
    return -1;
  };
})();

var makeInside = function(end) {
  var inside = /(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\\["'_]|[^"'_])+/
    , ins = inside.source.replace(/_/g, end);
  return new RegExp(ins);
};

var replace = function(regex, name, val) {
  regex = regex.source;
  regex = regex.replace(name, val.source || val);
  return new RegExp(regex);
};

/**
 * Handle `nth` Selectors
 */

var nth = function(param, test) {
  var $ = param.replace(/\s+/g, '')
    , offset
    , group;

  if ($ === 'even') $ = '2n+0';
  else if ($ === 'odd') $ = '2n+1';
  else if (!~$.indexOf('n')) $ = '0n' + $;

  $ = /^([+-])?(\d+)?n([+-])?(\d+)?$/.exec($);
  group = $[1] === '-' ? -($[2] || 1) : +($[2] || 1);
  offset = $[4] ? ($[3] === '-' ? -$[4] : +$[4]) : 0;
  $ = param = undefined;

  return function(el) {
    if (el.parentNode.nodeType !== 1) return;

    var rel = child(el.parentNode)
      , pos = 0
      , diff;

    while (rel) {
      if (test(rel, el)) pos++;
      if (rel === el) {
        diff = pos - offset;
        return !group ? !diff : !(diff % group);
      }
      rel = next(rel);
    }
  };
};

/**
 * Simple Selectors
 */

var selectors = {
  '*': function() {
    return true;
  },
  'type': function(type) {
    type = type.toLowerCase();
    return function(el) {
      return el && el.nodeName.toLowerCase() === type;
    };
  },
  'attr': function(key, op, val) {
    op = operators[op];
    return function(el) {
      var attr;
      switch (key) {
        case 'for':
          attr = el.htmlFor;
          break;
        case 'class':
          attr = el.className;
          break;
        case 'href':
          attr = el.getAttribute('href', 2);
          break;
        case 'title':
          attr = el.getAttribute('title') || null;
          break;
        case 'id':
          if (!el) break;
          if (el.getAttribute) {
            attr = el.getAttribute('id');
            break;
          }
        default:
          attr = el[key] != null
            ? el[key]
            : el.getAttribute && el.getAttribute(key);
          break;
      }
      return attr != null && op(attr + '', val);
    };
  },
  ':first-child': function(el) {
    return !prev(el) && el.parentNode.nodeType === 1;
  },
  ':last-child': function(el) {
    return !next(el) && el.parentNode.nodeType === 1;
  },
  ':only-child': function(el) {
    return !prev(el) && !next(el)
      && el.parentNode.nodeType === 1;
  },
  ':nth-child': function(param) {
    return nth(param, function() {
      return true;
    });
  },
  ':nth-last-child': function(param) {
  },
  ':root': function(el) {
    return el.ownerDocument.documentElement === el;
  },
  ':empty': function(el) {
    return !el.firstChild;
  },
  ':not': function(sel) {
    var test = compileGroup(sel);
    return function(el) {
      return !test(el);
    };
  },
  ':first-of-type': function(el) {
    if (el.parentNode.nodeType !== 1) return;
    var type = el.nodeName;
    while (el = prev(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':last-of-type': function(el) {
    if (el.parentNode.nodeType !== 1) return;
    var type = el.nodeName;
    while (el = next(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':nth-last-of-type': function(param) {
  },
  ':only-of-type': function(el) {
    return selectors[':first-of-type'](el)
        && selectors[':last-of-type'](el);
  },
  ':nth-of-type': function(param) {
    return nth(param, function(rel, el) {
      return rel.nodeName === el.nodeName;
    });
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !selectors[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled && el.type !== 'hidden';
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === window.location.hash.substring(1);
  },
  ':focus': function(el) {
    return el === el.ownerDocument.activeElement;
  },
  ':matches': function(sel) {
    var test = compileGroup(sel);
    return function(el) {
      return test(el);
    };
  },
  ':nth-match': function(param) {
    var args = param.split(/\s*,\s*/)
      , p = args.pop()
      , test = compileGroup(args.join(','));

    return nth(p, test);
  },
  ':links-here': function(el) {
    return el + '' === window.location + '';
  },
  ':lang': function(param) {
    return function(el) {
      while (el) {
        if (el.lang) return el.lang.indexOf(param) === 0;
        el = el.parentNode;
      }
    };
  },
  ':dir': function(param) {
    return function(el) {
      while (el) {
        if (el.dir) return el.dir === param;
        el = el.parentNode;
      }
    };
  },
  ':scope': function(el) {
    if (context.nodeType === 9) {
      return el === context.documentElement;
    }
    return el === context;
  },
  ':subject': function(el) {
    subject = el;
    return true;
  },
  ':any-link': function(el) {
    return el.nodeName === 'A';
  },
  ':local-link': function(el) {
    return el.href && el.host === window.location.host;
  },
  ':current': function(el) {
  },
  ':past': function(el) {
  },
  ':future': function(el) {
  },
  ':default': function(el) {
  },
  ':valid': function(el) {
  },
  ':invalid': function(el) {
  },
  ':in-range': function(el) {
    return el.value > el.min && el.value <= el.max;
  },
  ':out-of-range': function(el) {
    return !selectors[':in-range'](el);
  },
  ':required': function(el) {
    return !!el.required;
  },
  ':optional': function(el) {
    return !el.required;
  },
  ':read-only': function(){
    var nodeName = el.nodeName;
    return (nodeName !== 'INPUT' && nodeName !== 'TEXTAREA' || el.disabled)
           && el.getAttribute('contenteditable') === null;
  },
  ':read-write': function(el) {
    return selectors[':read-only'](el);
  },
  ':column': function(el) {
    return function() {};
  },
  ':nth-column': function(el) {
    return function() {};
  },
  ':nth-last-column': function(el) {
    return function() {};
  },
};

/**
 * Attribute Operators
 */

var operators = {
  '-': function() {
    return true;
  },
  '=': function(attr, val) {
    return attr === val;
  },
  '!=': function(attr, val) {
    return attr !== val;
  },
  '*=': function(attr, val) {
    return attr.indexOf(val) !== -1;
  },
  '~=': function(attr, val) {
    var i = attr.indexOf(val)
      , f
      , l;

    if (i === -1) return;
    f = attr[i - 1];
    l = attr[i + val.length];

    return (!f || f === ' ') && (!l || l === ' ');
  },
  '|=': function(attr, val) {
    var i = attr.indexOf(val)
      , l;

    if (i !== 0) return;
    l = attr[i + val.length];

    return l === '-' || !l;
  },
  '^=': function(attr, val) {
    return attr.indexOf(val) === 0;
  },
  '$=': function(attr, val) {
    return attr.indexOf(val) + val.length === attr.length;
  }
};

/**
 * Combinator Logic
 */

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
  },
  '//': function(test, name) {
    return function(el) {
      var e = document.getElementsByTagName('*')
        , i = e.length
        , attr;

      while (i--) {
        attr = e[i].getAttribute(name);
        if (!attr) continue;
        if (attr[0] === '#') attr = attr.substring(1);
        if (el.id === attr && test(el)) return true;
      }

      return false;
    };
  }
};

/**
 * Parsing
 */

var attr
  , paren;

attr = /^\[([\w-]+)(?:([^\w]?=)(value))?\]/;
attr = replace(attr, 'value', makeInside('\\]'));

paren = /^(:[\w-]+)\((value)\)/;
paren = replace(paren, 'value', makeInside(')'));

var parse = function(sel) {
  if (sel.length > 1) {
    var func = []
      , i = 0
      , l = sel.length;

    for (; i < l; i++) {
      func.push(parseString(sel[i]));
    }

    l = func.length;
    return function(el) {
      for (i = 0; i < l; i++) {
        if (!func[i](el)) return;
      }
      return true;
    };
  }
  return sel[0] === '*'
    ? selectors['*']
    : selectors.type(sel[0]);
};

var parseString = function(sel) {
  var cap, param;
  switch (sel[0]) {
    case '.': return selectors.attr('class', '~=', sel.substring(1));
    case '#': return selectors.attr('id', '=', sel.substring(1));
    case '[': cap = attr.exec(sel);
              return cap && selectors.attr(cap[1], cap[2] || '-', unquote(cap[3]));
    case ':': cap = paren.exec(sel);
              if (cap) sel = cap[1], param = unquote(cap[2]);
              return param ? selectors[sel](param) : selectors[sel];
    case '*': return selectors['*'];
    default:  return selectors.type(sel);
  }
};

/**
 * Compiling
 */

var rules = {
  subject: /^ *\$/,
  qname: /^ *(\w+|\*)/,
  simple: /^([.#][\w\-]+|:[\w\-]+(?:\(inside\))?|\[inside\])/,
  combinator: /^(?: +([^ \w*]) +|( )+|([^ \w*]))(?! *$)/
};

rules.simple = replace(rules.simple, 'inside', makeInside(')'));
rules.simple = replace(rules.simple, 'inside', makeInside('\\]'));

var compile = function(sel) {
  var sel = sel.replace(/^\s+|\s+$/g, '')
    , filter = []
    , buff = []
    , comb
    , qname
    , cap
    , op;

  while (sel) {
    // if (cap = rules.subject.exec(sel)) {
    //   sel = sel.substring(cap[0].length);
    //   buff.push(':subject');
    //   subject = true;
    // }

    if (cap = rules.qname.exec(sel)) {
      sel = sel.substring(cap[0].length);
      qname = cap[1];
      buff.push(qname);
    } else if (cap = rules.simple.exec(sel)) {
      sel = sel.substring(cap[0].length);
      qname = '*';
      buff.push(qname);
      buff.push(cap[1]);
    } else {
      sel = '';
      break;
    }

    while (cap = rules.simple.exec(sel)) {
      sel = sel.substring(cap[0].length);
      buff.push(cap[1]);
    }

    if (cap = rules.combinator.exec(sel)) {
      sel = sel.substring(cap[0].length);
      op = cap[1] || cap[2] || cap[3];
      if (op === ',') {
        comb = combinators.noop;
        filter.push(comb(parse(buff)));
        break;
      }
      comb = combinators[op];
    } else {
      comb = combinators.noop;
    }

    filter.push(comb(parse(buff)));

    buff = [];
  }

  filter = make(filter);
  filter.qname = qname;
  filter.sel = sel;

  return filter;
};

var make = function(func) {
  return function(el) {
    var i = func.length;
    while (i--) {
      if (!(el = func[i](el))) return;
    }
    return true;
  };
};

var compileGroup = function(sel) {
  var test = compile(sel)
    , tests = [];

  tests.push(test);

  while (test.sel) {
    test = compile(test.sel);
    tests.push(test);
  }

  if (tests.length < 2) {
    test.tests = tests;
    return test;
  }

  test = function(el) {
    var l = tests.length
      , i = 0;

    for (; i < l; i++) {
      if (tests[i](el)) return true;
    }
  };

  test.tests = tests;

  return test;
};

/**
 * Selection
 */

var select = function(sel, context) {
  var results = []
    , test = compile(sel)
    , scope = context.getElementsByTagName(test.qname)
    , i = 0
    , el
    , res
    , l
    , last;

  if (subject) {
    while (el = scope[i++]) {
      if (test(el) && subject !== last) {
        results.push(subject);
        last = subject;
      }
    }
  } else {
    while (el = scope[i++]) {
      if (test(el)) results.push(el);
    }
  }

  subject = null;

  if (test.sel) {
    res = select(test.sel, context);
    l = res.length;
    i = 0;

    for (; i < l; i++) {
      if (!~indexOf.call(results, res[i])) {
        results.push(res[i]);
      }
    }
  }

  return results;
};

/**
 * Compatibility
 */

select = (function() {
  var _select = select;

  if (window.ZEST_DEBUG) {
    return _select;
  }

  var slice = (function() {
    try {
      Array.prototype.slice.call(document.getElementsByTagName('*'));
      return Array.prototype.slice;
    } catch(e) {
      e = undefined;
      return function() {
        var a = [], i = 0, l = this.length;
        for (; i < l; i++) a.push(this[i]);
        return a;
      };
    }
  })();

  if (document.querySelectorAll) {
    return function(sel, context) {
      try {
        return slice.call(context.querySelectorAll(sel));
      } catch(e) {
        return _select(sel, context);
      }
    };
  }

  return function(sel, context) {
    if (!~sel.indexOf(' ')) {
      if (sel[0] === '#' && /^#\w+$/.test(sel)) {
        return [context.getElementById(sel.substring(1))];
      }
      if (sel[0] === '.' && /^\.\w+$/.test(sel)) try {
        return slice.call(
          context.getElementsByClassName(sel.substring(1))
        );
      } catch(e) {}
      if (/^\w+$/.test(sel)) {
        return slice.call(context.getElementsByTagName(sel));
      }
    }
    return _select(sel, context);
  };
})();

if (function() {
  var el = document.createElement('div');
  el.appendChild(document.createComment(''));
  return !!el.getElementsByTagName('*')[0];
}()) {
  selectors['*'] = function(el) {
    if (el && el.nodeType === 1) return true;
  };
}

/**
 * Zest
 */

var zest = function(sel, context_) {
  context = context_ || document;

  try {
    sel = select(sel, context);
  } catch(e) {
    if (window.ZEST_DEBUG) {
      console.log(e.stack || e + '');
    }
    sel = [];
  }

  context = null;

  return sel;
};

/**
 * Expose
 */

zest.selectors = selectors;
zest.operators = operators;
zest.combinators = combinators;
zest.compile = compile;

zest.matches = function(el, sel) {
  return !!compileGroup(sel)(el);
};

zest.cache = function() {
  if (compile.cache) return;

  var raw = compile
    , cache = {};

  compile = function(sel) {
    return cache[sel]
      || (cache[sel] = raw(sel));
  };

  compile.raw = raw;
  compile.cache = cache;

  zest.compile = compile;
  zest.compileGroup = compileGroup;
};

zest.noConflict = function() {
  window.zest = old;
  return zest;
};

window.zest = zest;

if (!window.ZEST_DEBUG) {
  zest.cache();
}

}).call(this);
