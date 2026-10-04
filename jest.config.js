module.exports = {
  preset: '@react-native/jest-preset',
  // Resolves the animation libraries to their non-native builds, which run in
  // Node without a UI-thread runtime.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['./jest.setup.js'],
  // These ship untranspiled ES modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native[^/]*|@react-native(-community)?|@react-navigation|@shopify/flash-list)/)',
  ],
};
