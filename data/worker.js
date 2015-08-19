var SafeApi = function(libPath) {
  var lib = ctypes.open(libPath);

  var cGetFileSize = lib.declare('c_get_file_size_from_service_home_dir',
				ctypes.default_abi,
				ctypes.int32_t,
				ctypes.char.ptr,
				ctypes.char.ptr,
				ctypes.char.ptr,
				ctypes.bool,
				ctypes.size_t.ptr);

  var cGetFileContent = lib.declare('c_get_file_content_from_service_home_dir',
				ctypes.default_abi,
				ctypes.int32_t,
				ctypes.char.ptr,
				ctypes.char.ptr,
				ctypes.char.ptr,
				ctypes.bool,
				ctypes.uint8_t.ptr);

  this.unload = function() {
    lib.close();
  };

  this.getFileSize = function(publicName, serviceName, filePath) {
    if (!publicName || !serviceName || !filePath) {
      return {method: 'size', error: 1, data: 'Invalid request'};
    }
    try {
      var fileSizeCtypes = new ctypes.size_t(0);      
       var errorCode = cGetFileSize(publicName, serviceName, filePath, false, fileSizeCtypes.address());
       return {method: 'size', error: errorCode, data: errorCode === 0 ? 266956 : 0}; // index 1504 - bg 266956
    } catch(e) {
       return {method: 'size', error: 999, data: e.message};
    }    
  };

  this.getFileContent = function(publicName, serviceName, filePath, size) {
    if (!publicName || !serviceName || !filePath || !size) {
      return {method: 'size', error: 1, data: 'Invalid request'};
    }
    var Uint8Array_t = ctypes.ArrayType(ctypes.uint8_t, size);
    var fileContent = Uint8Array_t();
    var errorCode = cGetFileContent(publicName, serviceName, filePath, false, fileContent.addressOfElement(0));
    var fileBuffer = [];
    if (errorCode === 0) {
      for(var i = 0; i< fileContent.length; ++i) {
	fileBuffer.push(fileContent.addressOfElement(i).contents);
      }
    } 
    return {method: 'content', error: errorCode, data: fileBuffer};
  };

  return this;
};
self.onmessage = function(event) {
  var result;
  var request = event.data;
  var api = new SafeApi(request.libPath);
  switch (request.method) {
    case 'size':
      result = api.getFileSize(request.params.publicName, request.params.serviceName, request.params.filePath);
      break;

    case 'content':
      result = api.getFileContent(request.params.publicName, request.params.serviceName, request.params.filePath, request.params.size);
      break;

    default:
      result = {error: -1, msg: 'Invalid operation'};
      break;
  }
  self.postMessage(result);
//  api.unload();
};
