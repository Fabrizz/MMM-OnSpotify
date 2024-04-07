/* eslint-disable jsdoc/require-jsdoc */

/*
 * MMM-OnSpotify
 * MIT License
 *
 * By Fabrizio <3 (Fabrizz)
 *
 * Based on the example oAuth2 flow from:
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 * and Raywoo implementation:
 * https://github.com/raywo/MMM-NowPlayingOnSpotify/tree/master/authorization
 */
const querystring = require("querystring");
const express = require("express");
const request = require("request");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const port = 8100;
const version = "V1.3";

let client_id = "";
let client_secret = "";
let redirect_uri = "";

function generateRandomString(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function getError() {
  let error = "";
  if (!client_id) error = "clientID";
  if (!client_secret) error += ", clientSecret";
  return error;
}

function redirectToError(response, error) {
  let url = "/#";
  let urlParams = {
    error: error,
    clientID: client_id,
    clientSecret: client_secret,
  };
  response.redirect(url + querystring.stringify(urlParams));
}

function redirectToAuthorization(response, state) {
  // your application requests authorization
  const scope =
    "user-read-playback-state user-read-currently-playing user-top-read user-read-private";
  let url = "https://accounts.spotify.com/authorize?";
  let urlParams = {
    response_type: "code",
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
  };
  response.redirect(url + querystring.stringify(urlParams));
}

function getAuthOptions(code) {
  return {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`,
      ).toString("base64")}`,
    },
    json: true,
  };
}

function redirectToSuccess(response, body) {
  let access_token = body.access_token;
  let refresh_token = body.refresh_token;
  // we can also pass the token to the browser to make requests from there
  response.redirect(
    `/#${querystring.stringify({
      access_token: access_token,
      refresh_token: refresh_token,
      client_id: client_id,
      client_secret: client_secret,
    })}`,
  );
}

let stateKey = "spotify_auth_state";
let app = express();
app.use(express.static(`${__dirname}/client`));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/login", function (req, response) {
  let state = generateRandomString(16);
  response.cookie(stateKey, state);

  client_id = req.body.clientID;
  client_secret = req.body.clientSecret;
  redirect_uri = req.body.redirectURI;

  let error = getError();

  if (error) {
    redirectToError(response, error);
  } else {
    redirectToAuthorization(response, state);
  }
});
app.get("/callback", function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    redirectToError(res, "state_mismatch");
  } else {
    res.clearCookie(stateKey);

    request.post(getAuthOptions(code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        redirectToSuccess(res, body);
      } else {
        redirectToError(res, "invalid_token");
      }
    });
  }
});

console.log(
  `[\x1b[35mMMM-OnSpotify\x1b[0m] Authorization Service 🗝  >> By Fabrizz \x1b[90mVersion: ${version}\x1b[0m`,
);
console.log(
  `[\x1b[35mMMM-OnSpotify\x1b[0m] Authorization Service 🗝  >> \x1b[32mVisit http://localhost:${port}/ to configure your mirror.\x1b[0m`,
);

app.listen(port);
