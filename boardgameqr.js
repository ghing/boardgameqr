(function() {
  var Connect, Crypto, Mu, Parser, Pg, QRCode, Request, SECRET_KEY, buildPlayLogPostBody, connectionString, doAuth, encryptPassword, getBggCredentials, port;

  QRCode = require('qrcode');

  Connect = require('connect');

  Mu = require('mu2');

  Request = require('request');

  Parser = require('xml2json');

  Pg = require('pg')["native"];

  Crypto = require('crypto');

  Mu.root = process.cwd() + '/templates';

  SECRET_KEY = '_nn)gf-=isg=^37o&^0dgjn71xvq&am*shau38a^^yf3-kdw0lci)xfz+2)';

  connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/boardgameqr';

  port = process.env.PORT || 8080;

  buildPlayLogPostBody = function(gameId, date) {
    var formattedDate, month;
    month = date.getMonth() + 1;
    formattedDate = date.getFullYear() + '-' + month + '-' + date.getDate();
    return "ajax=1&action=save&version=2&objecttype=thing&objectid=" + gameId + "&playid=&action=save&playdate=" + formattedDate + "&dateinput=" + formattedDate + "&YUIButton=&twitter=0&savetwitterpref=0&location=&quantity=1&length=&incomplete=0&nowinstats=0&comments=";
  };

  encryptPassword = function(password) {
    var shasum;
    shasum = Crypto.createHash('sha512');
    shasum.update(SECRET_KEY + password);
    return shasum.digest('hex');
  };

  doAuth = function(user, pass, callback) {
    var authenticated, client, encPass, query;
    encPass = encryptPassword(pass);
    authenticated = false;
    client = new Pg.Client(connectionString);
    client.connect();
    query = client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [user, encPass]);
    query.on('row', function(row) {
      return authenticated = true;
    });
    return query.on('end', function() {
      if (authenticated) {
        return callback(false, user);
      } else {
        return callback(true);
      }
    });
  };

  getBggCredentials = function(user, callback) {
    var bggpassword, bggusername, client, err, query;
    bggusername = null;
    bggpassword = null;
    err = true;
    client = new Pg.Client(connectionString);
    client.connect();
    query = client.query('SELECT bggusername, bggpassword FROM users WHERE username = $1', [user]);
    query.on('row', function(row) {
      err = false;
      bggusername = row.bggusername;
      return bggpassword = row.bggpassword;
    });
    return query.on('end', function() {
      return callback(err, bggusername, bggpassword);
    });
  };

  Connect.createServer().use('/', Connect.query()).use('/game', Connect.basicAuth(function(user, pass, callback) {
    return doAuth(user, pass, callback);
  })).use('/', Connect.router(function(app) {
    return app.get('/', function(req, res, next) {
      res.writeHead(200, {
        "Content-Type": "text/html"
      });
      Mu.compile('qrcode.html', function(err, parsed) {
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
      app.get('/game/:id', function(req, res, next) {
        return getBggCredentials(req.remoteUser, function(err, bggusername, bggpassword) {
          var expires, geekURL, j, millisecondsInYr, password_cookie, today, username_cookie;
          if (!err && (bggusername != null) && (bggpassword != null)) {
            geekURL = "http://boardgamegeek.com/geekplay.php";
            j = Request.jar();
            millisecondsInYr = 31556926000;
            today = new Date();
            expires = new Date(today.getTime() + millisecondsInYr);
            username_cookie = Request.cookie('bggusername=' + bggusername + ';path=/; expires=' + expires.toString());
            j.add(username_cookie);
            password_cookie = Request.cookie('bggpassword=' + bggpassword + '; path=/; expires=' + expires.toString());
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
                gameURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/";
                res.writeHead(302, {
                  "Location": gameURL
                });
                return res.end("Redirecting to Board Game Geek");
              }
            });
          } else {
            res.writeHead(200, {
              "Content-Type": "text/html"
            });
            return res.end("Error logging play");
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
          return Request('http://www.boardgamegeek.com/xmlapi2/thing?id=' + req.params.id, function(error, response, body) {
            var gameName, gamePublished, hasMetadata, item, js;
            hasMetadata = false;
            gameName = null;
            gamePublished = null;
            if (!error && response.statusCode === 200) {
              js = Parser.toJson(body, {
                object: true
              });
              if (js.items.item != null) {
                hasMetadata = true;
                item = js.items.item;
                if (item.name.length != null) {
                  gameName = item.name[0].value;
                } else {
                  gameName = item.name.value;
                }
                gamePublished = item.yearpublished.value;
              }
            }
            return Mu.compile('qrcode.html', function(err, parsed) {
              var buffer, stream, view;
              if (err) console.log('Error compiling template');
              view = {
                title: 'Board Game QR',
                has_qrcode: true,
                qrcode_url: url,
                has_metadata: hasMetadata,
                name: gameName,
                yearpublished: gamePublished
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
          var client, encPass, query, userData, userResponse;
          try {
            userData = JSON.parse(buffer);
            if ((userData.username != null) && (userData.password != null) && (userData.email != null) && (userData.bggusername != null) && (userData.bggpassword != null)) {
              encPass = encryptPassword(userData.password);
              userResponse = {
                'username': userData.username,
                'uri': '/api/0.1/users/' + userData.username
              };
              client = new Pg.Client(connectionString);
              client.connect();
              query = client.query('INSERT INTO users(username, password, email, bggusername, bggpassword) VALUES($1, $2, $3, $4, $5)', [userData.username, encPass, userData.email, userData.bggusername, userData.bggpassword]);
              query.on('end', function() {
                return client.end();
              });
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
    });
  })).use('/public', Connect.static(__dirname + '/public')).listen(port);

}).call(this);
