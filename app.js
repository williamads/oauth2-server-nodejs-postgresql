
var express = require('express'),
	bodyParser = require('body-parser'),
	OAuth2Server = require('oauth2-server'),
	Request = OAuth2Server.Request,
	Response = OAuth2Server.Response;

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.oauth = new OAuth2Server({
	model: require('./model.js'),
	accessTokenLifetime: 60 * 60,
	allowBearerTokensInQueryString: true
});

// app.all('/oauth/token', obtainToken);

app.post('/create', require('./model').createUser);
app.delete('/delete/:id', require('./model').deleteUser);
app.put('/update/:id', require('./model').updateUser)

app.all('/oauth/token', function(req, res) {

	var request = new Request(req);
	var response = new Response(res);

	return app.oauth.token(request, response).then(function(token) {
		res.json(token);
	}).catch(function(err) {
			res.status(err.code || 500).json(err);
		});
	}
);


app.get('/', authenticateRequest, function(req, res) {

	res.send('Congratulations, you are in a secret area!');
});

console.log("Servidor Rodando na Porta 3000");
app.listen(3000);

function obtainToken(req, res) {

	var request = new Request(req);
	var response = new Response(res);

	return app.oauth.token(request, response)
		.then(function(token) {

			res.json(token);
		}).catch(function(err) {

			res.status(err.code || 500).json(err);
		});
}

function authenticateRequest(req, res, next) {

	var request = new Request(req);
	var response = new Response(res);

	return app.oauth.authenticate(request, response)
		.then(function(token) {

			next();
		}).catch(function(err) {

			res.status(err.code || 500).json(err);
		});
}
