// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    // Desactiva la auto-inyección del plugin viejo por parte del preset:
    presets: [['babel-preset-expo', { reanimated: false }]],
    // Agrega el plugin nuevo de Reanimated 4 (worklets). Debe ir AL FINAL.
    plugins: ['react-native-worklets/plugin'],
  };
};
