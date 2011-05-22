require('vanilla')
  .listen(8080)
  .set('static', __dirname)
  .get('/', function(req, res) {
    res.send(__dirname + '/index.html');
  })
  .get('/zest.js', function(req, res) {
    res.send(require('path').normalize(__dirname + '/../zest.js'));
  });