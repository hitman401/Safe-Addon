var getPublicName = function(tokenStartPosition, tokens) {
var temp = '';
for (var i = tokenStartPosition; i < tokens.length; i++) {
  temp += tokens[i];
  if (i+1 !== tokens.length) {
    temp += '.';
  }
}

return temp;
};

exports.parse = function(uriPath) {
	var tokens = uriPath.split('/');
	var filePath = '';
	if (tokens.length > 1) { // .join() is not available (SDK Array type)
	for (var i = 1; i<tokens.length; i++) {
	  filePath += tokens[i];
	  if (i+1 !== tokens.length) {
	    filePath += '/';
	  }
	}
	}
	tokens = tokens[0].split('.');

	var serviceName;
	var publicName;
	if (tokens.length < 3) {
	  serviceName = 'www'; // default lookup service
	  publicName = getPublicName(0, tokens);
	} else {
	  serviceName = tokens[0];
	  publicName = getPublicName(1, tokens);
	}

	if (!filePath) {
	  filePath = 'index.html';
	}
        
        return {service: serviceName, publicName: publicName, filePath: filePath}
}      
      

