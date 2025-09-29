// app/_layout.js
import { Tabs } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Image, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../src/theme';


function LogoLeft() {
  return (
    <View style={{ paddingLeft: 12, paddingRight: 4 }}>
      <Image
        source={require('../assets/logo.png')}
        style={{ width: 28, height: 28, resizeMode: 'contain' }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700' },
          headerLeft: () => <LogoLeft />,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarStyle: { borderTopColor: '#E3E8EF' },
        }}
      >
        <Tabs.Screen
          name="centros"
          options={{
            title: 'Centros',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="hospital-building" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="Chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chat" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="Historial"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="history" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen

                    name="Perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
  name="interaccion/[id]"
  options={{
    href: null,                 // oculta de la barra
    title: 'Interacción',
    headerShown: true,
  }}
/>

      </Tabs>
    </PaperProvider>
  );
}
