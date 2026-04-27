import 'react-native-gesture-handler'; 
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message'; 

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'; 
import ResetPasswordScreen from './src/screens/ResetPasswordScreen'; 
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen'; 
import HistoryDrawer from './src/components/HistoryDrawer';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => <HistoryDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 320, backgroundColor: '#0e0e0e' },
      }}
    >
      <Drawer.Screen name="Chat" component={HomeScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

// 🌟 FIXED DEEP LINKING: Correctly mapped for nested Drawer Navigator
const linking = {
  prefixes: ['http://localhost:8081'],
  config: {
    screens: {
      Home: { // This is the Drawer
        screens: {
          Chat: 'chat/:activeChatId?', // This is the actual screen inside the Drawer
          Profile: 'profile'
        }
      },
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};

export default function App() {
  return (
    <>
      <NavigationContainer linking={linking}>
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={DrawerNavigator} /> 
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> 
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} /> 
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Toast at the root level */}
      <Toast /> 
    </>
  );
}