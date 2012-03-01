/**
 * Zest support for Prototype
 * https://github.com/sstephenson/prototype
 */

//= require "zest"

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = engine.matches;
})(zest.noConflict());
