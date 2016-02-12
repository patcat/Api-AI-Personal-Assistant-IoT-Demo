var express = require("express"),
    app = express(),
    ejs = require("ejs"),
    https = require("https"),
    fs = require("fs"),
    bodyParser = require("body-parser"),
    passport = require("passport"),
    JawboneStrategy = require("passport-oauth").OAuth2Strategy,
    port = 5000,
    jawboneAuth = {
      clientID: "YOUR_CLIENT_ID",
      clientSecret: "YOUR_CLIENT_SECRET",
      authorizationURL: "https://jawbone.com/auth/oauth2/auth",
      tokenURL: "https://jawbone.com/auth/oauth2/token",
      callbackURL: "https://localhost:5000/barry"
    },
    sslOptions = {
      key: fs.readFileSync("./server.key"),
      cert: fs.readFileSync("./server.crt")
    },
    up,
    options;

app.use(bodyParser.json());

app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// ----- Passport set up ----- //
app.use(passport.initialize());

app.get("/login/jawbone", 
  passport.authorize("jawbone", {
    scope: ["basic_read","sleep_read"],
    failureRedirect: "/"
  })
);

app.get("/sleep_data", function(req, resp) {
  if (up !== undefined) {
    up.sleeps.get({}, function(err, body) {
      if (err) {
        console.log("Error receiving Jawbone UP data");
      } else {
        var jawboneData = JSON.parse(body).data;

        if (jawboneData.items) {
          resp.send(jawboneData);
        } else {
          console.log("Error: " + jawboneData);
          resp.send({"error": "Your sleep tracker isn't talking to me. Let's try logging in again."});
        }
      }
    });
  } else {
    console.log("Up is not ready, lets ask to log in.");
    resp.send({"error": "Your sleep tracker isn't talking to me. Let's try logging in again."});
  }
});

app.get("/barry",
  passport.authorize("jawbone", {
    scope: ["basic_read","sleep_read"],
    failureRedirect: "/"
  }), function(req, res) {
    res.render("index");
  }
);

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/", function(req, res) {
  res.render("index");
});

passport.use("jawbone", new JawboneStrategy({
  clientID: jawboneAuth.clientID,
  clientSecret: jawboneAuth.clientSecret,
  authorizationURL: jawboneAuth.authorizationURL,
  tokenURL: jawboneAuth.tokenURL,
  callbackURL: jawboneAuth.callbackURL
}, function(token, refreshToken, profile, done) {
  options = {
    access_token: token,
    client_id: jawboneAuth.clientID,
    client_secret: jawboneAuth.clientSecret
  };
  
  up = require("jawbone-up")(options);

  return done(null, options, console.log("Jawbone UP data ready to be displayed — ", options));
}));

var secureServer = https.createServer(sslOptions, app).listen(port, function(){
  console.log("UP server listening on " + port);
});