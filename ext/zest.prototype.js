// Zest support for Prototype
// https://github.com/sstephenson/prototype

Prototype._original_property = window.zest;

//= require "zest"

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;
  
  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }
  
  function match(element, selector) {
    var context = element.parentNode || document;
    var res = engine(selector, context), i = res.length;
    while (i--) if (res[i] === element) return true;
    return false;
  }
  
  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = match;
})(window.zest);

// Restore globals.
window.zest = Prototype._original_property;
delete Prototype._original_property;