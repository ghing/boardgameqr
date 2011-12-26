(function() {
  var Connect, Mu, QRCode, port;

  QRCode = require('qrcode');

  Connect = require('connect');

  Mu = require('mu2');

  Mu.root = process.cwd() + '/templates';

  port = process.env.PORT || 8080;

  Connect.createServer().use('/', Connect.router(function(app) {
    app.get('/', function(req, res, next) {
      res.writeHead(200, {
        "Content-Type": "text/plain"
      });
      return res.end("Got here");
    });
    app.get('/game/:id', function(req, res, next) {
      var geekURL;
      geekURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/#collection";
      res.writeHead(302, {
        "Location": geekURL
      });
      return res.end("Got here");
    });
    return app.get('/game/:id/qr', function(req, res, next) {
      var gameURL;
      gameURL = "http://" + req.headers.host + "/game/" + req.params.id + "/";
      res.writeHead(200, {
        'Content-Type': "text/html"
      });
      return QRCode.toDataURL(gameURL, function(err, url) {
        return Mu.compile('qrcode.html', function(err, parsed) {
          var buffer, stream, view;
          if (err) console.log('Error compiling template');
          view = {
            title: 'Board Game QR',
            qrcode_url: url
          };
          buffer = '';
          stream = Mu.render(parsed, view);
          stream.on('data', function(c) {
            return buffer += c;
          });
          return stream.on('end', function() {
            return res.end(buffer);
          });
        });
      });
    });
  })).listen(port);

}).call(this);
