#Safe Addon for Firefox
Add-on intercepts the SAFE: scheme from the browser address bar and renders the related content from the Safe Network

## Prerequisites
NodeJs should be installed

##Setting up

 1. JPM sdk is used to build the add on. Follow this [link](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#Installation) for installation instructions.
 2. Clone the [Safe-FFI](https://github.com/ustulation/safe_ffi) repository
    1. Build Static library of the Rust code - `cd Rust && cargo build --release && cd ..`
    2. Build the c_wrapper for JS-Ctypes (Linux and OSX)
       ```
       gcc -shared -std=c99 -Wall -Werror -O2 -s -fvisibility=hidden -fPIC -o libc_wrapper.so c/c_wrapper.c -L./rust/target/release -lsafe_ffi -lsodium
       ```

       This will yield `libc_wrapper.so/libc_wrapper.dylib`(linux\osx)

 3. Copy the `libc_wrapper.{so, dylib}` to the `data` folder of the `Safe-Addon`


## Packaging the API:
  Execute `jpm xpi` to get the @safe_adon.xpi file

## Installing on firefox
     1. Go to tools > Add-ons (ctrl + shift + A). At the top right corner there will ba a settings icon.
        Clicking on the settings icon will show an option `Import Add-on from File`, select the XPI from the local machine

     2. Another means to install.
            Right click on the `.xpi` file and select `open with`. Choose firefox.

     Permission window is opened for installation authorization will be prompted. Click Install.
