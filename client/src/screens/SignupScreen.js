import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
// Using the same icons you had in your HTML!
import { MaterialIcons } from '@expo/vector-icons'; 
import Toast from 'react-native-toast-message';

export default function SignupScreen({ navigation }) {
  // State to hold what the user types
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // The test function to connect to your Neon DB / Node backend
  const handleSignup = async () => {
    // 1. Check if they filled out everything
    if (!username || !email || !password) {
      alert("Please fill in all fields to create an account.");
      return;
    }

    try {
      // 2. Send the data to the server
      // Note: If using an Android emulator, change localhost to 10.0.2.2
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username, 
          email: email, 
          password: password 
        }),
      });

      const data = await response.json();

      // 3. Handle the server's answer
      
if (response.ok) {
  Toast.show({
    type: 'success',
    text1: 'Welcome to AURA AI!',
    text2: 'Account created. Please log in to continue.',
  });
  navigation.navigate('Login'); 
} else {
  Toast.show({
    type: 'error',
    text1: 'Signup Failed',
    text2: data.message || 'Please check your details.',
  });
}
    } catch (error) {
      console.error("Network error:", error);
      alert("Cannot connect to server. Is Node.js running?");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <MaterialIcons name="blur-on" size={48} color="#9ba8ff" style={styles.headerIcon} />
          <Text style={styles.title}>AURA AI</Text>
          <Text style={styles.subtitle}>Join the ethereal intelligence network.</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          
          {/* Username Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="person" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#ababab"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="mail-outline" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#ababab"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input with Eye Button */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock-outline" size={22} color="#ababab" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#ababab"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword} // Tied to the state!
            />
            {/* The Eye Button */}
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)} 
              style={{ paddingRight: 16 }}
            >
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={22} 
                color="#ababab" 
              />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Create Account</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          {/* When clicked, go back to the Login screen */}
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Log in</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

// Styling translation from Tailwind to React Native
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // surface-container-lowest
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400, // Keeps it centered on larger web screens
    alignSelf: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  headerIcon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#9ba8ff', // primary gradient approximation
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#ababab', // on-surface-variant
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 31, 0.6)', // Glassmorphism approximation
    borderRadius: 12, // rounded-xl
    borderWidth: 1,
    borderColor: 'rgba(72, 72, 72, 0.2)', // outline-variant/20
    marginBottom: 24,
    height: 56,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    height: '100%',
  },
  button: {
    backgroundColor: '#9ba8ff', // primary color
    borderRadius: 50,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#ababab',
    fontSize: 14,
  },
  linkText: {
    color: '#9ba8ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});