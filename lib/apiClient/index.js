var http = require('http');
var url = require('url');
var extend = require('util')._extend;

function init(config, cb){
    this.config = config;
    cb(null, this);
}

function get(args, cb){
    var urlInfo = url.parse(this.config.url);
    var op = {
        hostname: urlInfo.hostname,
        port: urlInfo.port,
        path: url.resolve(urlInfo.pathname, args.url),
        headers: { "X-AuthToken": this.config.token, "Content-Type": "application/json" },
        method: 'GET'
    };
    var req = http.request(op, function(res){
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            cb(null, JSON.parse(chunk));
        });
    });
    req.on('error', function (e) {
        cb(e);
    });
    req.end();
}

function post(args, data, cb){
    var urlInfo = url.parse(this.config.url);
    var post_data = JSON.stringify(data);
    var op = {
        hostname: urlInfo.hostname,
        port: urlInfo.port,
        path: url.resolve(urlInfo.pathname, args.url),
        headers: { "X-AuthToken": this.config.token, "Content-Type": "application/json", "Content-Length": post_data.length },
        method: 'POST'
    };
    var req = http.request(op, function(res){
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var o = JSON.parse(chunk);
            cb(null, o);
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    req.write(post_data);
    req.end();
}

module.exports = {
    config: {},
    get: get,
    post: post,
    init: init
};