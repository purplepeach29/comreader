/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');
require('react-native-reanimated').setUpTests();

// Binds gestures to the UI-thread runtime, which does not exist under Jest.
// The library resolves to either its source or its built output.
jest.mock(
  'react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings',
  () => ({ installUIRuntimeBindings: () => {} }),
);
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () => ({ installUIRuntimeBindings: () => {} }),
);

// MMKV is a native module; an in-memory map stands in for it.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map();
    return {
      set: (key, value) => values.set(key, value),
      getNumber: key => values.get(key),
    };
  },
}));
