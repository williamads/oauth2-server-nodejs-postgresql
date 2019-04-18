const Pool = require('pg').Pool
const pool = new Pool({
    user: 'me',
    host: 'localhost',
    database: 'api',
    password: 'password',
    port: 5432,
})

/**
 * Configuration.
 */

var config = {
	clients: [{
		id: 'application',	// TODO: Needed by refresh_token grant, because there is a bug at line 103 in https://github.com/oauthjs/node-oauth2-server/blob/v3.0.1/lib/grant-types/refresh-token-grant-type.js (used client.id instead of client.clientId)
		clientId: 'application',
		clientSecret: 'secret',
		grants: [
			'password',
			'refresh_token'
		],
		redirectUris: []
	}],
	confidentialClients: [{
		clientId: 'confidentialApplication',
		clientSecret: 'topSecret',
		grants: [
			'password',
			'client_credentials'
		],
		redirectUris: []
	}],
	tokens: [],
	users: [{
		username: 'willian@example.com',
		password: 'senha'
	}]
};

/**
 * Dump the memory storage content (for debug).
 */

var dump = function() {

	console.log('clients', config.clients);
	console.log('confidentialClients', config.confidentialClients);
	console.log('tokens', config.tokens);
	console.log('users', config.users);
};

const createUser = (request, response) => {
    const { name, email, password } = request.body

    pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email, password], (error, results) => {
        if (error) {
            throw error
        }
        response.status(201).send(`User added`)
    })
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}

const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { name, email } = request.body

    pool.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [name, email, id],
        (error, results) => {
            if (error) {
                throw error
            }
            response.status(200).send(`User modified with ID: ${id}`)
        }
    )
}

/*
 * Methods used by all grant types.
 */

var getAccessToken = function(token) {

	var tokens = config.tokens.filter(function(savedToken) {

		return savedToken.accessToken === token;
	});

	return tokens[0];
};

var getClient = function(clientId, clientSecret) {

	var clients = config.clients.filter(function(client) {

		return client.clientId === clientId && client.clientSecret === clientSecret;
	});

	var confidentialClients = config.confidentialClients.filter(function(client) {

		return client.clientId === clientId && client.clientSecret === clientSecret;
	});

	return clients[0] || confidentialClients[0];
};


// var saveToken = function(token, client, user) {

// 	token.client = {
// 		id: client.clientId
// 	};

// 	token.user = {
// 		id: user.username || user.clientId
// 	};

// 	config.tokens.push(token);

// 	return token;
// };


var saveToken = function(token, client, user) {
	token.client = {
		id: client.clientId
	};
	
	token.user = {
		id: user.username || user.clientId
	};
	
	// apagar esses push de tokens
	config.tokens.push(token);

	pool.query('INSERT INTO tokens (client, userr) VALUES ($1, $2)', [client.clientId, user.username], (error, results) =>{
		if(error){
			throw error
		}
		// response.json({ info : 'token salvo.'})
	})

	return token;
};

/*
 * Method used only by password grant type.
 */

var getUser = function(username, password) {
	return new Promise((resolve, reject) => {
		pool.query('SELECT email, password FROM users WHERE email = $1 AND password = $2', [username, password], function(error, result) {
	
			if (result.rowCount == 0) {
				return reject({});
			}
			else {
				console.log("Entrou");
				return resolve({username: result.rows[0].email, password: result.rows[0].password});
			}
		})
	});
};

/*
 * Method used only by client_credentials grant type.
 */

var getUserFromClient = function(client) {

	var clients = config.confidentialClients.filter(function(savedClient) {

		return savedClient.clientId === client.clientId && savedClient.clientSecret === client.clientSecret;
	});

	return clients[0];
};

/*
 * Methods used only by refresh_token grant type.
 */

var getRefreshToken = function(refreshToken) {

	var tokens = config.tokens.filter(function(savedToken) {

		return savedToken.refreshToken === refreshToken;
	});

	if (!tokens.length) {
		return;
	}

	var token = Object.assign({}, tokens[0]);
	token.user.username = token.user.id;

	return token;
};

var revokeToken = function(token) {

	config.tokens = config.tokens.filter(function(savedToken) {

		return savedToken.refreshToken !== token.refreshToken;
	});

	var revokedTokensFound = config.tokens.filter(function(savedToken) {

		return savedToken.refreshToken === token.refreshToken;
	});

	return !revokedTokensFound.length;
};

/**
 * Export model definition object.
 */

module.exports = {
	createUser: createUser,
	deleteUser: deleteUser,
	updateUser: updateUser,
	getAccessToken: getAccessToken,
	getClient: getClient,
	saveToken: saveToken,
	getUser: getUser,
	getUserFromClient: getUserFromClient,
	getRefreshToken: getRefreshToken,
	revokeToken: revokeToken
};
