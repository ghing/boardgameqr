QRCode = require 'qrcode'
Connect = require 'connect'
Mu = require 'mu2'
Request = require 'request'
Parser = require 'xml2json'

Mu.root = process.cwd() + '/templates'

BGG_USERNAME = 'ghing'
BGG_PASSWORD = 'dk10mb8mmj9jqdqr2kxc9cgvpqv5n2rcz'

port = process.env.PORT || 8080

buildPlayLogPostBody = (gameId, date) ->
  month = date.getMonth() + 1
  formattedDate = date.getFullYear() + '-' + month + '-' + date.getDate()
  return "ajax=1&action=save&version=2&objecttype=thing&objectid=" + gameId + "&playid=&action=save&playdate=" + formattedDate + "&dateinput=" + formattedDate + "&YUIButton=&twitter=0&savetwitterpref=0&location=&quantity=1&length=&incomplete=0&nowinstats=0&comments="

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
      # Log a play on the Board Game Geek site.
      geekURL = "http://boardgamegeek.com/geekplay.php"
      j = Request.jar()
      millisecondsInYr = 31556926000
      today = new Date()
      expires = new Date today.getTime() + millisecondsInYr
      username_cookie = Request.cookie 'bggusername=' + BGG_USERNAME + ';path=/; expires=' + expires.toString()
      j.add username_cookie
      password_cookie = Request.cookie 'bggpassword=' + BGG_PASSWORD + '; path=/; expires=' + expires.toString()
      j.add password_cookie
      Request.post {url: geekURL, jar: j, body: buildPlayLogPostBody(req.params.id, today), headers: {'Content-Type': 'application/x-www-form-urlencoded' } }, (error, response, body) ->
        if not error and response.statusCode == 200
          console.log response
          gameURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/"
          res.writeHead 302, {"Location": gameURL}
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

    app.get '/signup', (req, res, next) ->
      res.writeHead 200, {"Content-Type": "text/html"}
      Mu.compile 'signup.html', (err, parsed) ->
        if err
          console.log 'Error compiling template'

        view = { title: 'Board Game QR' }

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

    app.post '/api/0.1/users', (req, res, next) ->
      buffer = ''
      req.on 'data', (c) -> buffer += c
      req.on 'end', () ->
        try
          console.log buffer
          userData = JSON.parse(buffer)
          if userData.username? and userData.password? and userData.email? and userData.bggusername? and userData.bggpassword?
            userResponse = {'username': userData.username, 'uri': '/api/0.1/users/' + userData.username}
            res.writeHead 201, {'Content-Type': 'application/json'}
            res.end JSON.stringify(userResponse)
            # TODO: Write this to Postgres database
          else
            res.writeHead 400, {'Content-Type': 'application/json'}
            res.end JSON.stringify({'error': 'Missing user attribute'})

        catch error
          res.writeHead 400, {'Content-Type': 'application/json'}
          res.end JSON.stringify({'error': error.toString()})

.use('/public', Connect.static __dirname + '/public')
.listen port
