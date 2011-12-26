(function() {
  var Connect, Mu, Parser, QRCode, Request, port;

  QRCode = require('qrcode');

  Connect = require('connect');

  Mu = require('mu2');

  Request = require('request');

  Parser = require('xml2json');

  Mu.root = process.cwd() + '/templates';

  port = process.env.PORT || 8080;

  Connect.createServer().use('/', Connect.query()).use('/', Connect.router(function(app) {
    app.get('/', function(req, res, next) {
      res.writeHead(200, {
        "Content-Type": "text/html"
      });
      return Mu.compile('qrcode.html', function(err, parsed) {
        var buffer, stream, view;
        if (err) console.log('Error compiling template');
        view = {
          title: 'Board Game QR',
          has_qrcode: false
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
    app.get('/game/:id', function(req, res, next) {
      var geekURL;
      geekURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/#collection";
      res.writeHead(302, {
        "Location": geekURL
      });
      return res.end("Redirecting to Board Game Geek");
    });
    app.get('/qr/game/:id', function(req, res, next) {
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
            has_qrcode: true,
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
    return app.get('/api/0.1/games/autocomplete', function(req, res, next) {
      return Request('http://www.boardgamegeek.com/xmlapi2/search?type=boardgame&query=' + req.query.term, function(error, response, body) {
        var item, items, js;
        if (!error && response.statusCode === 200) {
          js = Parser.toJson(body, {
            object: true
          });
          items = [];
          if (js.items.item != null) {
            items = (function() {
              var _i, _len, _ref, _results;
              _ref = js.items.item;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                item = _ref[_i];
                _results.push({
                  label: item.name.value,
                  value: item.id
                });
              }
              return _results;
            })();
          }
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          return res.end(JSON.stringify(items));
        }
      });
    });
  })).use('/public', Connect.static(__dirname + '/public')).listen(port);

}).call(this);
