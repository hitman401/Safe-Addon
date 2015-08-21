const { CC, Cc, Ci, Cu, Cr, components } = require('chrome');
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const SCHEME = "safe";
const nsIURI = CC("@mozilla.org/network/simple-uri;1", "nsIURI");
const SEGMENT_SIZE = 1000;
const MAX_SEGMENT_COUNT =1000;

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
    var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    return uri;
  },
  newChannel: function (aURI) {
    var channel = new PipeChannel(aURI);
    var result = channel.QueryInterface(Ci.nsIChannel);
    return result;
  }
});

var PipeChannel = function (URI) {
  this.pipe = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
  this.pipe.init(true, true, SEGMENT_SIZE, MAX_SEGMENT_COUNT, null); // Files upto 1 GB can be supported
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

  asyncOpen: function (listener, context) {
    try {

      var lib = ctypes.open("./libc_wrapper.so");

      var getFileSize = lib.declare('c_get_file_size_from_service_home_dir',
          ctypes.default_abi,
          ctypes.int32_t,
          ctypes.char.ptr,
          ctypes.char.ptr,
          ctypes.char.ptr,
          ctypes.bool,
          ctypes.size_t.ptr);

      var getFileContent = lib.declare('c_get_file_content_from_service_home_dir',
          ctypes.default_abi,
          ctypes.int32_t,
          ctypes.char.ptr,
          ctypes.char.ptr,
          ctypes.char.ptr,
          ctypes.bool,
          ctypes.uint8_t.ptr);

      var parsedURI = require('./parser').parse(this.channel.URI.path);

      console.log("Services", parsedURI.service, "Dns:", parsedURI.publicName, "filePath:", parsedURI.filePath);
      // publicName, serviceName, filePath

      var mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

      var temp = parsedURI.filePath.split('.');
      
      this.channel.contentType = mimeService.getTypeFromExtension(temp[temp.length - 1]);

      this.channel.asyncOpen(listener, context);
      
      var fileSizeCtypes = ctypes.size_t(0);
      var errorCode = getFileSize(parsedURI.publicName, parsedURI.service, parsedURI.filePath, false, fileSizeCtypes.address());

      if (errorCode > 0) {
        throw "Failed to get  file size. Err: " + errorCode;
      }


      var Uint8Array_t = ctypes.ArrayType(ctypes.uint8_t, fileSizeCtypes.value);
      var fileContent = Uint8Array_t();
      errorCode = getFileContent(parsedURI.publicName, parsedURI.service, parsedURI.filePath, false, fileContent.addressOfElement(0));
      if (errorCode > 0) {
        throw "Failed to get file content. Err: " + errorCode;
      }

      this.channel.contentLength = fileContent.length;
      var bout = Cc["@mozilla.org/binaryoutputstream;1"].getService(Ci.nsIBinaryOutputStream);
      bout.setOutputStream(this.pipe.outputStream);
      var fileBuffer = [];
      for(var i = 0; i< fileContent.length; ++i) {
        fileBuffer.push(fileContent.addressOfElement(i).contents);
        if (fileBuffer.length  === SEGMENT_SIZE) {
            bout.writeByteArray(fileBuffer, fileBuffer.length);
            fileBuffer = [];   
        }
      }
      if (fileBuffer.length > 0) {
        bout.writeByteArray(fileBuffer, fileBuffer.length);
      }                                    
      bout.close();
      lib.close();
    } catch (err) {
      console.error(err.message);
      if (err.result != Cr.NS_BINDING_ABORTED) {
        Cu.reportError(err);
      }
      this.close();
    }
  },

  open: function () {
    return this.channel.open();
  },


  close: function () {
    this.pipe.outputStream.close();
  }
};

exports.SafeProtocolHandler = SafeProtocolHandler;
