const { CC, Cc, Ci, Cu, Cr, components, ChromeWorker } = require('chrome');
//Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const SCHEME = "safe";
const nsIURI = CC("@mozilla.org/network/simple-uri;1", "nsIURI");

var Handler = function(libPath, workerPath, pipeChannel) {
  var worker = new ChromeWorker(workerPath);

  var getParams = function() {
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

    var tokens = pipeChannel.channel.URI.path.split('/');
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
      publicName = getPublicName(1, tokens);
    } else {
      serviceName = tokens[0];
      publicName = getPublicName(1, tokens);
    }
    return { publicName: publicName, serviceName: serviceName, filePath: filePath };
  };

  var params = getParams();

  worker.onmessage = function(response) {
    var msg = response.data;
    if (msg.error) {
      this.terminate(); // terminates the worker
      pipeChannel.status = 500;
      pipeChannel.close();
      return;
    }
    switch (msg.method) {
      case 'size':
        params.size = msg.data;
        worker.postMessage({ method: 'content', libPath: libPath, params: params });
        break;
      case 'content':
        try {
          this.terminate(); // terminates the worker
          var mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
          pipeChannel.channel.contentType = params.filePath ? mimeService.getTypeFromURI(pipeChannel.channel.URI) : 'text/html';
          pipeChannel.channel.asyncOpen(listener, context);
          var bout = Cc["@mozilla.org/binaryoutputstream;1"].getService(Ci.nsIBinaryOutputStream);
          bout.setOutputStream(pipeChannel.pipe.outputStream);
          bout.writeByteArray(msg.data, msg.data.length);
          bout.close();
        } catch (err) {
          pipeChannel.status = 500;
          pipeChannel.close();
        }
        break;
    }
  };
  worker.postMessage({method: 'size', libPath: libPath, params: params});
};

function SafeProtocolHandler() {
}
SafeProtocolHandler.prototype = Object.freeze({
  classDescription: "Safe Protocol Handler",
  contractID: "@mozilla.org/network/protocol;1?name=" + SCHEME,
  classID: components.ID('{7c3311a6-3a2d-4090-9c26-e83c32e7870c}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),
  scheme: SCHEME,
  defaultPort: -1,
  allowPort: function (port, scheme) {
    // This protocol handler does not support ports.
    return false;
  },
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,
  newURI: function (aSpec, aOriginCharset, aBaseURI) {
    if (aBaseURI && aBaseURI.scheme == SCHEME) {
      return Services.io.newURI(aSpec, aOriginCharset);
    }
    var rv = new nsIURI();
    rv.spec = aSpec;
    return rv;
  },
  newChannel: function (aURI) {
    var channel = new PipeChannel(aURI);
    var result = channel.QueryInterface(Ci.nsIChannel);
    return result;
  }
});

var PipeChannel = function (URI) {
  this.pipe = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
  this.pipe.init(true, true, 0, 0, null);
  this.inputStreamChannel = Cc["@mozilla.org/network/input-stream-channel;1"].createInstance(Ci.nsIInputStreamChannel);
  this.inputStreamChannel.setURI(URI);
  this.inputStreamChannel.contentStream = this.pipe.inputStream;
  this.request = this.inputStreamChannel.QueryInterface(Ci.nsIRequest);
  this.channel = this.inputStreamChannel.QueryInterface(Ci.nsIChannel);
};

PipeChannel.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Ci.nsIChannel) || iid.equals(Ci.nsIRequest) || iid.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_NOINTERFACE;
  },

  get LOAD_NORMAL() {
    return this.request.LOAD_NORMAL
  },
  get LOAD_BACKGROUND() {
    return this.request.LOAD_BACKGROUND
  },
  get INHIBIT_CACHING() {
    return this.request.INHIBIT_CACHING
  },
  get INHIBIT_PERSISTENT_CACHING() {
    return this.request.INHIBIT_PERSISTENT_CACHING
  },
  get LOAD_BYPASS_CACHE() {
    return this.request.LOAD_BYPASS_CACHE
  },
  get LOAD_FROM_CACHE() {
    return this.request.LOAD_FROM_CACHE
  },
  get VALIDATE_ALWAYS() {
    return this.request.VALIDATE_ALWAYS
  },
  get VALIDATE_NEVER() {
    return this.request.VALIDATE_NEVER
  },
  get VALIDATE_ONCE_PER_SESSION() {
    return this.request.VALIDATE_ONCE_PER_SESSION
  },

  get loadFlags() {
    return this.request.loadFlags
  },
  set loadFlags(val) {
    this.request.loadFlags = val
  },
  get loadGroup() {
    return this.request.loadGroup
  },
  set loadGroup(val) {
    this.request.loadGroup = val
  },
  get name() {
    return this.request.name
  },
  get status() {
    return this.request.status
  },

  cancel: function (status) {
    this.request.cancel(status);
  },
  isPending: function () {
    return this.request.isPending();
  },
  resume: function () {
    this.request.resume();
  },
  suspend: function () {
    this.request.suspend();
  },

  get LOAD_DOCUMENT_URI() {
    return this.channel.LOAD_DOCUMENT_URI
  },
  get LOAD_RETARGETED_DOCUMENT_URI() {
    return this.channel.LOAD_RETARGETED_DOCUMENT_URI
  },
  get LOAD_REPLACE() {
    return this.channel.LOAD_REPLACE
  },
  get LOAD_INITIAL_DOCUMENT_URI() {
    return this.channel.LOAD_INITIAL_DOCUMENT_URI
  },
  get LOAD_TARGETED() {
    return this.channel.LOAD_TARGETED
  },

  get contentCharset() {
    return this.channel.contentCharset
  },
  set contentCharset(val) {
    this.channel.contentCharset = val
  },
  get contentLength() {
    return this.channel.contentLength
  },
  set contentLength(val) {
    this.channel.contentLength = val
  },
  get contentType() {
    return this.channel.contentType;
  },
  set contentType(val) {
    this.channel.contentType = val;
  },
  get notificationCallbacks() {
    return this.channel.notificationCallbacks
  },
  set notificationCallbacks(val) {
    this.channel.notificationCallbacks = val
  },
  get originalURI() {
    return this.channel.originalURI
  },
  set originalURI(val) {
    this.channel.originalURI = val
  },
  get owner() {
    return this.channel.owner
  },
  set owner(val) {
    this.channel.owner = val
  },
  get securityInfo() {
    return this.channel.securityInfo
  },
  get URI() {
    return this.channel.URI
  },

  asyncOpen: function (listener, context) {
    var sdkSelf = require('sdk/self');
    new Handler(sdkSelf.data.url('libc_wrapper.dll'), sdkSelf.data.url('worker.js'), this);
  },

  open: function () {
    return this.channel.open();
  },


  close: function () {
    this.pipe.outputStream.close();
  }
};

exports.SafeProtocolHandler = SafeProtocolHandler;
