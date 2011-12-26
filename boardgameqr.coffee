QRCode = require 'qrcode'
Connect = require 'connect'
Mu = require 'mu2'

Mu.root = process.cwd() + '/templates'

Connect.createServer()
.use '/', Connect.router (app) ->
  app.get '/', (req, res, next) ->
    # TODO: Show search form with autocomplete like
    # http://www.boardgamegeek.com/xmlapi2/search?query=vivajava&type=boardgame
    res.writeHead 200, {"Content-Type": "text/plain"}
    res.end "Got here"
  app.get '/game/:id', (req, res, next) ->
    geekURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/#collection"
    res.writeHead 302, {"Location": geekURL}
    res.end "Got here"
  app.get '/game/:id/qr', (req, res, next) ->
    gameURL = "http://" + req.headers.host + "/game/" + req.params.id + "/"
    res.writeHead 200, {'Content-Type': "text/html"}
    QRCode.toDataURL gameURL, (err, url) ->
      Mu.compile 'qrcode.html', (err, parsed) ->  
        if err
          console.log 'Error compiling template'

        view = { title: 'Board Game QR', qrcode_url: url }

        buffer = ''
        stream = Mu.render parsed, view

        stream.on 'data', (c) -> buffer += c
        stream.on 'end', () -> res.end buffer
.listen 8080
    
