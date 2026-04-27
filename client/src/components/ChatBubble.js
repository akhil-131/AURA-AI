import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import Markdown from 'react-native-markdown-display';

// 🌟 MOVED TO TOP: React needs to read these styles BEFORE the ChatBubble uses them!
const styles = StyleSheet.create({
  bubbleWrapper: { marginVertical: 12, maxWidth: '95%', alignSelf: 'flex-start' },
  aiAlign: { alignSelf: 'flex-start' },
  userAlign: { alignSelf: 'flex-end' },
  
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 4 },
  aiLabel: { color: '#9ba8ff', fontSize: 11, fontWeight: 'bold', marginLeft: 6, letterSpacing: 1 },
  
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  aiBubble: { backgroundColor: '#13131c', borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)', borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: '#2949ef', borderTopRightRadius: 4 },
  userText: { color: '#ffffff', fontSize: 15, lineHeight: 24 },
  
  thinkingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  thinkingText: { color: '#9ba8ff', fontSize: 14, fontStyle: 'italic' },
  
  actionRow: { flexDirection: 'row', marginTop: 8, marginLeft: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 16, padding: 4 },
  actionText: { color: '#ababab', fontSize: 12, marginLeft: 4 },
});

// --- 🌟 STRICT DARK MODE MARKDOWN THEME ---
const markdownStyles = StyleSheet.create({
  body: { color: '#e0e0e0', fontSize: 15, lineHeight: 26 },
  paragraph: { marginBottom: 10, marginTop: 0 },
  strong: { fontWeight: 'bold', color: '#ffffff' },
  em: { fontStyle: 'italic', color: '#ababab' },
  
  // Headings
  heading1: { color: '#9ba8ff', fontSize: 24, fontWeight: 'bold', marginBottom: 12, marginTop: 16 },
  heading2: { color: '#9ba8ff', fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginTop: 14 },
  heading3: { color: '#9ba8ff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
  
  // Lists
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 4 },
  
  // Inline Code
  code_inline: {
    backgroundColor: 'rgba(155, 168, 255, 0.15)',
    color: '#ff6e84',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
    overflow: 'hidden'
  },
  
  // 🌟 AGGRESSIVE OVERRIDES FOR ALL CODE BLOCKS
  code_block: {
    backgroundColor: '#0a0a14', color: '#a3b1ff',
    padding: 16, borderRadius: 8, fontFamily: 'monospace',
    borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)',
    marginTop: 12, marginBottom: 12, overflow: 'hidden'
  },
  fence: {
    backgroundColor: '#0a0a14', color: '#a3b1ff',
    padding: 16, borderRadius: 8, fontFamily: 'monospace',
    borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)',
    marginTop: 12, marginBottom: 12, overflow: 'hidden'
  },
  pre: { 
    backgroundColor: '#0a0a14', color: '#a3b1ff',
    padding: 16, borderRadius: 8, fontFamily: 'monospace',
    borderWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)',
    marginTop: 12, marginBottom: 12, overflow: 'hidden'
  },
  code: { 
    backgroundColor: '#0a0a14', color: '#a3b1ff',
    fontFamily: 'monospace'
  },
  
  // Tables & Quotes
  hr: { backgroundColor: 'rgba(155, 168, 255, 0.2)', height: 1, marginTop: 16, marginBottom: 16 },
  blockquote: {
    backgroundColor: 'rgba(155, 168, 255, 0.05)', borderLeftColor: '#9ba8ff',
    borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10
  },
  table: { borderColor: 'rgba(155, 168, 255, 0.3)', borderWidth: 1, borderRadius: 8 },
  tr: { borderBottomWidth: 1, borderColor: 'rgba(155, 168, 255, 0.2)' },
  th: { padding: 8, fontWeight: 'bold', color: '#9ba8ff', backgroundColor: 'rgba(155, 168, 255, 0.1)' },
  td: { padding: 8, color: '#e0e0e0' },
  link: { color: '#9ba8ff', textDecorationLine: 'underline' },
});

export default function ChatBubble({ text, isAi }) {
  
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: 'Copied to Clipboard' });
  };

  const isThinking = isAi && text === "";

  return (
    <View style={[styles.bubbleWrapper, isAi ? styles.aiAlign : styles.userAlign]}>
      
      {/* 🌟 AURA Header */}
      {isAi && (
        <View style={styles.aiHeader}>
          <MaterialIcons name="auto-awesome" size={14} color="#9ba8ff" />
          <Text style={styles.aiLabel}>AURA AI</Text>
        </View>
      )}

      <View style={[styles.bubble, isAi ? styles.aiBubble : styles.userBubble]}>
        {isThinking ? (
          /* 🌟 Thinking Animation */
          <View style={styles.thinkingContainer}>
            <ActivityIndicator size="small" color="#9ba8ff" />
            <Text style={styles.thinkingText}>AURA is thinking...</Text>
          </View>
        ) : (
          isAi ? (
            /* 🌟 Markdown Engine */
            <Markdown style={markdownStyles}>{text}</Markdown>
          ) : (
            <Text style={styles.userText}>{text}</Text>
          )
        )}
      </View>

      {/* 🌟 Copy Button */}
      {isAi && !isThinking && (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={copyToClipboard} style={styles.actionButton}>
            <MaterialIcons name="content-copy" size={14} color="#ababab" />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}