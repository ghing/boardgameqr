QRCode = require 'qrcode'
Connect = require 'connect'
Mu = require 'mu2'
Request = require 'request'
Parser = require 'xml2json'
Pg = require('pg').native
Crypto = require('crypto')

Mu.root = process.cwd() + '/templates'

# Used for password salt
# Change this value in your implementation
SECRET_KEY = '_nn)gf-=isg=^37o&^0dgjn71xvq&am*shau38a^^yf3-kdw0lci)xfz+2)'

connectionString = process.env.DATABASE_URL ||  'postgres://localhost:5432/boardgameqr'

port = process.env.PORT || 8080

buildPlayLogPostBody = (gameId, date) ->
  month = date.getMonth() + 1
  formattedDate = date.getFullYear() + '-' + month + '-' + date.getDate()
  return "ajax=1&action=save&version=2&objecttype=thing&objectid=" + gameId + "&playid=&action=save&playdate=" + formattedDate + "&dateinput=" + formattedDate + "&YUIButton=&twitter=0&savetwitterpref=0&location=&quantity=1&length=&incomplete=0&nowinstats=0&comments="

encryptPassword = (password) ->
  shasum = Crypto.createHash 'sha512'
  shasum.update SECRET_KEY + password
  return shasum.digest('hex')

doAuth = (user, pass, callback) ->
  encPass = encryptPassword pass
  authenticated = false
  
  client = new Pg.Client connectionString
  client.connect()
  query = client.query 'SELECT * FROM users WHERE username = $1 AND password = $2', [user, encPass]
  query.on 'row', (row) ->
    authenticated = true

  query.on 'end', () ->
    if authenticated
      callback(false, user)
    else
      callback(true)

getBggCredentials = (user, callback) ->
  bggusername = null
  bggpassword = null
  err = true
  client = new Pg.Client connectionString
  client.connect()
  query = client.query 'SELECT bggusername, bggpassword FROM users WHERE username = $1', [user]
  query.on 'row', (row) ->
    err = false
    bggusername = row.bggusername
    bggpassword = row.bggpassword

  query.on 'end', () ->
    callback(err, bggusername, bggpassword)

Connect.createServer()
.use('/', Connect.query())
.use '/game', Connect.basicAuth (user, pass, callback) ->
  doAuth(user, pass, callback)

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
      getBggCredentials req.remoteUser, (err, bggusername, bggpassword) ->
        if not err and bggusername? and bggpassword?
          geekURL = "http://boardgamegeek.com/geekplay.php"
          j = Request.jar()
          millisecondsInYr = 31556926000
          today = new Date()
          expires = new Date today.getTime() + millisecondsInYr
          username_cookie = Request.cookie 'bggusername=' + bggusername + ';path=/; expires=' + expires.toString()
          j.add username_cookie
          password_cookie = Request.cookie 'bggpassword=' + bggpassword + '; path=/; expires=' + expires.toString()
          j.add password_cookie
          Request.post {url: geekURL, jar: j, body: buildPlayLogPostBody(req.params.id, today), headers: {'Content-Type': 'application/x-www-form-urlencoded' } }, (error, response, body) ->
            if not error and response.statusCode == 200
              gameURL = "http://boardgamegeek.com/boardgame/" + req.params.id + "/"
              res.writeHead 302, {"Location": gameURL}
              res.end "Redirecting to Board Game Geek"

        else
          res.writeHead 200, {"Content-Type": "text/html"}
          res.end "Error logging play"

    app.get '/qr/game/:id', (req, res, next) ->
      gameURL = "http://" + req.headers.host + "/game/" + req.params.id + "/"
      res.writeHead 200, {'Content-Type': "text/html"}
      QRCode.toDataURL gameURL, (err, url) ->
        Request 'http://www.boardgamegeek.com/xmlapi2/thing?id=' + req.params.id, (error, response, body) ->
          hasMetadata = false
          gameName = null
          gamePublished = null
          if not error and response.statusCode == 200
            js = Parser.toJson body, {object: true}
            if js.items.item?
              hasMetadata = true
              item = js.items.item
              gameName = item.name[0].value
              gamePublished = item.yearpublished.value

          Mu.compile 'qrcode.html', (err, parsed) ->
            if err
              console.log 'Error compiling template'

            view = { title: 'Board Game QR', has_qrcode: true, qrcode_url: url, has_metadata: hasMetadata, name: gameName, yearpublished: gamePublished }

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
          userData = JSON.parse(buffer)
          if userData.username? and userData.password? and userData.email? and userData.bggusername? and userData.bggpassword?
            encPass = encryptPassword userData.password
            userResponse = {'username': userData.username, 'uri': '/api/0.1/users/' + userData.username}
            client = new Pg.Client connectionString
            client.connect()
            query = client.query 'INSERT INTO users(username, password, email, bggusername, bggpassword) VALUES($1, $2, $3, $4, $5)', [userData.username, encPass, userData.email, userData.bggusername, userData.bggpassword]
            query.on 'end', () -> client.end()
            res.writeHead 201, {'Content-Type': 'application/json'}
            res.end JSON.stringify(userResponse)
          else
            res.writeHead 400, {'Content-Type': 'application/json'}
            res.end JSON.stringify({'error': 'Missing user attribute'})

        catch error
          res.writeHead 400, {'Content-Type': 'application/json'}
          res.end JSON.stringify({'error': error.toString()})

.use('/public', Connect.static __dirname + '/public')
.listen port
