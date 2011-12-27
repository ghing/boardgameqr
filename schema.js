(function() {
  var Pg, client, connectionString, query;

  Pg = require('pg')["native"];

  connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/boardgameqr';

  client = new Pg.Client(connectionString);

  client.connect();

  query = client.query("CREATE TABLE users (  id SERIAL PRIMARY KEY,  username VARCHAR(75) NOT NULL UNIQUE,  password VARCHAR(128) NOT NULL,  email VARCHAR(75),  bggusername VARCHAR(75) NOT NULL,  bggpassword VARCHAR(128) NOT NULL,  created TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp);");

  query.on('end', function() {
    return client.end();
  });

}).call(this);
