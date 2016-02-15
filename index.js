var server = require('./server/server');

var port = (process.env.PORT || 31333);
server.startServer(port);