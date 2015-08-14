const { Cu, Ci } = require('chrome');
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

var sdkSelf = require('sdk/self');
// This can be expanded to show some settings page to register & unregister safe: protocol handling, probably much more
var handleIconClick = function(state) {
  console.log('Clicked');
};

require('sdk/ui/button/action').ActionButton({
  id: "safe-protocol",
  label: "MaidSafe",
  icon: {
    "16": "./images/icon-16.png",
    "32": "./images/icon-32.png",
    "64": "./images/icon-64.png"
  },
  onClick: handleIconClick
});

// Register the safe: protocol handler
var factory = new require('./protocol_factory');
var handlers = require('./proto_handler');
var safeProtocol = new factory.SafeProtocol(handlers.SafeProtocolHandler);
safeProtocol.register();
