var messaging = require('./messaging');
var scripting = require('./scripting');
var apiClient = require("./apiClient");
var os = require("os");
var async = require("async");

function start(config){
    async.waterfall([
        function(cb){ cb(null, { config: config }); },
        initApiClient,
        //loadChannel,
        initScripting,
        registerAgent,
        initMessaging,
    ], listenMessaging);
}

// function loadChannel(ctx, cb){
//     var config = ctx.config;
//     console.log('Loading channel...');
//     apiClient.get({ url: '/channel/?name=' + config.messaging.channel }, function(err, res){
//         if (err){ return cb(err); }

//         var channels = res.body;
//         if (!channels || !channels.items){
//             return cb(new Error("Unable to find channel " + config.messaging.channel));
//         }
//         ctx.channel = channels.items[0];
//         cb(null, ctx);
//     });
// }

function initApiClient(ctx, cb){
    var config = ctx.config;
    console.log('Initializing API client...');
    apiClient.init(config.apiClient, function (err, result) {
        if (err){ return cb(err); }

        ctx.apiClient = result;
        cb(null, ctx);
    });
}

function registerAgent(ctx, cb){
    var config = ctx.config;
    console.log('Loading agent...');
    apiClient.get({ url: '/agent/' + os.hostname() + '/details' }, function(err, res){
        if (err){ return cb(err); }

        if (!res.body.agent){
            return cb(new Error('Agent is not registered.'));
        }

        ctx.agentInfo = res.body.agent;
        ctx.channelId = ctx.agentInfo.channelId;

        if(!config.messaging) { config.messaging = {}; }
        if(!config.messaging.redis) { config.messaging.redis = {}; }

        var redisConfig = config.messaging.redis;
        redisConfig.host = res.body.redis.host;
        redisConfig.port = res.body.redis.port;

        cb(null, ctx);
    });
}

function initScripting(ctx, cb){
    console.log('Initializing scripts...');
    scripting.init(ctx.config.scripting, function(err, result){
        if (err){ return cb(err); }

        ctx.scripting = result;
        cb(null, ctx);
    });
}

function initMessaging(ctx, cb){
    var config = ctx.config;
    console.log('Initializing messaging bus...');
    messaging.init(config.messaging, function(err, msgClient){
        if (err){ return cb(err); }

        ctx.msgClient = msgClient;
        cb(null, ctx);
    });
}

function listenMessaging(err, ctx) {
    if (err){ console.log(err); throw err; }
    var config = ctx.config;
    console.log('Listening for messages...');
    ctx.msgClient.listen(ctx.channelId, msgClient_listen.bind(ctx));
}

function msgClient_listen(c, msg) {
    var self = this;
    async.waterfall([
        function(cb){ cb(null, { ctx: self, msg: msg, channel: c }); },
        loadAction,
        loadBuild,
        loadApplication
    ], invokeScript);
}

function loadBuild(c, cb){
    if (c.action.buildId){
        apiClient.get({ url: '/build/' + c.action.buildId }, function (err, res) {
            if (err){ return cb(err); }
            c.build = res.body;
            cb(null, c);
        });
    }
    else {
        cb(null, c);
    }
}

function loadAction(c, cb){
    var msg = c.msg;
    if (msg.actionId){
        apiClient.get({ url: '/action/' + msg.actionId }, function (err, res) {
            if (err){ return cb(err); }
            
            c.action = res.body;
            if (action.buildId) { c.buildId = action.buildId; }

            cb(null, c);
        });
    }
    else {
        cb(null, c);
    }
}

function loadApplication(c, cb){
    if (c.build){
        apiClient.get({ url: '/application/' + c.build.applicationId }, function(err, res){
            if (err){ return cb(err); }

            c.build.app = res.body;
            cb(null, c);
        });
    }
    else {
        cb(null, c);
    }
}

function invokeScript(err, c){
    if (err){ return console.log(err); }

    scripting.invoke(c, function(err){
        console.log(c, err);
        if (err) { return console.log(err); }
        var agentInfo = c.ctx.agentInfo;
        apiClient.post({ url: '/action/' + c.action._id + '/agentLog/' + agentInfo._id }, { status: (err ? 2 : 1) }, function(err, res){
            console.log(err, res);
        });
    });
}

module.exports = {
    start: start
};