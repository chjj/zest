var fs = require('fs');

var express = require('express')
  , app = express();

app.use(function(req, res, next) {
  var setHeader = res.setHeader;
  res.setHeader = function(name) {
    switch (name) {
      case 'Cache-Control':
      case 'Last-Modified':
      case 'ETag':
        return;
    }
    return setHeader.apply(res, arguments);
  };
  next();
});

var static = express.static(__dirname);
app.use(function(req, res, next) {
  if (~req.url.indexOf('proto')) {
    // very ugly
    var zest = fs.readFileSync(__dirname + '/../lib/zest.js', 'utf8');
    var prototype = fs.readFileSync(__dirname + '/proto/prototype_.js', 'utf8');
    prototype = prototype.replace('// ___ZEST___', zest);
    fs.writeFileSync(__dirname + '/proto/prototype.js', prototype);
  }
  return static(req, res, next);
});

app.use(express.static(__dirname + '/../lib'));

app.listen(8080);
