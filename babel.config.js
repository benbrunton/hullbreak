module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // reanimated 4.x uses react-native-worklets/plugin
      'react-native-worklets/plugin',
    ],
  };
};
