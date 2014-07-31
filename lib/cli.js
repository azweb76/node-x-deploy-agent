var config = require('x-config');
var apiClient = require("../lib/apiClient");
var os = require("os");

var argv = require('optimist')
    .usage('Usage: $0 [--register <channel>]')
    .describe('register', 'Name of the channel to register.')
    .describe('listChannels', 'List all channels.')
    .describe('info', 'Display info about this agent.')
    .describe('server', 'Name of the server.')
    .boolean(['listChannels', 'info'])
    .default({ register: null, server: os.hostname() })
    .argv;

if(argv.register){
	apiClient.init(config.apiClient, function(err){
		if(err){ throw err; }
		apiClient.get({ url: '/channel/?name=' + argv.register }, function(err, res){
			if(err){ throw err; }
			if(res.statusCode !== 200){
				return console.log('Unable to find channel %s. Server returned %s.', argv.register, res.statusCode);
			}

			var channels = res.body.items;
			if (!channels || !channels.length){
				return console.log('Channel %s was not found.', argv.register);
			}

			var channelId = channels[0]._id;
			apiClient.post({ url: '/agent/' }, { server: argv.server, channelId: channelId }, function(err, res){
		        if (err){ throw err; }
		        if(res.statusCode === 409){
		        	return console.log('Server %s is already registered for channel %s.', argv.server, argv.register);
		        }
		        else if(res.statusCode !== 200){
					return console.log('Unable to register agent %s for channel %s. Server returned %s.', argv.server, argv.register, res.statusCode);
				}
		        console.log('registered [id=' + res.body._id + ']');
		    });
		})
	    
	});
}
else if (argv.listChannels){
	apiClient.init(config.apiClient, function(err){
		if(err){ throw err; }
		apiClient.get({ url: '/channel/' }, function(err, res){
			if(err){ throw err; }
			if(res.statusCode !== 200){
				return console.log('Unable to find channels. Server returned %s.', res.statusCode);
			}
			var channels = res.body.items;
			for (var i = 0; i < channels.length; i++) {
				console.log(channels[i].name);
			};
		});
	});
}
else if (argv.info){
	apiClient.init(config.apiClient, function(err){
		if(err){ throw err; }
		apiClient.get({ url: '/agent/?_expand=channelId&server=' + argv.server }, function(err, res){
			if(err){ throw err; }
			if(res.statusCode !== 200){
				return console.log('Unable to find agent. Server returned %s.', res.statusCode);
			}
			var agents = res.body.items;
			if(!agents || !agents.length){
				return console.log('Agent not registered for %s', argv.server);
			}
			var agent = agents[0];
			console.log('id: %s, server: %s, channelId: %s', agent._id, agent.server, agent.channelId);
		});
	});
}
else {
	require('./index');
}
