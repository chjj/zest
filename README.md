# Zest - a fast, lightweight, and extensible CSS selector engine

Zest is a CSS selector engine. I originally wrote it in a night as a proof of 
concept for certain non-standard selectors I was interested in, but once I 
noticed how fast it was before I had even optimized it, I decided to develop it 
a bit more.

Zest was designed to be very concise while still supporting CSS3 selectors 
and remaining fast. For context, when compared to the well-known Sizzle engine: 

- Zest - around 400 lines, and ~170 semicolons.
- Sizzle - 1413 lines and 413 semicolons.

## Benchmarks

Each selector run 1000 times on Google Chrome 12 beta (ms):

    benchmarking: `header > h1` 1000 times.
    zest: 15
    sizzle: 25
    native: 12
    benchmarking: `body > header > h1` 1000 times.
    zest: 19
    sizzle: 28
    native: 13
    benchmarking: `html a` 1000 times.
    zest: 53
    sizzle: 56
    native: 13
    benchmarking: `:first-child` 1000 times.
    zest: 49
    sizzle: 73
    native: 12
    benchmarking: `:only-child` 1000 times.
    zest: 52
    sizzle: 73
    native: 11
    benchmarking: `:not(a)` 1000 times.
    zest: 46
    sizzle: 125
    native: 12
    benchmarking: `h1 + time:last-child` 1000 times.
    zest: 18
    sizzle: 35
    native: 13
    benchmarking: `h1 + time[datetime]:last-child` 1000 times.
    zest: 43
    sizzle: 45
    native: 14
    benchmarking: `header > h1, :not(a)` 1000 times.
    zest: 67
    sizzle: 209
    native: 17
    benchmarking: `:nth-child(2n+1)` 1000 times.
    zest: 94
    sizzle: 102
    native: 14

__NOTE:__ If you want to run these benchmarks yourself make sure to turn off 
Sizzle's (and Zest's) `document.querySelectorAll` delegation mechanism, 
otherwise you will be benchmarking against `document.querySelectorAll`.

## Usage

``` js
// second parameter is the context
zest('header > h1', document); 
```

## Notes

Zest will cache compiled selectors if it can't delegate to 
`document.querySelectorAll`, `document.getElementById`, or 
`document.getElementsByClassName` (depending). __(The benchmark tests you see 
above were performed with the caching mechanism disabled. If caching were 
enabled, Zest would be faster than the native `document.querySelectorAll`).__

__Unsupported Selectors:__ `nth-last-of-type`, `nth-last-child`, `:hover`, 
`:link`, `:visited`, all pseudo elements, and namespaces.

`:link`, `:visited`, and pseudo elements are unsupported for obvious reasons 
(they don't work). `:hover` isn't supported because it examines a dynamic state, 
you should be binding to events for this. The `nth-last-x` pseudo-classes are 
unsupported simply because I haven't gotten around to adding them. I don't 
plan on adding namespace selector support currently, but it may be added 
eventually.

This selector engine is very new (quite literally written in a night or two), 
if there are any bugs please submit them to the issue tracker. 

## Extension

Zest doesn't support any non-standard selectors, but it is possible to add your 
own.

### Adding a simple selector

Adding simple selectors is fairly straight forward. Only the addition of pseudo 
classes and attribute operators is possible. (Adding your own "style" of 
selector would require changes to the core logic.)

Here is an example of a custom `:name` selector which will match for an 
element's `name` attribute: e.g. `h1:name(foo)`. Effectively an alias 
for `h1[name=foo]`.

``` js
// if there was a parameter, 
// it gets closured as `param`
zest.selectors[':name'] = function(param) {
  return function(el) {
    if (el.name === param) return true;
  };
};
```

#### Adding an attribute operator

``` js
// `attr` is the attribute
// `val` is the value to match
zest.attributes['!='] = function(attr, val) {
  return attr !== val;
};
```

### Adding a combinator

Adding a combinator is a bit trickier. It may seem confusing at first because
the logic is upside-down. Zest interprets selectors from right to left. 

Here is an example how a parent combinator could be implemented:

``` js
zest.combinators['parent'] = function(test) {
  return function(el) { // `el` is the current element
    el = el.firstChild;
    while (el) {
      // return the relevant element
      // if it passed the test
      if (el.nodeType === 1 && test(el)) {
        return el;
      }
      el = el.nextSibling;
    }
  };
};
zest.rules.push(['parent', /\s*<\s*$/]);
```

The `test` function tests whatever simple selectors it needs to look for, but 
it isn't important what it does. The most important part is that you return 
the relevant element once it's found.

The way the rule regex works is also important. It needs to end with a `$`. 
Just remember that zest will be scanning from the right using this regex.

## License

(c) Copyright 2011, Christopher Jeffrey (MIT Licensed).  
See LICENSE for more info.