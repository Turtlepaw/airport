{
    description = "Flake to develop airport";

    inputs = {
        nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    };

    outputs = { self, nixpkgs }: {

        packages.x86_64-linux.hello = nixpkgs.legacyPackages.x86_64-linux.hello;
        packages.x86_64-linux.deno = nixpkgs.legacyPackages.x86_64-linux.deno;

        packages.x86_64-linux.default = self.packages.x86_64-linux.hello;

    };
}
