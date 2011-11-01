(function (window, document, parseInt, isNaN, undefined) {

function Jaguar(selector, context) {
    return Jaguar.search(selector, context);
}

var old = window.Jaguar, i, pseudos, slice = [].slice, index = [].indexOf, fil = [].filter,
hasOwn = {}.hasOwnProperty, features = (function (doc) {
    var features = {}, test = doc.createElement('a');
    
    // IE lt 8 getElementById also gets an element with that name
    test.name = 'test';
    doc.firstChild ? doc.firstChild.appendChild(test) : doc.appendChild(test);
    features.brokenId = !!doc.getElementById('test');
    
    // IE lt 9 includes comment nodes in the children array
    test.innerHTML = '<!-- Three guys walk into a bar. *DONK* -->';
    features.childrenHasComments = !!(test.children && test.children.length); // WebKit makes us check for test.children
    
    return features;
})(
    document.implementation.createDocument ?
    document.implementation.createDocument(null, 'html', null) :
    new ActiveXObject('Microsoft.XMLDOM')
), indexOf = index ? function (array, obj) {
    return index.call(array, obj);
} :
function (array, obj) {
    for (var i = 0, l = array.length; i < l; ++i) {
        if (array[i] === obj)
            return i;
    }
    return -1;
}, filter = fil ? function (array, obj) {
    return fil.call(array, obj);
} :
function (array, obj) {
    for (var i = 0, l = array.length, newArray = Array(l); i < l; ++i)
        newArray[i] = func(array[i]);
    
    return newArray;
}, fixAttrs = Jaguar.fixAttributes = {
    'class': 'className',
    'for': 'htmlFor',
    'html': 'innerHTML',
    'style': function (elem) { return elem.style.cssText; },
    'text': function (elem) { return elem.textContent || elem.innerText || ''; }
};

Jaguar.features = features;

Jaguar.filter = filter;
Jaguar.indexOf = indexOf;

function getAttribute(elem, attr) {
    if (fixAttrs[attr]) {
        var value = typeof fixAttrs[attr] == 'function' ? fixAttrs[attr](elem) : elem[fixAttrs[attr]];
        if (attr == 'class' && !value)
            value = null;
        return value;
    }
    return elem.getAttribute(attr);
}
Jaguar.getAttribute = getAttribute;

Jaguar.cache = [];
Jaguar.cacheSize = 50;

Jaguar.surpressErrors = false;

Jaguar.tokenize = function (selector) {
    selector += '';
    
    var chars = selector.split(''), current = chars[0], i = 0, j, l, prev, next, quote, acc,
    tested, forceIdent, op = 'op', ident = 'ident', single = {'(': 1, ')': 1, '[': 1, ']': 1},
    quotes = {'"': 1, "'": 1}, tokens = [];
    
    function test(c) {
        return c && (
            (c > '/' && c < ':') || // 0-9
            (c > '@' && c < '[') || // A-Z
            (c > '`' && c < '{') || // a-z
            c === '-' || c === '_'
        );
    }
    
    function token(type, value) {
        return {
            type: type,
            value: value
        };
    }
    
    while (current) {
        if (quotes[current]) {
            acc = '';
            quote = current;
            while (true) {
                current = chars[++i];
                if (current == quote)
                    break;
                else if (!current)
                    return [];
                acc += current;
            }
            tokens.push(token(ident, acc));
        }
        else if (current == ' ') {
            prev = chars[i - 1];
            next = chars[i + 1];
            if ((test(prev) || quotes[prev] || prev == '*' ||
            single[prev]) && ((test(next) || quotes[next] ||
            next == '*' || single[next]) ||
            chars[i + 2] != ' '))
                tokens.push(token(op, current));
        }
        else if (current == '*') {
            if (chars[++i] == '=')
                tokens.push(token(op, '*='));
            else {
                tokens.push(token(ident, current));
                --i;
            }
        }
        else if (single[current])
            tokens.push(token(op, current));
        else {
            acc = '';
            tested = test(current);
            while (current && current != ' ' && !quotes[current] && ((tested && test(current)) ||
            (!tested && !test(current))) && !single[current]) {
                acc += current;
                if (current == '=') {
                    tokens.push(token(op, acc));
                    acc = '';
                    forceIdent = true;
                }
                current = chars[++i];
            }
            --i;
            if (acc)
                tokens.push(token(forceIdent || tested ? ident : op, acc));
            forceIdent = false;
        }
        current = chars[++i];
    }
    
    return tokens;
};

Jaguar.parse = function (selector) {
    if (typeof selector == 'string' && Jaguar.cache[selector])
        return Jaguar.cache[selector];
    
    for (var tokens = Jaguar.tokenize(selector), op = 'op', ident = 'ident', parsed = [[]],
    val, obj = {classes: [], attrs: [], pseudos: []}, hasOp, balance, i = 0, j, l = tokens.length;
    i < l; ++i) {
        val = tokens[i].value;
        if (tokens[i].type == op) {
            if (val == ',') {
                parsed[parsed.length - 1].push(obj);
                parsed.push([]);
                obj = {classes: [], attrs: [], pseudos: []};
            }
            else if (val == '#')
                obj.id = tokens[++i] ? tokens[i].value : '';
            else if (val == '.')
                obj.classes.push(tokens[++i] ? tokens[i].value : '');
            else if (val == '[') {
                hasOp = tokens[i + 2] && tokens[i + 2].value != ']';
                if (!tokens[i + 2] || (hasOp && (!tokens[i + 4] || tokens[i + 4].value != ']')))
                    return [];
                obj.attrs.push({name: hasOp ? tokens[i + 2].value : '', args: [tokens[++i].value,
                hasOp ? tokens[i += 2].value : undefined]});
                ++i;
            }
            else if (val === ':') {
                if (!tokens[i + 1])
                    return [];
                hasOp = tokens[i + 2] && tokens[i + 2].value == '(';
                j = i + 1;
                if (hasOp) {
                    for (j += 2, balance = 1; j < l; ++j) {
                        if (tokens[j].value == '(' && tokens[j].type == op)
                            ++balance;
                        if (tokens[j].value == ')' && !--balance && tokens[j].type == op)
                            break;
                    }
                }
                obj.pseudos.push({name: tokens[++i].value, args: hasOp ? tokens.slice(i + 2, j) : []});
                i = j;
            }
            else {
                if (!obj.tag)
                    obj.tag = '*';
                parsed[parsed.length - 1].push(obj);
                obj = {classes: [], attrs: [], pseudos: [], tag: '*', combinator: val};
            }
        }
        else
            obj.tag = val.toUpperCase(); // See http://ejohn.org/blog/nodename-case-sensitivity/ for why I use toUpperCase()
    }
    parsed[parsed.length - 1].push(obj);
    
    Jaguar.cache.push(selector);
    Jaguar.cache[selector] = parsed;
    if (Jaguar.cache.length > Jaguar.cacheSize)
        Jaguar.cache[Jaguar.cache.shift()] = undefined;
    
    return parsed;
};

Jaguar.search = function (selector, context) {
    context = context || document;
    if (!selector || typeof selector != 'string' || (context.nodeType != 1 && context.nodeType != 9))
        return [];
    
    var parsed = Jaguar.parse(selector), i = 0, l = parsed.length, r = 0, len,
    parts = [], results = [], hasDupe, removed = [];
    
    if (!l)
        return [];
    
    for (; i < l; ++i)
        parts.push(Jaguar.evaluateSearch(parsed[i], context));
    
    for (i = 0, l = parts.length; i < l; ++i) {
        for (p = 0, len = parts[i].length; p < len;)
            results[r++] = parts[i][p++];
    }
    
    if (l > 1) {
        results.sort(function (a, b) {
            if (a == b) {
                hasDupe = true;
                return 0;
            }
            if (a.compareDocumentPosition)
                return a.compareDocumentPosition(b) & 2 ? 1 : -1;
            
            return a.sourceIndex - b.sourceIndex;
        });
        if (hasDupe) {
            for (i = 0, l = results.length; i < l; ++i) {
                if (results[i] != results[i - 1])
                    removed.push(results[i]);
            }
            results = removed;
        }
    }
    
    return results;
};

function allOf(array1, array2) {
    for (var i = 0, l = array2.length; i < l; ++i) {
        if (indexOf(array1, array2[i]) < 0)
            return false;
    }
    return true;
}

function matchAll(array, funcs, elem) {
    elem = [elem];
    for (var result = true, state = [{}], func, i = 0, l = array.length; i < l; ++i) {
        func = funcs[array[i].name];
        if (func)
            result = result && func.apply(funcs, elem.concat(array[i].args));
        else
            return 'Unknown function ' + array[i].name;
    }
    return result;
}

Jaguar.evaluateSearch = function (objects, context) {
    var elems = [], found, elem, obj = objects[objects.length - 1], newObj, tried, bad, i = 0, l;
    
    if (obj.id) {
        if (context.getElementById && !features.brokenId)
            elem = context.getElementById(obj.id);
        else {
            for (elems = context.getElementsByTagName(obj.tag || '*'), l = elems.length;
            i < l; ++i) {
                if (elems[i].id == obj.id) {
                    elem = elems[i];
                    break;
                }
            }
        }
        elems = elem ? [elem] : [];
        tried = true;
    }
    
    if (obj.classes.length) {
        if (tried && !allOf(elem.className.split(' '), obj.classes))
            elems = [];
        else if (!tried) {
            if (context.getElementsByClassName)
                elems = context.getElementsByClassName(obj.classes.join(' '));
            else {
                for (found = context.getElementsByTagName(obj.tag || '*'), i = 0,
                l = found.length; i < l; ++i) {
                    if (allOf(found[i].className.split(' '), obj.classes))
                        elems.push(found[i]);
                }
            }
            tried = true;
        }
    }
    
    if (obj.tag) {
        if (tried) {
            if (obj.tag != '*') {
                elems = filter(elems, function (e) {
                    return e.nodeName.toUpperCase() == obj.tag;
                });
            }
        }
        else
            elems = context.getElementsByTagName(obj.tag);
    }
    
    function filterElems(array, funcs) {
        if (!elems.length && !tried)
            elems = context.getElementsByTagName('*');
        
        elems = filter(elems, function (e) {
            var match = matchAll(array, funcs, e);
            if (typeof match == 'string')
                bad = match;
            return match;
        });
    }
    
    if (obj.attrs.length)
        filterElems(obj.attrs, Jaguar.attrs);
    
    if (obj.pseudos.length)
        filterElems(obj.pseudos, Jaguar.pseudos);
    
    if (obj.combinator) {
        if (Jaguar.combinators[obj.combinator])
            elems = Jaguar.combinators[obj.combinator](elems, objects.slice(0, -1));
        else
            bad = 'Unknown combinator ' + obj.combinator;
    }
    
    if (bad) {
        if (!Jaguar.surpressErrors)
            throw new Error(bad);
        elems = [];
    }
    
    return elems;
};

Jaguar.match = function (elem, selector) {
    if (!elem || elem.nodeType != 1 || typeof selector != 'string')
        return false;
    
    var parsed = Jaguar.parse(selector), result = false, i = 0, l = parsed.length;
    if (!l)
        return false;
    
    for (; i < l; ++i)
        result = result || Jaguar.evaluateMatch(parsed[i], elem);
    
    return result;
};

Jaguar.evaluateMatch = function (objects, elem) {
    if (elem.nodeType == 9)
        return false;
    
    var obj = objects[objects.length - 1], newObj, matches = true, result, i;
    
    if (obj.id)
        matches = elem.id == obj.id;
    
    if (obj.classes.length)
        matches = matches && allOf(elem.className.split(' '), obj.classes);
    
    if (obj.tag)
        matches = matches && (obj.tag == '*' ? true : elem.nodeName.toUpperCase() == obj.tag);
    
    if (obj.attrs.length)
        matches = matches && matchAll(obj.attrs, Jaguar.attrs, elem);
    
    if (obj.pseudos.length)
        matches = matches && matchAll(obj.pseudos, Jaguar.pseudos, elem);
    
    if (obj.combinator) {
        if (Jaguar.matchCombinators[obj.combinator])
            matches = matches && Jaguar.matchCombinators[obj.combinator](elem, objects.slice(0, objects.length - 1));
        else
            matches = false;
    }
    
    return matches;
};

Jaguar.matchCombinators = {
    ' ': function (elem, objects) {
        while (elem = elem.parentNode) {
            if (Jaguar.evaluateMatch(objects, elem))
                return true;
        }
        return false;
    },
    
    '>': function (elem, objects) {
        return Jaguar.evaluateMatch(objects, elem.parentNode);
    },
    
    '~': function (elem, objects) {
        while (elem = elem.previousSibling) {
            if (elem.nodeType == 1 && Jaguar.evaluateMatch(objects, elem))
                return true;
        }
        return false;
    },
    
    '+': function (elem, objects) {
        while (elem = elem.previousSibling) {
            if (elem.nodeType == 1)
                return Jaguar.evaluateMatch(objects, elem);
        }
        return false;
    }
};

Jaguar.combinators = {};

function combinator(func) {
    return function (elems, objects) {
        return filter(elems, function (e) {
            return func(e, objects);
        });
    };
}

for (i in Jaguar.matchCombinators) {
    if (hasOwn.call(Jaguar.matchCombinators, i))
        Jaguar.combinators[i] = combinator(Jaguar.matchCombinators[i]);
}

function attr(test, noCheck) {
    return function (elem, attr, value) {
        var attribute = getAttribute(elem, attr);
        return (noCheck ? true : attribute != null) && test(attribute, value);
    };
}

Jaguar.attrs = {
    '': attr(function (attr) {
        return attr != null;
    }, true),
    
    '=': attr(function (attr, value) {
        return attr === value;
    }, true),
    
    '!=': attr(function (attr, value) {
        return attr !== value;
    }, true),
    
    '^=': attr(function (attr, value) {
        return !attr.indexOf(value);
    }),
    
    '$=': attr(function (attr, value) {
        return attr.lastIndexOf(value) == attr.length - value.length;
    }),
    
    '*=': attr(function (attr, value) {
        return attr.indexOf(value) > -1;
    }),
    
    '|=': attr(function (attr, value) {
        return attr === value || !attr.indexOf(value + '-');
    }),
    
    '~=': attr(function (attr, value) {
        return indexOf(attr.split(' '), value) > -1;
    })
};

function getSiblings(elem) {
    var kids = elem.parentNode.children || [];
    if (features.childrenHasComments) {
        kids = filter(kids, function (e) {
            return e.nodeType == 1;
        });
    }
    return kids;
}

Jaguar.nthCache = [];
Jaguar.nthCacheSize = 100;

function parseNth(expr) {
    for (var val = expr[0].value, query = val, parsed, a, b, i = 1, l = expr.length; i < l; ++i)
        query += expr[i].value;
    
    if (Jaguar.nthCache[query])
        return Jaguar.nthCache[query];
    
    if (val == 'odd') {
        a = 2;
        b = 1;
    }
    else if (val == 'even') {
        a = 2;
        b = 0;
    }
    else {
        if (val == 'n')
            a = 1;
        else if (val == '-n')
            a = -1;
        else if (isNaN(+val))
            val = val.substr(('' + (a = parseInt(val, 10))).length);
        else
            a = +val;
            
        if (l > 2)
            b = +expr[2].value;
        else if (val == 'n')
            b = 0;
        else {
            for (i = 0, l = val.length; i < l; ++i) {
                if (!isNaN(+val.charAt(i))) {
                    b = parseInt(val.substr(i), 10);
                    break;
                }
            }
        }
    }
    
    parsed = [a, b];
    Jaguar.nthCache.push(query);
    Jaguar.nthCache[query] = parsed;
    if (Jaguar.nthCache.length > Jaguar.nthCacheSize)
        Jaguar.nthCache[Jaguar.nthCache.shift()] = undefined;
    
    return parsed;
}

function positional(name, pos) {
    return function (elem) {
        return pseudos[name](elem, pos);
    };
}

Jaguar.pseudos = pseudos = {
    'has': function (elem) {
        for (var selector = '', args = arguments, i = 1, l = args.length; i < l; ++i)
            selector += args[i].value;
        return !!Jaguar.search(selector, elem).length;
    },
    
    'contains': function (elem, text) {
        return getAttribute(elem, 'text').indexOf(text.value) > -1;
    },
    
    'not': function (elem) {
        for (var selector = '', args = arguments, i = 1, l = args.length; i < l; ++i)
            selector += args[i].value;
        return !Jaguar.match(elem, selector);
    },
    
    'root': function (elem) {
        return elem.parentNode.nodeType == 9;
    },
    
    'empty': function (elem) {
        return !elem.firstChild; // ...Yeah, :empty includes text nodes and comment nodes.
    },
    
    'first-child': positional('nth-child', '1'),
    
    'last-child': positional('nth-child', '-1'),
    
    'only-child': function (elem) {
        var bros = getSiblings(elem);
        return bros.length == 1 && bros[0] == elem;
    },
    
    'first-of-type': positional('nth-of-type', '1'),
    
    'last-of-type': positional('nth-of-type', '-1'),
    
    'only-of-type': function (elem) {
        var name = elem.nodeName.toUpperCase(), bros = filter(getSiblings(elem), function (e) {
            return e.nodeName.toUpperCase() == name;
        });
        return bros.length == 1 && bros[0] == elem;
    },
    
    'nth-child': function (elem) {
        var expr = slice.call(arguments, 1), bros, val, parsed, a, b, pos;
        if (this instanceof Array) // Yes, I know the correct way to check for an Array, but we don't need it here
            bros = this;
        
        if (!expr.length)
            expr = ['n'];
        
        if (typeof expr[0] == 'string') // In case of :nth-child("2n+1")
            expr = Jaguar.tokenize(expr[0]);
        
        val = expr[0].value;
        
        if (expr.length == 1 && val == 'n')
            return elem.parentNode.nodeType == 1;
        
        if (!bros)
            bros = getSiblings(elem);
        
        if (expr.length == 1 && !isNaN(+val))
            return bros[val > -1 ? val - 1 : bros.length + +val] == elem;
        
        parsed = parseNth(expr);
        a = parsed[0];
        b = parsed[1];
        pos = indexOf(bros, elem) + 1;
        if (!a)
            return b == pos;
        
        if (a > 0 && pos < b || (a < 0 && b < pos) || elem.parentNode.nodeType == 9)
            return false;
        
        return !((pos - b) % a);
    },
    
    'nth-last-child': function (elem) {
        return pseudos['nth-child'].apply(slice.call(getSiblings(elem)).reverse(), arguments);
        // Convert to an array and then reverse because reverse.call(getSiblings(elem)) kills performance
    },
    
    'nth-of-type': function (elem) {
        var name = elem.nodeName.toUpperCase();
        return pseudos['nth-child'].apply(filter(this instanceof Array ? this : getSiblings(elem),
        function (e) {
            return e.nodeName.toUpperCase() == name;
        }), arguments);
    },
    
    'nth-last-of-type': function (elem) {
        return pseudos['nth-of-type'].apply(slice.call(getSiblings(elem)).reverse(), arguments);
    }
};

Jaguar.noConflict = function () {
    window.Jaguar = old;
    return Jaguar;
};

window.Jaguar = Jaguar;

})(this, document, parseInt, isNaN);
