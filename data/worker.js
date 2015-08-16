var SafeApi = function() {
  var lib;
  var getFileSize;
  var getFileContent;

  this.load = function(libPath) {
    lib = ctypes.open(libPath);

    getFileSize = lib.declare('c_get_file_size_from_service_home_dir',
        ctypes.default_abi,
        ctypes.int32_t,
        ctypes.char.ptr,
        ctypes.char.ptr,
        ctypes.char.ptr,
        ctypes.bool,
        ctypes.size_t.ptr);

    getFileContent = lib.declare('c_get_file_content_from_service_home_dir',
        ctypes.default_abi,
        ctypes.int32_t,
        ctypes.char.ptr,
        ctypes.char.ptr,
        ctypes.char.ptr,
        ctypes.bool,
        ctypes.uint8_t.ptr);
  };

  this.unload = function() {
    lib.close();
  };

  this.getFileSize = function(request) {
    if (!request.params.publicName || !request.params.serviceName || !request.params.filePath) {
      return {method: 'size', error: 1, data: 'Invalid request'};
    }
    var fileSizeCtypes = ctypes.size_t(0);
    var errorCode = getFileSize(request.params.publicName, request.params.serviceName, request.params.filePath, false, fileSizeCtypes.address());
    return {method: 'size', error: errorCode, data: fileSizeCtypes.value};
  };

  this.getFileContent = function(request) {
    if (!request.params.publicName || !request.params.serviceName || !request.params.filePath || !request.params.size) {
      return {method: 'size', error: 1, data: 'Invalid request'};
    }
    var Uint8Array_t = ctypes.ArrayType(ctypes.uint8_t, request.params.size);
    var fileContent = Uint8Array_t();
    var errorCode = getFileContent(publicName, serviceName, filePath, false, fileContent.addressOfElement(0));
    return {method: 'content', error: errorCode, data: fileContent.buffer};
  };
};
self.onmessage = function(event) {
  var result;
  var request = event.data;
  var api = new SafeApi();
  api.load(request.libPath);
  switch (request.method) {
    case 'size':
      result = api.getFileSize(request);
      break;

    case 'content':
      result = api.getFileContent(request);
      break;

    default:
      result = {error: -1, msg: 'Invalid operation'};
      break;
  }
  self.postMessage(result);
  api.unload();
};
