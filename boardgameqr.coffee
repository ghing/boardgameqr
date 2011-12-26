QRCode = require 'qrcode'
Connect = require 'connect'
Mu = require 'mu2'
Request = require 'request'
Parser = require 'xml2json'

Mu.root = process.cwd() + '/templates'

port = process.env.PORT || 8080

Connect.createServer()
.use('/', Connect.query())
.use '/', Connect.router (app) ->
    app.get '/', (req, res, next) ->
      res.writeHead 200, {"Content-Type": "text/html"}
      Mu.compile 'qrcode.html', (err, parsed) ->
        if err
          console.log 'Error compiling template'

        view = { title: 'Board Game QR', has_qrcode: false }

        buffer = ''
        stream = Mu.render parsed, view

        stream.on 'data', (c) -> buffer += c
        stream.on 'end', () -> res.end buffer

    app.get '/game/:id', (req, res, next) ->
      geekURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/#collection"
      res.writeHead 302, {"Location": geekURL}
      res.end "Redirecting to Board Game Geek"
    app.get '/qr/game/:id', (req, res, next) ->
      gameURL = "http://" + req.headers.host + "/game/" + req.params.id + "/"
      res.writeHead 200, {'Content-Type': "text/html"}
      QRCode.toDataURL gameURL, (err, url) ->
        Mu.compile 'qrcode.html', (err, parsed) ->
          if err
            console.log 'Error compiling template'

          view = { title: 'Board Game QR', has_qrcode: true, qrcode_url: url }

          buffer = ''
          stream = Mu.render parsed, view

          stream.on 'data', (c) -> buffer += c
          stream.on 'end', () -> res.end buffer

    app.get '/api/0.1/games/autocomplete', (req, res, next) ->
      Request 'http://www.boardgamegeek.com/xmlapi2/search?type=boardgame&query=' + req.query.term, (error, response, body) ->
        if not error and response.statusCode == 200
          js = Parser.toJson body, {object: true}
          items = []
          if js.items.item?
            items = ({ label: item.name.value, value: item.id } for item in js.items.item)
          
          res.writeHead 200, {'Content-Type': 'application/json'}
          res.end JSON.stringify(items)

.use('/public', Connect.static __dirname + '/public')
.listen port
