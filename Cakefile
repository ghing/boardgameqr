{exec} = require 'child_process'
{spawn} = require 'child_process'

task 'build', 'Build project', ->
  exec 'coffee --compile boardgameqr.coffee', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr

task 'runserver', 'Run development server', ->
  # TODO: Figure out how to wait until build is done before running
  # the rest of this task
  # Until then, use 'cake build && cake runserver'
  #invoke 'build'
  server = spawn 'node', ['boardgameqr.js']
  server.stdout.on 'data', (data) ->
    console.log data.toString()
  server.stderr.on 'data', (data) ->
    console.log data.toString()
  server.on 'exit', (code) ->
    console.log 'Exited with code ' + code
