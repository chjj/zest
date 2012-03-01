/**
 * zest.js support for jQuery
 *
 * zest.js
 * Copyright (c) 2011-2012, Christopher Jeffrey
 * https://github.com/chjj/zest
 *
 * jQuery
 * Copyright (c) 2009 John Resig
 * https://github.com/jquery/jquery
 */

;(function() {

// Using this, jQuery can be built with Zest as its selector engine.

// Unfortunately, Sizzle exposes a lot of functions to jQuery. These functions
// are necessary in order for jQuery to run properly. jQuery wasn't made to
// work with any selector engine but Sizzle. They're incredibly tightly
// coupled.

// The functions you see here were taken directly from Sizzle to ensure jQuery
// remains working properly.

var engine = this.zest.noConflict();

engine.matchesSelector = engine.matches;

engine.matches = function(sel, set) {
  var test = engine.compile(sel)
    , i = set.length;

  while (i--) {
    if (!test(set[i])) set.splice(i, 1);
  }

  return set;
};

/*!
 * TAKEN FROM: Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */

// MIT License
// ----
//
// Copyright (c) 2009 John Resig
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

engine.isXML = function( elem ) {
  var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;
  return documentElement ? documentElement.nodeName !== "HTML" : false;
};

engine.getText = function( elems ) {
  var ret = "", elem;

  for ( var i = 0; elems[i]; i++ ) {
    elem = elems[i];
    if ( elem.nodeType === 3 || elem.nodeType === 4 ) {
      ret += elem.nodeValue;
    } else if ( elem.nodeType !== 8 ) {
      ret += engine.getText( elem.childNodes );
    }
  }

  return ret;
};

var hasDuplicate = false,
    baseHasDuplicate = true;

[0, 0].sort(function() {
  baseHasDuplicate = false;
  return 0;
});

var sortOrder, siblingCheck;
if ( document.documentElement.compareDocumentPosition ) {
  sortOrder = function( a, b ) {
    if ( a === b ) {
      hasDuplicate = true;
      return 0;
    }
    if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
      return a.compareDocumentPosition ? -1 : 1;
    }
    return a.compareDocumentPosition(b) & 4 ? -1 : 1;
  };
} else {
  sortOrder = function( a, b ) {
    if ( a === b ) {
      hasDuplicate = true;
      return 0;
    } else if ( a.sourceIndex && b.sourceIndex ) {
      return a.sourceIndex - b.sourceIndex;
    }

    var al, bl,
      ap = [],
      bp = [],
      aup = a.parentNode,
      bup = b.parentNode,
      cur = aup;

    if ( aup === bup ) {
      return siblingCheck( a, b );

    } else if ( !aup ) {
      return -1;

    } else if ( !bup ) {
      return 1;
    }

    while ( cur ) {
      ap.unshift( cur );
      cur = cur.parentNode;
    }

    cur = bup;

    while ( cur ) {
      bp.unshift( cur );
      cur = cur.parentNode;
    }

    al = ap.length;
    bl = bp.length;

    for ( var i = 0; i < al && i < bl; i++ ) {
      if ( ap[i] !== bp[i] ) {
        return siblingCheck( ap[i], bp[i] );
      }
    }

    return i === al ?
      siblingCheck( a, bp[i], -1 ) :
      siblingCheck( ap[i], b, 1 );
  };

  siblingCheck = function( a, b, ret ) {
    if ( a === b ) {
      return ret;
    }

    var cur = a.nextSibling;
    while ( cur ) {
      if ( cur === b ) {
        return -1;
      }
      cur = cur.nextSibling;
    }

    return 1;
  };
}

engine.uniqueSort = function( results ) {
  if ( sortOrder ) {
    hasDuplicate = baseHasDuplicate;
    results.sort( sortOrder );

    if ( hasDuplicate ) {
      for ( var i = 1; i < results.length; i++ ) {
        if ( results[i] === results[ i - 1 ] ) {
          results.splice( i--, 1 );
        }
      }
    }
  }

  return results;
};

if ( document.documentElement.contains ) {
  engine.contains = function( a, b ) {
    return a !== b && (a.contains ? a.contains(b) : true);
  };
} else if ( document.documentElement.compareDocumentPosition ) {
  engine.contains = function( a, b ) {
    return !!(a.compareDocumentPosition(b) & 16);
  };
} else {
  engine.contains = function() {
    return false;
  };
}

// EXPOSE
jQuery.find = engine;

// there is simply no way these will work
//jQuery.expr = engine.selectors;
//jQuery.expr[":"] = jQuery.expr.filters;

jQuery.unique = engine.uniqueSort;
jQuery.text = engine.getText;
jQuery.isXMLDoc = engine.isXML;
jQuery.contains = engine.contains;

jQuery.zest = engine;

}).call(this);
