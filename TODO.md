# todo

Things to be implemented soon...

Allow compiling of groups:

``` js
compile.group = function(sel) {
  // split up groups
  if (~sel.indexOf(',')) {
    sel = sel.split(/,\s*(?![^\[]*["'])/);

    var func = []
      , i = 0
      , l = sel.length;

    for (; i < l; i++) {
      func.push(compile(sel[i]));
    }

    l = func.length;
    return function(el) {
      for (i = 0; i < l; i++) {
        if (func[i](el)) return true;
      }
    };
  }
  return compile(sel);
};
```

Add subject functionality css4-style not implemented yet due to it being 
so up in the air (the operator has changed once already).

``` js
var subject;

// implicit universal selectors
/(^|\s|\$)(:|\[|\.|#)/g;

// rule
/\s*(\$?(?:\w+|\*)(?:[.#:][^\s]+|\[[^\]]+\])*)\s*$/;

// parse:
switch (sel[0]) {
  case '$': {
    var test = parse(sel.substring(1));
    sel = null;
    subject = true;
    return function(el) {
      subject = el;
      return test(el);
    };
  }
}

// select:
if (subject) {
  while (el = scope[i++]) {
    if (test(el)) res.push(subject);
  }
  subject = null;
} else {
  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
}
```