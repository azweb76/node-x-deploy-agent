var redis = require("redis");

function init(config, cb) {
    var self = this;
    self.config = config;

    var redisConfig = config.redis;
    self.redisClient = redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);
    self.redisClient.on('error', function(err){ console.log(err); });
    
    cb(null, self);
}

function listen(channelId, cb){
    var self = this;

    var config = self.config;
    self.redisClient.subscribe(channelId);
    console.log('Listening on %s [host=%s, port=%s]', channelId, config.redis.host, config.redis.port);
    self.redisClient.on("message", function (c, message) {
        var m = JSON.parse(message);
        cb(c, m);
    });
}

function send(channel, msg){
    var self = this;
    self.redisClient.publish(channel, JSON.stringify(msg));
}

module.exports = {
    redisClient: null,
    config: null,
    init: init,
    send: send,
    listen: listen,
    close: null
}