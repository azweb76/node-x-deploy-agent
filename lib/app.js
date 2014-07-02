var messaging = require('./messaging');
var scripting = require('./scripting');
var apiClient = require("./apiClient");
var os = require("os");
var async = require("async");

function start(config){
    async.waterfall([
        function(cb){ cb(null, { config: config }); },
        initApiClient,
        loadChannel,
        initScripting,
        registerAgent,
        initMessaging,
    ], listenMessaging);
}

function loadChannel(ctx, cb){
    var config = ctx.config;
    apiClient.get({ url: '/channel/?name=' + config.messaging.channel }, function(err, channels){
        if (err){ return cb(err); }
        if (!channels || !channels.items){
            return cb(new Error("Unable to find channel " + config.messaging.channel));
        }
        ctx.channel = channels.items[0];
        cb(null, ctx);
    });
}

function initApiClient(ctx, cb){
    var config = ctx.config;
    apiClient.init(config.deployApi, function (err, result) {
        if (err){ return cb(err); }

        ctx.apiClient = result;
        cb(null, ctx);
    });
}

function registerAgent(ctx, cb){
    var config = ctx.config;
    apiClient.post({ url: '/agent/registration' }, { server: os.hostname(), channelId: ctx.channel._id }, function(err, agentInfo){
        if (err){ return cb(err); }

        ctx.agentInfo = agentInfo.item;
        cb(null, ctx);
    });
}

function initScripting(ctx, cb){
    scripting.init(ctx.config.scripting, function(err, result){
        if (err){ return cb(err); }

        ctx.scripting = result;
        cb(null, ctx);
    });
}

function initMessaging(ctx, cb){
    var config = ctx.config;
    config.messaging.channel = ctx.channel._id;
    messaging.init(config.messaging, function(err, msgClient){
        if (err){ return cb(err); }

        ctx.msgClient = msgClient;
        cb(null, ctx);
    });
}

function listenMessaging(err, ctx) {
    if (err){ console.log(err); throw err; }
    var config = ctx.config;
    ctx.msgClient.listen(msgClient_listen.bind(ctx));
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
        apiClient.get({ url: '/build/' + c.action.buildId }, function (err, build) {
            if (err){ return cb(err); }
            c.build = build;
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
        apiClient.get({ url: '/action/' + msg.actionId }, function (err, action) {
            if (err){ return cb(err); }
            
            c.action = action;
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
        apiClient.get({ url: '/application/' + c.build.applicationId }, function(err, app){
            if (err){ return cb(err); }

            c.build.app = app;
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
        apiClient.post({ url: '/action/' + c.action._id + '/agentLog/' + agentInfo._id }, { status: (err ? 2 : 1) }, function(err, action){
            console.log(err, action);
        });
    });
}

module.exports = {
    start: start
};