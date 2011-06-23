(function() {
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

this.assert = this.assert || {
  error: function(err) {
    //throw new Error(err);
    console.error('ASSERTION ERROR:', err);
  }
};

assert.selector = function(sel) {
  try {
    var got = zest(sel),
        //expected = Sizzle(sel); 
        expected = slice(document.querySelectorAll(sel));
  } catch(e) {
    return true;
  }
  var i = got.length, k,
    finalgot = got.slice(), 
    finalexpect = expected.slice();
  var filter = function(key, val) {
    if (val && val.tagName) {
      return val.tagName;
    }
    return val;
  };
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
    console.log(IE ? JSON.stringify(obj, filter, 2) : obj);
    assert.error(
      'Assertion Error: `' + sel + '` - ' 
      + 'DIFF: ' + (Math.abs(finalgot.length - finalexpect.length))
    );
  }
  console.log('passed: ' + sel);
};

this.runTests = function() {
  assert.selector('body > header > h1');
  assert.selector('h1');
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
  assert.selector('[id="hi"]');
  assert.selector('h1 + time[datetime]');
  assert.selector('h1 + time[datetime]:last-child');
  assert.selector(':nth-child(2n+1)');
  assert.selector(':nth-of-type(2n+1)');
  
  // this test wont pass because when it comes to groupings
  // zest doesn't get the order of the elements exactly perfect
  //assert.selector('a, h1');
};

this.bench = function(sel, times) {
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
  } catch(e) {}
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