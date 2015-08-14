var SafeApi = function() {
    this.load = function() {
      // load so
    };

    this.unload = function() {
      // lib.close()
    };

    this.getFileSize = function() {
        return 0;
    };

    this.getFileContent = function() {
        return []
    };

};
try {
  self.onmessage = function(request) {
    var api = new SafeApi();
    api.load();
    var result;
    switch (request.method) {
      case size:
        result = api.getFileSize(request);
        break;

      case content:
        result = api.getFileContent(request);
        break;

      default:
        result = {error: -1, msg: 'Invalid operation'};
        break;
    };
    self.postMessage(result);
    api.unload();
  };
} catch (ex) {
  dump('\nWorker Exception: ' + ex);
}
