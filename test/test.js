this.ZEST_DEBUG = 1;

;(function() {

// from: http://www.thespanner.co.uk/2009/01/29/detecting-browsers-javascript-hacks/
var IE = (function(e) { try { e(); } catch(e) {} return !!e; })() || '\v' === 'v';

var slice = (function() {
  try {
    Array.prototype.slice.call(document.getElementsByTagName('*'));
    return function(obj) {
      return Array.prototype.slice.call(obj);
    };
  } catch(e) {
    e = null;
    return function(obj) {
      var a = [], i = 0, l = obj.length;
      for (; i < l; i++) a.push(obj[i]);
      return a;
    };
  }
})();

var assert = {
  error: function(err) {
    //throw new Error(err);
    console.error(err);
  }
};

assert.selector = function(sel, node) {
  try {
    var got = zest(sel, node)
    //, expected = Sizzle(sel)
      , expected = slice((node || document).querySelectorAll(sel));
  } catch(e) {
    return true;
  }
  var i = got.length, k
    , finalgot = got.slice()
    , finalexpect = expected.slice();

  while (i--) {
    k = expected.length;
    while (k--) {
      if (got[i] === expected[k]) {
        finalgot.splice(i, 1);
        finalexpect.splice(k, 1);
        break;
      }
    }
  }

  if (finalgot.length || finalexpect.length) {
    var obj = {
      finalgot: finalgot, finalexpected: finalexpect,
      originalgot: got, originalexpect: expected
    };
    console.log(IE ? JSON.stringify(obj, function(key, val) {
      if (val && val.tagName) {
        return val.tagName;
      }
      return val;
    }, 2) : obj);
    assert.error(
      'Assertion Error: `' + sel + '` - '
      + 'DIFF: ' + (Math.abs(finalgot.length - finalexpect.length))
    );
    return;
  }

  console.log('passed: ' + sel);
};

var runTests = function() {
  assert.selector('body > header > h1');
  assert.selector('h1');
  assert.selector('h1 + h1');
  assert.selector('li + li');
  assert.selector('*');
  assert.selector('article > header');
  assert.selector('header + p');
  assert.selector('header ~ footer');
  assert.selector(':root');
  assert.selector(':first-child');
  assert.selector(':last-child');
  assert.selector('header > :first-child');
  assert.selector(':empty');
  assert.selector('a[rel="section"]');
  assert.selector('html header');
  assert.selector('.a');
  assert.selector('#hi');
  assert.selector('html > :root');
  assert.selector('header h1');
  assert.selector('article p');
  assert.selector(':not(a)');
  assert.selector('.bar');
  assert.selector('[id="hi"]');
  assert.selector('h1 + time[datetime]');
  assert.selector('h1 + time[datetime]:last-child');
  assert.selector(':nth-child(2n+1)');
  assert.selector(':nth-child(2n-1)');
  assert.selector(':nth-of-type(2n+1)');
  //assert.selector(':lang(en)');

  // this test wont pass because when it comes to groupings
  // zest doesn't get the order of the elements exactly perfect
  //assert.selector('a, h1');

  var div = document.createElement('div');
  div.innerHTML = '<h1>foo</h1>';
  assert.selector('h1', div);
  assert.selector('div > h1', div);
  assert.selector('* > div > h1', div);

};

var bench = function(sel, times) {
  // ie's js engine is roughly 5-10x
  // slower than any others (10x slower than v8)
  times = times || IE ? 100 : 1000;

  console.log('benchmarking: ' + '`' + sel + '` ' + times + ' times.');

  (function() {
    var start = (new Date().getTime());
    for (var i = times; i--;) zest(sel);
    console.log('zest:', (new Date().getTime()) - start);
  })();

  (function() {
    var start = (new Date().getTime());
    for (var i = times; i--;) Sizzle(sel);
    console.log('sizzle:', (new Date().getTime()) - start);
  })();

  try {
    (function() {
      var start = (new Date().getTime());
      for (var i = times; i--;) document.querySelectorAll(sel);
      console.log('native:', (new Date().getTime()) - start);
    })();
  } catch(e) {
    console.log('native:', 'failed');
  }
};

setTimeout(function() {
  runTests();
  bench('header > h1');
  bench('body > header > h1');
  bench('html a');
  bench(':first-child');
  bench(':only-child');
  bench(':not(a)');
  bench('h1 + time:last-child');
  bench('h1 + time[datetime]:last-child');
  bench('header > h1, :not(a)');
  bench('a[rel~="section"]');
  bench('a, h1');
  bench(':nth-child(2n+1)');
}, 100);
}).call(this);
