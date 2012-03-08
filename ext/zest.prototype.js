/**
 * zest.js support for Prototype
 *
 * zest.js
 * Copyright (c) 2011-2012, Christopher Jeffrey
 * https://github.com/chjj/zest
 *
 * Prototype
 * Copyright (c) 2005-2010 Sam Stephenson
 * https://github.com/sstephenson/prototype
 */

//= require "zest"

;(function(engine) {
  engine.noNative();

  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = engine.matches;
})(zest.noConflict());
