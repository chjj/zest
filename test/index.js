var connect = require('connect'),
    app = connect.createServer();

app.use(connect.static(__dirname));
app.use(connect.static(__dirname + '/..'));

app.listen(8080);