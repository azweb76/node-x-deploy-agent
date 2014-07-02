var redis = require("redis");

function init(config, cb) {
    var self = this;
    self.config = config;

    var redisConfig = config.redis;
    self.redisClient = redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);
    cb(null, self);
}

function listen(cb){
    this.redisClient.subscribe(this.config.channel);
    console.log('listening on ' + this.config.channel);
    this.redisClient.on("message", function (c, message) {
        var m = JSON.parse(message);
        cb(c, m);
    });
}

function send(channel, msg){
    this.redisClient.publish(channel, JSON.stringify(msg));
}

module.exports = {
    redisClient: null,
    config: null,
    init: init,
    send: send,
    listen: listen,
    close: null
}