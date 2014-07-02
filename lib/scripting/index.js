var child_process = require('child_process');
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var os = require('os');

function init(config, cb){
    this.config = config;
    cb(null, this);
}

function executePowershell(script, c, self, cb) {
    var env = createEnv(c);
    var command = self.config.powershellPath + ' -ExecutionPolicy RemoteSigned -File ' + script;
    var child = spawn(self.config.powershellPath, ['-ExecutionPolicy', 'RemoteSigned', '-File', script], { env: env });
    
    child.stdout.on("data",function(data){
        console.log("Powershell Data: " + data);
    });
    child.stderr.on("data",function(data){
        console.log("Powershell Errors: " + data);
    });
    child.on("exit",function(){
        console.log("Powershell Script finished");
        cb(null, null);
    });
    child.stdin.end();
}

function executeBash(script, c, self, cb){
    var env = createEnv(c);
    var child = spawn(command, [], { env: env });
    child.stdout.on("data", function (data) {
        console.log("Bash Data: " + data);
    });
    child.stderr.on("data", function (data) {
        console.log("Bash Errors: " + data);
    });
    child.on("exit", function () {
        console.log("Bash Script finished");
        cb(null, null);
    });
    child.stdin.end();
}

function executeModule(script, c, self, cb){
    var mod = require(script);
    mod.invoke(c, cb);
}

function createEnv(c){
    return {
        "BUILD_ID": c.build._id,
        "BUILD_COMMITTER": c.build.committer,
        "BUILD_HASH": c.build.commitHash,
        "BUILD_BRANCH": c.build.branch,
        "BUILD_NAME": c.build.name,
        "BUILD_ARTIFACT": c.build.artifactPath
    };
}

function invoke(c, cb) {
    var self = this;
    var app = c.build.app;
    var scriptPath = c.action.event;
    var parts = scriptPath.split('/');

    if (parts[0] === 'system'){
        parts[0] = path.join(__dirname, 'system');
        scriptPath = parts.join(path.sep);
    }
    else{
        scriptPath = path.join(self.config.scriptsPath, scriptPath);
    }
    
    var script = scriptPath + '.js';

    if (!fs.existsSync(script)) {
        if (os.platform() === 'win32') {
            script = scriptPath + '.ps1';
            if (fs.existsSync(script)) {
                return executePowershell(script, c, self, cb);
            }
        }
        else {
            script = scriptPath + '.sh';
            if (fs.existsSync(script)) {
                return executeBash(script, c, self, cb);
            }
        }
    }
    else {
        return executeModule(script, c, self, cb);
    }
    return cb(null, null);
    
}

module.exports = {
    invoke: invoke,
    config: {},
    init: init
};