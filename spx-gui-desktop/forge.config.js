const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const ignorePattern = [
  // Almost same as https://github.com/electron/packager/blob/5e1a9b24633b55f2dec1b74234d3a53fd8f4a580/src/copy-filter.ts#L21
  // While remove `*.o` files as they are required for MinGW in Windows
  '/package-lock\\.json$',
  '/yarn\\.lock$',
  '/pnpm-lock\\.yaml$',
  '/\\.git($|/)',
  '/node_modules/\\.bin($|/)',
  // '\\.o(bj)?$',
  '/node_gyp_bins($|/)',
].map(pStr => new RegExp(pStr))

module.exports = {
  packagerConfig: {
    // Use ignore function to override the default ignore patterns.
    ignore: (path) => {
      return ignorePattern.some(p => p.test(path))
    },
    asar: {
      unpackDir: 'spx'
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    // Do not use `plugin-auto-unpack-natives` as it will cause `.cache/*` missing in unpacked result.
    // We need to preserve `.cache/*` in unpacked result as they stands for go mod cache.
    // {
    //   name: '@electron-forge/plugin-auto-unpack-natives',
    //   config: {},
    // },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
