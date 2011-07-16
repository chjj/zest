# Todo

Things to be implemented soon...

Allow compiling of groups:

``` js
compile.group = function(sel) {
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

Add css4 subject functionality.

Not implemented yet due to it being so up in the air 
(the operator has changed once already).

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
  var last;
  while (el = scope[i++]) {
    if (test(el) && subject !== last) {
      res.push(subject);
      last = subject;
    }
  }
  subject = null;
} else {
  while (el = scope[i++]) {
    if (test(el)) res.push(el);
  }
}
```