 
// index.js (RAÍZ del proyecto)
require('./polyfills');                 // 1) polyfills primero
require('react-native-gesture-handler'); // 2) gesture-handler
require('react-native-reanimated');      // 3) reanimated
require('expo-router/entry');            // 4) router al final
