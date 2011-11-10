
/**
 * Zest (https://github.com/chjj/zest)
 * A css selector engine.
 * Copyright (c) 2011, Christopher Jeffrey. (MIT Licensed)
 */

;(function() {

var window = this
  , document = this.document
  , old = this.zest;

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
  return (ch === '"' || ch === '\'')
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
      // fixes some test failures with adjacent siblings
      // where el was null/undefined
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
          // because technically '' is not null
          attr = el.getAttribute('title') || null;
          break;
        case 'id':
          // this fixes 4 adjacent errors
          if (!el) break;

          // need this for forms with inputs named "id"
          if (el.getAttribute) {
            attr = el.getAttribute('id');
            break;
          }
        default:
          attr = el[key] != null
               ? el[key]
               // need to check for getattr
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
    return (!prev(el) && !next(el))
            && el.parentNode.nodeType === 1;
  },
  ':nth-child': function(param) {
    return nth(param, function() {
      return true;
    });
  },
  ':root': function(el) {
    return el.ownerDocument.documentElement === el;
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
    return !el.disabled;
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
    var test = compile(sel);
    return function(el) {
      return test(el);
    };
  },
  ':nth-match': function(param) {
    var args = param.split(/\s*,\s*/)
      , p = args.pop()
      , test = compile(args.join(','));

    return nth(p, test);
  },
  ':links-here': function(el) {
    return el + '' === window.location + '';
  }
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

    return (f === ' ' && !l)
        || (!f && l === ' ')
        || (!f && !l);
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
  }
};

/**
 * Parsing
 */

var parse = function(sel) {
  if (sel.length > 1) {
    var func = []
      , i = 0
      , l = sel.length;

    for (; i < l; i++) {
      func.push(parse.string(sel[i]));
      // need this for selectors like [href="#"] that get cut off by .split
      // instead of this, maybe check to see if last char is " or #
      if (!func[i]) {
        func[i] = parse.string(sel[i] + sel[++i]);
        if (!func[i-1]) {
          func[i-1] = parse.string(sel[i-1] + sel[i] + sel[++i]);
        }
      }
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

parse.string = function(sel) {
  var cap, param;
  switch (sel[0]) {
    case '.': return selectors.attr('class', '~=', sel.substring(1));
    case '#': return selectors.attr('id', '=', sel.substring(1));
    case '[': cap = /^\[([\w-]+)(?:([^\w]?=)([^\]]+))?\]/.exec(sel);
              return cap && selectors.attr(cap[1], cap[2] || '-', unquote(cap[3]));
    case ':': cap = /^(:[\w-]+)\(([^)]+)\)/.exec(sel);
              if (cap) sel = cap[1], param = unquote(cap[2]);
              return param ? selectors[sel](param) : selectors[sel];
    case '*': return selectors['*'];
    default:  return selectors.type(sel);
  }
};

var compile = function(sel) {
  var filter = []
    , comb = combinators.noop
    , qname
    , cap
    , op
    , len
    , x;

  sel = sel.replace(/(^|\s)(:|\[|\.|#)/g, '$1*$2');

  //while (cap = /\s*((?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*)\s*$/.exec(sel)) {
  //while (cap = /\s*((?:\w+|\*)(?:[.#:][^\s+>~]+|\[[^\]]+\])*)\s*$/.exec(sel)) {
  // fix the combinator space error, instead of using the negative
  // set of: [^\s], use: [\w()-] to grab the id/class/pseudo
  // this will fail for :nth-child(2+n)
  //while (cap = /\s*((?:\w+|\*)(?:[.#:][\w()-]+|\[[^\]]+\])*)\s*$/.exec(sel)) {
  // this one below can handle :nth-child(2+n)
  while (cap =
    /\s*((?:\w+|\*)(?:[.#:][\w-]+(?:\([^)]+\))?|\[[^\]]+\])*)\s*$/.exec(sel)) {
    if (~sel.indexOf('#level1>span')) console.log(cap);
    len = sel.length - cap[0].length;
    cap = cap[1].split(/(?=[\[:.#])/);
    if (!qname) qname = cap[0];
    filter.push(comb(parse(cap)));
    if (len) {
      op = sel[len - 1];
      comb = combinators[op] || combinators[op = ' '];
      sel = sel.substring(0, op !== ' ' ? --len : len);
    } else {
      break;
    }
  }

  filter = compile.make(filter);
  filter.qname = qname;

  return filter;
};

compile.make = function(func) {
  return function(el) {
    var i = 0, next;
    while (next = func[i++]) {
      if (!(el = next(el))) return;
    }
    return true;
  };
};

/**
 * Selection
 */

var select = function(sel, context) {
  var results = [];

  if (~sel.indexOf(',')) {
    //var group = sel.split(/,\s*(?![^\[]*["'])/)
    var group = sel.split(/,\s*(?![^\[]*\])/)
      , sel = undefined
      , i = 0
      , scope
      , el
      , k;

    // prevent stack overflow
    if (group.length < 2) {
      sel = group[0];
    } else {
      while (sel = group[i++]) {
        scope = select(sel, context), k = 0;
        while (el = scope[k++]) {
          if (!~indexOf.call(results, el)) {
            results.push(el);
          }
        }
      }
      return results;
    }
  }

  var test = compile(sel)
    , scope = context.getElementsByTagName(test.qname)
    , i = 0
    , el;

  while (el = scope[i++]) {
    if (test(el)) results.push(el);
  }

  return results;
};

/**
 * Compatibility
 */

select = (function() {
  var _select = select;

  if (1 || window.ZEST_DEBUG) {
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
    if (el.nodeType === 1) return true;
  };
}

/**
 * Zest
 */

var zest = function(sel, context) {
  try {
    return select(sel, context || document);
  } catch(e) {
    if (typeof console !== 'undefined') {
      console.log(e.stack || e + '');
    }
    return [];
  }
};

/**
 * Expose
 */

zest.selectors = selectors;
zest.operators = operators;
zest.combinators = combinators;
zest.compile = compile;

zest.matches = function(el, sel) {
  return !!compile(sel)(el);
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
  compile.make = raw.make;

  zest.compile = compile;
};

zest.noConflict = function() {
  window.zest = old;
  return zest;
};

window.zest = zest;

//zest.cache();

}).call(this);
