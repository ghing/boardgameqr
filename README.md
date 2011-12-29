About
=====

My brother is into playing board games.  When I saw him over the holidays
he said, "It would be cool if you could scan a QR code on a game box and
automatically log your game play."  

"I think we can build that," I replied.

Board Game QR is a prototype of my brother's idea.  It generates a QR code
that encodes a unique URL for each game based on the games ID on
Board Game Geek, a popular gaming resource.  The URL acts sort of like a
webhook and when users visit it in their mobile browser (after being
directed there from their QR code reading app), they can provide their site
credentials and their play will be logged to the Board Game Geek site.

Users have to register and log in because of my hacky interface to the
Board Game Geek site. Since Board Game Geek doesn't allow for logging
plays through their XML API, I have to generate cookies and simulate a
browser AJAX request to do the logging.

This app is built for the Node Javascript framework and written in
Coffeescript. It's my first foray into coding using both technologies,
so it's definitely rough around the edges.

Check it out in action at http://boargameqr.herokuapp.com/
