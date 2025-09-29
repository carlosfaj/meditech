// src/theme.js
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  roundness: 12,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0a84ff',      // azul bonito
    secondary: '#00c2a8',    // acento
    surface: '#ffffff',
    background: '#f6f7fb',   // gris claro global
    outline: '#E3E8EF',
  },
};
