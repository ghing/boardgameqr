(function() {
  var BGG_PASSWORD, BGG_USERNAME, Connect, Mu, Parser, QRCode, Request, buildPlayLogPostBody, port;

  QRCode = require('qrcode');

  Connect = require('connect');

  Mu = require('mu2');

  Request = require('request');

  Parser = require('xml2json');

  Mu.root = process.cwd() + '/templates';

  BGG_USERNAME = 'ghing';

  BGG_PASSWORD = 'dk10mb8mmj9jqdqr2kxc9cgvpqv5n2rcz';

  port = process.env.PORT || 8080;

  buildPlayLogPostBody = function(gameId, date) {
    var formattedDate, month;
    month = date.getMonth() + 1;
    formattedDate = date.getFullYear() + '-' + month + '-' + date.getDate();
    return "ajax=1&action=save&version=2&objecttype=thing&objectid=" + gameId + "&playid=&action=save&playdate=" + formattedDate + "&dateinput=" + formattedDate + "&YUIButton=&twitter=0&savetwitterpref=0&location=&quantity=1&length=&incomplete=0&nowinstats=0&comments=";
  };

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
      var expires, geekURL, j, millisecondsInYr, password_cookie, today, username_cookie;
      geekURL = "http://boardgamegeek.com/geekplay.php";
      j = Request.jar();
      millisecondsInYr = 31556926000;
      today = new Date();
      expires = new Date(today.getTime() + millisecondsInYr);
      username_cookie = Request.cookie('bggusername=' + BGG_USERNAME + ';path=/; expires=' + expires.toString());
      j.add(username_cookie);
      password_cookie = Request.cookie('bggpassword=' + BGG_PASSWORD + '; path=/; expires=' + expires.toString());
      j.add(password_cookie);
      return Request.post({
        url: geekURL,
        jar: j,
        body: buildPlayLogPostBody(req.params.id, today),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }, function(error, response, body) {
        var gameURL;
        if (!error && response.statusCode === 200) {
          console.log(response);
          gameURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/";
          res.writeHead(302, {
            "Location": gameURL
          });
          return res.end("Redirecting to Board Game Geek");
        }
      });
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
    app.get('/signup', function(req, res, next) {
      res.writeHead(200, {
        "Content-Type": "text/html"
      });
      return Mu.compile('signup.html', function(err, parsed) {
        var buffer, stream, view;
        if (err) console.log('Error compiling template');
        view = {
          title: 'Board Game QR'
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
    app.get('/api/0.1/games/autocomplete', function(req, res, next) {
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
    return app.post('/api/0.1/users', function(req, res, next) {
      var buffer;
      buffer = '';
      req.on('data', function(c) {
        return buffer += c;
      });
      return req.on('end', function() {
        var userData, userResponse;
        try {
          console.log(buffer);
          userData = JSON.parse(buffer);
          if ((userData.username != null) && (userData.password != null) && (userData.email != null) && (userData.bggusername != null) && (userData.bggpassword != null)) {
            userResponse = {
              'username': userData.username,
              'uri': '/api/0.1/users/' + userData.username
            };
            res.writeHead(201, {
              'Content-Type': 'application/json'
            });
            return res.end(JSON.stringify(userResponse));
          } else {
            res.writeHead(400, {
              'Content-Type': 'application/json'
            });
            return res.end(JSON.stringify({
              'error': 'Missing user attribute'
            }));
          }
        } catch (error) {
          res.writeHead(400, {
            'Content-Type': 'application/json'
          });
          return res.end(JSON.stringify({
            'error': error.toString()
          }));
        }
      });
    });
  })).use('/public', Connect.static(__dirname + '/public')).listen(port);

}).call(this);
