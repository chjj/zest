// Zest support for Prototype
// https://github.com/sstephenson/prototype

Prototype._original_property = window.zest;

//= require "zest"

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = engine.matches;
})(window.zest);

// Restore globals.
window.zest = Prototype._original_property;
delete Prototype._original_property;