var connect = require('connect')
  , app = connect.createServer();

var static = connect.static;
connect.static = function() {
  var func = static.apply(connect, arguments);
  return function(req, res, next) {
    var setHeader = res.setHeader;
    res.setHeader = function(name) {
      res.setHeader = setHeader;
      switch (name) {
        case 'Cache-Control':
        case 'Last-Modified':
        case 'ETag':
          return;
      }
      return setHeader.apply(res, arguments);
    };
    return func(req, res, next);
  };
};

app.use(connect.static(__dirname));
app.use(connect.static(__dirname + '/../lib'));

app.listen(8080);
