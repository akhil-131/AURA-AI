import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; 
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter both email and password.',
      });
      return;
    }

    // THE TRY BLOCK STARTS HERE
    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'The Void is ready for your thoughts.',
        });
        
        navigation.replace('Home'); 
      } else {
        Toast.show({
          type: 'error',
          text1: 'Access Denied',
          text2: data.message || 'Invalid email or password.',
        });
      }
    } catch (error) { 
      // THE CATCH BLOCK IS RIGHT HERE (This is what was missing!)
      console.error("Network error:", error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Cannot connect to server. Is Node.js running?',
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="blur-on" size={40} color="#9ba8ff" />
          </View>
          <Text style={styles.title}>AURA AI</Text>
          <Text style={styles.subtitle}>The Ethereal Intelligence.</Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
          
          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="mail-outline" size={20} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#ababab"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock-outline" size={20} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#ababab"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={20} 
                color="#ababab" 
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log In</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.linkText, { fontWeight: 'bold' }]}>Sign up</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  content: { paddingHorizontal: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(25, 25, 25, 0.6)', borderColor: 'rgba(72, 72, 72, 0.2)', borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#9ba8ff', marginBottom: 8, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#ababab', letterSpacing: 0.5 },
  form: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f1f1f', borderRadius: 50, borderWidth: 1, borderColor: 'rgba(72, 72, 72, 0.2)', marginBottom: 16, height: 56 },
  inputIcon: { paddingLeft: 20, paddingRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 16, height: '100%' },
  eyeIcon: { paddingRight: 20, paddingLeft: 10, height: '100%', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24, paddingRight: 8 },
  button: { backgroundColor: '#9ba8ff', borderRadius: 50, flexDirection: 'row', height: 56, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: '#ababab', fontSize: 14 },
  linkText: { color: '#9ba8ff', fontSize: 14 },
});