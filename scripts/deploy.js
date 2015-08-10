var http = require('http');
var crypto = require('crypto');
var child_process = require('child_process');
http.createServer(function(req, res) {
    if (req.method === 'POST' && req.headers['user-agent'] && req.headers['user-agent'].indexOf('GitHub-Hookshot/') === 0 && req.headers['x-github-event'] && req.headers['x-github-event'] === 'push' && req.headers['x-hub-signature']) {
        var payload = "";
        req.on('data', function(data) {
            payload += data;
            if (payload.length > 1e6) {
                res.end();
                req.connection.destroy();
            }
        });
        req.on('end', function() {
            var hash = crypto.createHmac('sha1', 'asdjooqwerh3g4!@34yi').update(payload).digest('hex');
            var signature = req.headers['x-hub-signature'].substring(req.headers['x-hub-signature'].indexOf('=') + 1);
            payload = JSON.parse(payload);
            if (payload.ref === 'refs/heads/master' && hash === signature) {
                var deploy = child_process.spawn('sh', ['deploy.sh']);
                deploy.on('end', function() {
                    res.end();
                    req.connection.destroy();
                });
            } else {
                res.end();
                req.connection.destroy();
            }
        });
    }
}).listen(3001);


