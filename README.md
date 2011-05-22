# Zest - a fast, lightweight, and compliant CSS selector engine

Zest is a CSS selector engine. I originally wrote it in a night as a proof of 
concept for certain non-standard selectors I was interested in, but once I 
noticed how fast it was before I had optimized it, I decided to develop it a 
bit more.

Zest was designed to be very concise while still supporting css3 selectors 
and remaining fast. For context, when compared to the well-known Sizzle engine:
    - Zest - less than 400 lines, and ~170 semicolons.
    - Sizzle - 1413 lines and 413 semicolons.

## Benchmarks

Each selector run 1000 times on Google Chrome 12 beta (ms):

    benchmarking: `header > h1` 1000 times.
    zest: 16
    sizzle: 24
    native: 13
    benchmarking: `body > header > h1` 1000 times.
    zest: 19
    sizzle: 28
    native: 13
    benchmarking: `html a` 1000 times.
    zest: 53
    sizzle: 55
    native: 12
    benchmarking: `:first-child` 1000 times.
    zest: 71
    sizzle: 73
    native: 11
    benchmarking: `:only-child` 1000 times.
    zest: 75
    sizzle: 75
    native: 11
    benchmarking: `:not(a)` 1000 times.
    zest: 61
    sizzle: 125
    native: 13
    benchmarking: `h1 + time:last-child` 1000 times.
    zest: 19
    sizzle: 31
    native: 14
    benchmarking: `h1 + time[datetime]:last-child` 1000 times.
    zest: 43
    sizzle: 46
    native: 14
    benchmarking: `header > h1, :not(a)` 1000 times.
    zest: 83
    sizzle: 213
    native: 17
    benchmarking: `:nth-child(2n+1)` 1000 times.
    zest: 123
    sizzle: 103
    native: 16

__NOTE:__ If you want to run these benchmarks yourself make sure to turn off 
Sizzle's `document.querySelectorAll` delegation mechanism, otherwise you will be 
benchmarking Zest against `document.querySelectorAll`.

## Usage

    zest('header > h1', document); // second parameter is the context

## Notes

Zest will cache the compiled selectors, which solves the last case's speed. 
It will delegate to document.querySelectorAll, document.getElementById, 
and document.getElementsByClassName if possible, however, I'm considering the 
removal of these features entirely in favor of selector caching, to keep 
things small. (Delegation to these features require a good amount of code just 
for the compatibility problems certain browsers present.) In the future, all 
common selectors may simply be precaches to start out with. 

__Unsupported Selectors:__ `nth-last-of-type`, `nth-last-child`, `:hover`, 
`:link`, `:unvisited`, and all pseudo elements.

`:link`, `:unvisited`, and pseudo elements are unsupported for obvious reasons 
(they don't work). `:hover` isn't supported because it examines a dynamic state, 
you should be binding to events for this. The `nth-last-x` pseudo-classes are 
unsupported simply because I haven't gotten around to adding them.

This selector engine is very new (quite literally written in a night or two), 
if there are any bugs please submit them to the issue tracker. 

Zest doesn't support any non-standard selectors, but it is trivial to add 
your own pseudo classes by modifying the `zest.selectors` object. It contains 
a set of functions which accept an `el` parameter, this function will be called 
during a filter. Return true if the element matches your selector. 

## License

(c) Copyright 2011, Christopher Jeffrey (MIT Licensed). 
See LICENSE for more info.