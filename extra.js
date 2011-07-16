/**
 * Extra Features for Zest
 */

(function() {
var hop = Object.prototype.hasOwnProperty
  , document = this.document
  , zest = this.zest
  , context
  , key;

/**
 * Removed Selectors
 */

// these selectors have been removed.
// i dont see them as being particularly
// useful when used from inside the dom.
// they are here if anyone wants them though.
var selectors = {
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
  }
};

for (key in selectors) if (hop.call(selectors, key)) {
  zest.selectors[key] = selectors[key];
}

this.zest = function(sel, con) {
  context = con || document;
  var ret = zest(sel, context);
  context = null;
  return ret;
};

/**
 * Non-standard Selectors
 */

zest.operators['!='] = function(attr, val) {
  return attr !== val;
};

zest.combinators['<'] = function(test) {
  return function(el) { 
    el = el.firstChild;
    while (el) {
      if (el.nodeType === 1 && test(el)) {
        return el;
      }
      el = el.nextSibling;
    }
  };
};

}).call(this);