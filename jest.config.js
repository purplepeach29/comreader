module.exports = {
  preset: '@react-native/jest-preset',
  // These ship untranspiled ES modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@shopify/flash-list)/)',
  ],
};
