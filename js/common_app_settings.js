(function(exports){

exports.appName = function(){
    return 'AZKAR 1toN';
};

exports.appVersion = function(){
    return '0.9.9.7';
};

exports.appHostName = function(){
    return 'websocket-azkar';
};

exports.appBranch = function(){
    return '1to1-refacto';
};

exports.isBenchmark = function(){
 	return false;
};

exports.isFakeRobubox = function(){
 	return false;
};


exports.isRobubox = function(){
    var user = getCookie("username");
    if (user == "Thaby") return true; 
 	//else return false;
 	return true;
};


})(typeof exports === 'undefined'? this['appSettings']={}: exports);