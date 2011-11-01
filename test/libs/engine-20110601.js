/*
 * Engine 1.1 beta 20110531
 * Written by Eli Snow
 *
 * This code is released as public domain meaning you may copy, sell, plagiarize,
 * print, distribute, burn, modify, eat, or otherwise do with this code as you like.
 *
 * Free source!
 */
var engine;
(function (document, undefined) {
    var pseudo, firstElChild, lastElChild, nextElSib, prevElSib,
    qsa = !!document.querySelectorAll,
    cache = {},
    stamper = 0,
    stamper2 = 0;

    if (document.documentElement.nextElementSibling !== undefined) {
        nextElSib = function (el) {
            return el.nextElementSibling;
        };
        prevElSib = function (el) {
            return el.previousElementSibling;
        };
    } else {
        nextElSib = function (node) {
            while ((node = node.nextSibling) && node.nodeType != 1) {}
            return node;
        };
        prevElSib = function (node) {
            while ((node = node.previousSibling) && node.nodeType != 1) {}
            return node;
        };
    }
    if (document.documentElement.lastElementChild !== undefined) {
        firstElChild = function (el) {
            return el.firstElementChild;
        };
        lastElChild = function (el) {
            return el.lastElementChild;
        };
    } else {
        firstElChild = function (node) {
            for (node = node.firstChild; node.nodeType != 1; node = node.nextSibling) {}
            return node;
        };
        lastElChild = function (node) {
            for (node = node.lastChild; node.nodeType != 1; node = node.previousSibling) {}
            return node;
        };
    }

    function toArray(arr, arr2) {
        /*
         * toArray( {array | nodeList}, [array] )
         * Concats a nodeList and an array or two arrays, or converts a nodeList
         * to a new array. If passing in a nodeList it should always be the first
         * argument passed. If only converting a nodeList just the first
         * argument is necessary.
         * When copying two arrays into one, the first array's elements are 
         * copied at the end of the second array and the second array is returned
         */
        if (!arr2) {
            arr2 = [];
        }
        for (var i = 0, l = arr.length, j = arr2.length; i < l; arr2[j++] = arr[i++]) {}
        return arr2;
    }

    function getEls(tag, id, c, fn, combinator, candidates, chunk) {
        var current, j, k, l, nl, cReg, holder,
        i = -1,
        count = 0;
        if (!candidates) { 
            if (!!tag ^ !!id ^ !!c ^ !!fn) { //XOR, expedited lookup for simple selectors such as "div", ".class", "#id"
                if (tag) {
                    holder = toArray(document.getElementsByTagName(tag));
                } else if (id) {
                    holder = (holder = document.getElementById(id)) ? [holder] : [];
                } else if (document.getElementsByClassName && c) {
                    holder = toArray(document.getElementsByClassName(c));
                }
            }
            if (!holder && qsa) {
                try {
                    holder = toArray(document.querySelectorAll(chunk));
                } catch (e) {}                
            }
            if (holder) {
                holder.norepeat = 1;
                return holder;
            }
            candidates = [document];
        }
        if ((l = candidates.length) < 1) { //no matches from previous lookups (no context)
            return candidates;
        }
        holder = [];
        tag = tag ? tag.toUpperCase() : "*";
        if (c) {
            cReg = new RegExp(c.replace(/(\S+) ?/g, "(?=$1)"));
        }
        if (!combinator || combinator == " ") {
            //gets to this point on the initial lookup, or when there is a " " combinator
            if (id) { //check by id
                if ((current = document.getElementById(id))
                    && !((tag != "*" && current.tagName != tag)
                        || (c && !cReg.test(current.className))
                        || (fn && !fn(current)))) {
                    while (++i < l) {
                        if (!((candidates[i].contains && !candidates[i].contains(current))
                            || (candidates[i].compareDocumentPosition && candidates[i].compareDocumentPosition(current) != 20))) {
                            holder = [current];
                            break;
                        }
                    }
                }
            } else if (c) { //check by class
                if (document.getElementsByClassName) { //browsers that support getElementsByClassName
                    while (++i < l) {
                        nl = candidates[i].getElementsByClassName(c);
                        if (tag != "*" || fn) {
                            j = nl.length;
                            while (j--) {
                                if (nl[j].tagName == tag && (!fn || fn(nl[j]))) {
                                    holder[count++] = nl[j];
                                }
                            }
                        } else {
                            toArray(nl, holder);
                        }
                    }
                } else { //browsers that don't support getElementsByClassName
                    while (++i < l) {
                        nl = candidates[i].getElementsByTagName(tag);
                        j = nl.length;
                        while (j--) {
                            if (cReg.test(nl[j].className) && (!fn || fn(nl[j]))) {
                                holder[count++] = nl[j];
                            }
                        }
                    }
                }
            } else { //check by tag
                if (fn) {
                    while (++i < l) {
                        for (nl = candidates[i].getElementsByTagName(tag), j = -1, k = nl.length; ++j < k;) {
                            if (fn(nl[j])) {
                                holder[count++] = nl[j];
                            }
                        }
                    }
                } else {
                    while (++i < l) {
                        toArray(candidates[i].getElementsByTagName(tag), holder);
                    }
                }
            }
        } else {
            //gets to this point when the combinator is ">", "+", or "~"
            outer: while (++i < l) {
                current = combinator == ">" ? firstElChild(candidates[i]) : nextElSib(candidates[i]);
                if (!current) {
                    continue;
                }
                do {
                    if (combinator == "~") {
                        if (current.$stamp == stamper2) { //ensures the same elements are not iterated over more than once
                            break;
                        }
                        current.$stamp = stamper2;
                    }
                    if (!((tag != "*" && current.tagName != tag)
                        || (id && current.id != id)
                        || (c && !cReg.test(current.className))
                        || (fn && !fn(current)))) {
                        holder[count++] = current;
                        if (id) { //If there is an id and we found a match we can break the outer loop as an id can only be used once
                            break outer;
                        }
                    }
                    if (combinator == "+") {
                        break;
                    }
                } while ((current = nextElSib(current)));
            }
        stamper2++;
        }
        return holder;
    }

    /*
     * Custom pseudo selectors can be added below (or the one's below can be
     * removed if not. There are two types of pseudo selectors below, simple and
     * advanced.
     * 
     * The simple pseudo selector functions have a single element passed in and
     * returns a boolean value
     * 
     * The advanced pseudo selector functions have the name of the pseudo selector,
     * and the contents of parenthesis passed in. The advanced function uses that
     * information to return a function which is equivalent to the simple pseudo
     * selector functions (gets a single element passed in and return a boolean
     * value)
     */
    pseudo = {
        //Simple psuedo selectors
        empty: function (c) {
            return !c.firstChild;
        },
        enabled: function (c) {
            return c.disabled != "disabled";
        },
        disabled: function (c) {
            return c.disabled == "disabled";
        },
        checked: function (c) {
            return c.checked;
        },
        "first-child": function (c) {
            return !prevElSib(c);
        },
        "last-child": function (c) {
            return !nextElSib(c);
        },
        "only-child": function (c) {
            return !nextElSib(c) && !prevElSib(c);
        },
        "first-of-type": function (c) {
            var tag = c.tagName;
            while ((c = prevElSib(c)) && c.tagName != tag) {}
            return !c;
        },
        "last-of-type": function (c) {
            var tag = c.tagName;
            while ((c = nextElSib(c)) && c.tagName != tag) {}
            return !c;
        },
        "only-of-type": function (c) {
            var tag = c.tagName,
            current = c;
            while ((c = prevElSib(c)) && c.tagName != tag) {}
            if (!c) {
                c = current;
                while ((c = nextElSib(c)) && c.tagName != tag) {}
                return !c;
            }
            return false;
        },
        // Advanced pseudo selectors which take two parameters (the string within the parenthesis, and the pseudo selector name,) and returns a function which takes one parameter
        not: function (paren) {
            var fn;
            (function (a) {
                fn = function (c) {
                    var i = a.length;
                    while (i--) {
                        if (c === a[i]) {
                            return false;
                        }
                    }
                    return true;
                };
            }(engine(paren)));
            return fn;
        },
        contains: function (paren) {
            var fn;
            (function (p) {
                fn =  function (c) {
                    return (c.textContent || c.innerText || "").indexOf(p) > -1;
                };
            }(paren));
            return fn;
        },
        "nth-child": function (paren, p) {
            var fn,
            match = paren.match(/^ ?(?:([+\-]?\d*)?(n))? ?([+\-])? ?(\d+|odd|even)? ?$/);
            /*
                 * In the case of "-3n + 6"
                 * match[1] = "-3"
                 * match[2] = "n"
                 * match[3] = "+"
                 * match[4] = "6"
                 */
            if (!match) { //if the regexp above could not find a match
                return false;
            }
            match[3] += match[4];
            if (match[3] == "even") {
                match[3] = 2;
                match[1] = 2;
            } else if (match[3] == "odd") {
                match[3] = 1;
                match[1] = 2;
            } else if (!(match[1] -= 0) && !(match[3] -= 0)) { //"n"
                return true;
            } else if (!match[3]) { //"3n"
                match[3] = match[1];
            } else if ((!match[1] && match[2]) || match[1] == "+" || match[1] == "-") { // "n+2" or "+n+2" or "-n+2"
                match[1]++;
            } else if (!match[1]) { //"3"
                match[1] = 0;
            }
            (function (p, m) {
                fn = function (c) {
                    var n, child, tag, count,
                    s = "$" + p,
                    parent = c.parentNode,
                    types = {};
                    if (parent[s] != stamper) {
                        parent[s] = stamper;
                        count = -m[3];
                        if (p == "nth-child") {
                            child = firstElChild(parent);
                            do {
                                child.$n = ++count;
                            } while ((child = nextElSib(child)));
                        } else if (p == "nth-last-child") {
                            child = lastElChild(parent);
                            do {
                                child.$nl = ++count;
                            } while ((child = prevElSib(child)));
                        } else if (p == "nth-of-type") {
                            child = firstElChild(parent);
                            do {
                                if (types[(tag = child.tagName)] === undefined) {
                                    types[tag] = count;
                                }
                                child.$nt = ++types[tag];
                            } while ((child = nextElSib(child)));
                        } else {
                            child = lastElChild(parent);
                            do {
                                child.$nlt = types[tag] + 1 || (types[tag] = count + 1);
                                if (types[(tag = child.tagName)] === undefined) {
                                    types[tag] = count;
                                }
                                child.$nlt = ++types[tag];
                            } while ((child = prevElSib(child)));
                        }
                    }
                    switch (p) {
                        case "nth-child":
                            n = c.$n;
                            break;
                        case "nth-last-child":
                            n = c.$nl;
                            break;
                        case "nth-of-type":
                            n = c.$nt;
                            break;
                        default:
                            n = c.$nlt;
                    }
                    return m[1] == 0 ? n == 0 : n % m[1] == 0 && n / m[1] >= 0;
                };
            }(p, match));
            return fn;
        }
    };
    pseudo["nth-last-child"] = pseudo["nth-of-type"] = pseudo["nth-last-of-type"] = pseudo["nth-child"];
    
    engine = function (selector, candidates) {
        if (typeof domChange == "undefined") {
            cache = {};
        }
        var tag, id, c, combinator, l, fn,
        count = 0,
        savedStamp = stamper++,
        saved = [],
        chunk = "",
        whole = "",
        candidatesToSaved = function () {
            for (var l = candidates.length, i = -1; ++i < l;) {
                if (candidates[i].$saved != savedStamp) {
                    candidates[i].$saved = savedStamp;
                    saved[count++] = candidates[i];
                }
            }
            candidates = null;
            if (!cache[whole] || !cache[whole].norepeat) {
                cache[whole] = saved.concat();
                cache[whole].norepeat = 1;
            }
        };
        if (candidates && !candidates.length) {
            candidates = [candidates];
        } else if (cache[selector]) {
            if (typeof cache[selector] == "string") {
                throw cache[selector];
            }
            if (cache[selector].norepeat) {
                return cache[selector];
            }
            candidates = cache[selector];
            candidatesToSaved();
            return saved;
        } else if (!candidates && qsa && /[ +~>,:\[]/.test(selector)) {
            try {
                cache[selector] = toArray(document.querySelectorAll(selector));
                cache[selector].norepeat = 1;
                return cache[selector];
            } catch (e) {}
        }
        selector.replace(/(?:([#.:])?((?:[\w-*]|\\[:.])+)(?:\( *['"]?([^)]+?)['"]? *\))?)|(?:\[(?:(\w+?))(?: ?([~!\^$*|]?=) *['"]?([^\]]+?)['"]?)? *?\])|(?: *([~>+ ]) *)|(?:,|$)/g, function (m, $1, $2, $3, $4, $5, $6, $7) {
            var nfn,
            end = !($1 || $2 || $3 || $4 || $5 || $6 || $7);
            /*
                 * The regexp captures as follows:
                 * 
                 * $1 - beginning special characters (".", "#", ":")
                 * $2 - id, class, tag, pseudo
                 * $3 - stuff in parenthesis
                 * $4 - attribute name
                 * $5 - attribute comparison ("=", "~=", "!=", etc.)
                 * $6 - attribute value
                 * $7 - combinators (" ", "+", "~", ">")
                 */
            if ($2) {
                if ($2.indexOf("\\") > 0) {
                    $2 = $2.replace(/\\/g, "");
                }
                switch ($1) {
                    case "#":
                        id = $2;
                        break;
                    case ".":
                        c = c ? c.concat(" ", $2) : $2;
                        break;
                    case ":":
                        if (pseudo[$2]) {
                            nfn = $3 ? pseudo[$2]($3, $2) : pseudo[$2];
                            switch (nfn) {
                                case false:
                                    candidates = [];
                                case true:
                                    nfn = undefined;
                            }
                        } else {
                            cache[selector] = "Unknown pseudo selector: " + $2;
                            throw cache[selector];
                        }
                        break;
                    default:
                        tag = $2 != "*" ? $2 : "";
                }
            } else if ($4) {
                /*
                     * This is where CSS <= 3 attribute selectors are weeded through
                     * attr represents the attribute; matchType is the type of match it
                     * will look for in the attribute's value (value).
                     *
                     * Ex: [attribute=something]
                     * attr - "attribute"
                     * matchType - "="
                     * value - "something"
                     */
                (function (attr, matchType, value) {
                    nfn = function (c) {
                        var a = attr.toLowerCase() == "class" ? c.className : c.getAttribute(attr);
                        switch (matchType) {
                            case "~=":
                                return a && (a == value || a.indexOf(value + " ") == 0 || a.indexOf(" " + value + " ") > 0 || (a.indexOf(" " + value) > 0 && a.indexOf(" " + value) == a.length - value.length - 1));
                            case "^=":
                                return a && a.indexOf(value) == 0;
                            case "!=":
                                return !a || a != value;
                            case "$=":
                                return a && a.indexOf(value, a.length - value.length) > -1;
                            case "*=":
                                return a && a.indexOf(value) > -1;
                            case "|=":
                                return a && (a == value || a.substr(0, value.length + 1) == value + "-");
                            case "=":
                                return a == value;
                            default:
                                return a;
                        }
                    };
                }($4, $5, $6));
            }
            if (nfn) {
                (function (oldFn, newFn) {
                    fn = oldFn ?
                    function (c) {
                        if (oldFn(c)) {
                            return newFn(c);
                        }
                        return false;
                    }
                    :
                    function (c) {
                        return newFn(c);
                    };
                }(fn, nfn));
                nfn = undefined;
            }
            if (($7 || end) && (tag || id || c || fn)) {
                candidates = cache[chunk] || (cache[chunk] = getEls(tag, id, c, fn, combinator, candidates, chunk));
                tag = id = c = fn = undefined;
                if ($7) {
                    combinator = $7;
                }
            }
            if (end) {
                whole += chunk;
                chunk = "";
                combinator = undefined;
                candidatesToSaved();
                whole += m;
            } else {
                chunk += m;
            }
            return m;
        });
        if (whole != selector) {
            count = -1;
            while (whole.charAt(++count) == selector.charAt(count)) {}
            cache[selector] = "Invalid selector at position " + count;
            throw cache[selector];
        }
        return saved;
    };
}(document));