/**
 * zest.js support for Zepto.js
 *
 * zest.js
 * Copyright (c) 2011-2012, Christopher Jeffrey
 * https://github.com/chjj/zest
 *
 * Zepto.js
 * (c) 2010-2012 Thomas Fuchs
 * https://github.com/madrobby/zepto
 */

;(function() {
  var Zepto = this.Zepto
    , zest = this.zest.noConflict()
    , key;

  var Zepto_ = function(selector, context) {
    if (typeof selector === 'string' && !/^\s*</.test(selector)) {
      var results = zest(selector, context);
      results.__proto__ = Zepto.fn;
      results.selector = selector;
      return results;
    }
    return Zepto(selector, context);
  };

  Zepto_.qsa = zest;

  for (key in Zepto) {
    if (Object.prototype.hasOwnProperty.call(Zepto, key)) {
      Zepto_[key] = Zepto[key];
    }
  }

  if (this.$ === Zepto) this.$ = Zepto_;
  this.Zepto = Zepto_;
}).call(this);
