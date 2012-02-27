var spawn = require('child_process').spawn;

var express = require('express')
  , app = express.createServer();

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

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/../lib'));

var proto = express.static(__dirname + '/proto');
app.use('/proto', function(req, res, next) {
  var child = spawn(__dirname + '/proto/update');
  child.on('exit', function() {
    proto(req, res, next);
  });
});

app.listen(8080);
