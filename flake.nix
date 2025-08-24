{
  description = "Deno Javascript App";

  inputs = {
    utils.url = "github:numtide/flake-utils";
    deno2nix = {
      url = "github:SnO2WMaN/deno2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    utils,
    deno2nix,
  }:
    utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [deno2nix.overlays.default];
      };
    in rec {
      apps.default = utils.lib.mkApp {
        drv = packages.default;
      };

      packages.default = pkgs.deno2nix.mkExecutable {
        pname = "template";
        version = "0.1.0";

        src = ./.;
        lockfile = "./deno.lock";
        config = "./deno.json";
        entrypoint = "./dev.ts";
        
        buildInputs = with pkgs; [
          vips
          pkg-config
          stdenv.cc.cc.lib
          glib
          cairo
          pango
          libjpeg
          giflib
          librsvg
          python3
        ];
      };

      devShell = pkgs.mkShell {
        buildInputs = with pkgs; [
          deno
          just
          gcc

          # Sharp dependencies
          vips
          pkg-config

          # SQLite dependencies
          sqlite
          # Build tools for native modules
          nodePackages.node-gyp
          gnumake

          # Standard C++ library and other common dependencies
          stdenv.cc.cc.lib

          nodejs
          yarn-berry
        ];
        
        # shellHook = ''
        #   export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath (with pkgs; [
        #     stdenv.cc.cc.lib
        #     vips
        #     glib
        #     cairo
        #     pango
        #     libjpeg
        #     giflib
        #     librsvg
        #     sqlite
        #   ])}:$LD_LIBRARY_PATH"
        #   export PKG_CONFIG_PATH="${pkgs.lib.makeSearchPathOutput "dev" "lib/pkgconfig" (with pkgs; [
        #     vips
        #     glib
        #     cairo
        #     pango
        #     sqlite
        #   ])}:$PKG_CONFIG_PATH"
          
        #   # Completely block better-sqlite3 installation
        #   export npm_config_build_from_source=false
        #   export npm_config_optional=false
        #   export npm_config_install_strategy=shallow
        #   export npm_config_ignore_scripts=true
        #   export npm_config_python="${pkgs.python3}/bin/python"
          
        #   #echo "Aliasing better-sqlite3 to libsql to prevent erorrs... (better-sqlite3 doesn't support deno runtime)"
        #   #mkdir -p node_modules/better-sqlite3
        #   # hack to force alias of better-sqlite3 to libsql
        #   #echo "module.exports = require('libsql');" | tee node_modules/better-sqlite3/lib/index.js node_modules/.deno/better-sqlite3@10.1.0/node_modules/better-sqlite3/lib/index.js > /dev/null

        #   deno install --allow-scripts
        # '';
      };
    });
}
