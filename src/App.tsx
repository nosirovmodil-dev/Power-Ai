/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Plus, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  Image as ImageIcon, 
  Mic, 
  Send,
  History,
  MoreVertical,
  Search,
  Sparkles,
  Zap,
  User,
  ChevronDown,
  Globe,
  Compass,
  Code,
  Lightbulb,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'audio';
  audioUrl?: string;
  timestamp: Date;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audioMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: 'Voice message',
          type: 'audio',
          audioUrl: audioUrl,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, audioMessage]);
        // Simulate AI response to voice message
        simulateAIResponse("I've received your voice message. How can I help you further?");
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const simulateAIResponse = async (text: string) => {
    setIsLoading(true);
    try {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Initialize Gemini API inside the handler to ensure fresh API key
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview"; 
      
      const response = await genAI.models.generateContent({
        model: model,
        contents: currentInput,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Error: Failed to connect to Gemini API. Please make sure you have set your GEMINI_API_KEY in the Settings menu.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-[#1f1f1f] font-sans">
      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#e3e3e3]"
            >
              <h3 className="text-xl font-medium mb-4 capitalize">{activeModal}</h3>
              <p className="text-[#444746] mb-6">
                {activeModal === 'settings' && "Configure your Power AI experience. API keys are managed via the platform settings menu."}
                {activeModal === 'activity' && "View your past interactions and search history with Power AI."}
                {activeModal === 'help' && "Get support and learn how to make the most of Power AI's capabilities."}
              </p>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-2 bg-[#041e49] text-white rounded-full font-medium hover:bg-[#062e6f] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 68, opacity: 1 }}
        className="flex flex-col bg-[#f0f4f9] overflow-hidden whitespace-nowrap transition-all duration-300"
      >
        <div className="p-4 flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 hover:bg-[#e1e5ea] rounded-full transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="px-3 mt-4">
          <button 
            onClick={handleNewChat}
            className={`flex items-center gap-3 px-4 py-3 bg-[#e1e5ea] text-[#444746] rounded-full hover:bg-[#d3d7dc] transition-all font-medium ${!isSidebarOpen && 'w-10 h-10 p-0 justify-center'}`}
          >
            <Plus size={20} className="shrink-0 text-yellow-600" />
            {isSidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 mt-8 space-y-1 scrollbar-hide">
          {isSidebarOpen && <div className="text-sm font-medium text-[#1f1f1f] px-4 py-2">Recent</div>}
          {[
            "How to use Power AI",
            "React development tips",
            "Creative writing prompt",
            "Travel planning"
          ].map((chat, i) => (
            <button key={i} className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#e1e5ea] rounded-full text-sm text-[#1f1f1f] transition-colors group ${!isSidebarOpen && 'justify-center'}`}>
              <MessageSquare size={18} className="shrink-0 text-[#444746] group-hover:text-yellow-600" />
              {isSidebarOpen && <span className="truncate">{chat}</span>}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-1">
          <button 
            onClick={() => setActiveModal('help')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#e1e5ea] rounded-full text-sm text-[#1f1f1f] transition-colors group ${!isSidebarOpen && 'justify-center'}`}
          >
            <HelpCircle size={20} className="shrink-0 text-[#444746] group-hover:text-yellow-600" />
            {isSidebarOpen && <span>Help</span>}
          </button>
          <button 
            onClick={() => setActiveModal('activity')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#e1e5ea] rounded-full text-sm text-[#1f1f1f] transition-colors group ${!isSidebarOpen && 'justify-center'}`}
          >
            <History size={20} className="shrink-0 text-[#444746] group-hover:text-yellow-600" />
            {isSidebarOpen && <span>Activity</span>}
          </button>
          <button 
            onClick={() => setActiveModal('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#e1e5ea] rounded-full text-sm text-[#1f1f1f] transition-colors group ${!isSidebarOpen && 'justify-center'}`}
          >
            <Settings size={20} className="shrink-0 text-[#444746] group-hover:text-yellow-600" />
            {isSidebarOpen && <span>Settings</span>}
          </button>
          
          {isSidebarOpen && (
            <div className="mt-4 px-4 py-2 flex items-center gap-3">
              <img 
                src="https://picsum.photos/seed/odil/100/100" 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-[#e3e3e3]"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">Modil Nosirov</span>
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sticky top-0 z-10 bg-white">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f0f4f9] rounded-lg transition-colors text-[#444746] text-sm font-medium">
              <Zap size={20} className="text-yellow-500 fill-yellow-500" />
              <div className="flex flex-col items-start -space-y-1">
                <span className="font-google font-medium text-[18px]">Power AI</span>
                <span className="text-[9px] text-gray-400 font-normal lowercase">powered by Odil Nosirov</span>
              </div>
              <ChevronDown size={16} className="mt-0.5 ml-1" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#f0f4f9] rounded-full transition-colors text-[#444746]">
              <Sparkles size={20} className="gemini-sparkle" />
            </button>
            <div className="ml-2">
              <img 
                src="https://picsum.photos/seed/odil/100/100" 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-[#e3e3e3]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-8"
              >
                <h2 className="text-5xl font-medium tracking-tight text-yellow-500 pb-2">
                  Hello, Modil
                </h2>
                <p className="text-3xl text-yellow-400/70 font-medium">How can I help you today?</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
                  {[
                    { icon: <Compass className="text-blue-500" />, text: "Suggest beautiful places to see on an upcoming road trip" },
                    { icon: <Lightbulb className="text-yellow-500" />, text: "Briefly summarize this concept: urban planning" },
                    { icon: <MessageCircle className="text-green-500" />, text: "Brainstorm team bonding activities for our work retreat" },
                    { icon: <Code className="text-purple-500" />, text: "Tell me about React and how to use it" }
                  ].map((card, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setInput(card.text); }}
                      className="p-4 bg-[#f0f4f9] rounded-2xl text-left hover:bg-[#e1e5ea] transition-all flex flex-col justify-between h-40 group"
                    >
                      <p className="text-sm text-[#1f1f1f] leading-relaxed">{card.text}</p>
                      <div className="p-2 bg-white rounded-full self-end group-hover:bg-[#f0f4f9] transition-colors">
                        {card.icon}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-10 pb-20">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-white border border-[#e3e3e3] flex items-center justify-center shrink-0 mt-1">
                        <Sparkles size={18} className="gemini-sparkle" />
                      </div>
                    )}
                    
                    <div className={msg.role === 'user' ? 'message-user' : 'flex-1'}>
                      {msg.type === 'audio' ? (
                        <div className="flex items-center gap-3 bg-[#e1e5ea] p-3 rounded-2xl min-w-[200px]">
                          <button 
                            onClick={(e) => {
                              const audio = (e.currentTarget.nextElementSibling as HTMLAudioElement);
                              if (audio.paused) audio.play();
                              else audio.pause();
                            }}
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#041e49] hover:bg-gray-100 transition-colors"
                          >
                            <Mic size={20} className="text-yellow-600" />
                          </button>
                          <audio src={msg.audioUrl} className="hidden" onEnded={(e) => {
                            // Reset icon or state if needed
                          }} />
                          <div className="flex-1 h-1 bg-gray-300 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-600 w-0 transition-all duration-100" />
                          </div>
                          <span className="text-xs font-medium text-[#444746]">Voice</span>
                        </div>
                      ) : (
                        <div className="text-[16px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="shrink-0 mt-1">
                        <img 
                          src="https://picsum.photos/seed/odil/100/100" 
                          alt="User" 
                          className="w-8 h-8 rounded-full object-cover border border-[#e3e3e3]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-[#e3e3e3] flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={18} className="gemini-sparkle animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-3 pt-2">
                      <div className="h-4 w-full loading-shimmer rounded"></div>
                      <div className="h-4 w-5/6 loading-shimmer rounded"></div>
                      <div className="h-4 w-4/6 loading-shimmer rounded"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white">
          <div className="max-w-3xl mx-auto relative">
            <div className="input-pill">
              {isRecording ? (
                <div className="flex-1 flex items-center px-4 gap-4">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-[#444746] flex-1">
                    Recording... {formatDuration(recordingDuration)}
                  </span>
                  <button 
                    onClick={stopRecording}
                    className="px-4 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors"
                  >
                    STOP
                  </button>
                </div>
              ) : (
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Enter a prompt here"
                  className="flex-1 bg-transparent border-none focus:ring-0 p-3 resize-none min-h-[56px] max-h-[200px] text-[16px] placeholder:text-[#444746]"
                  rows={1}
                />
              )}
              <div className="flex items-center gap-1 pr-2">
                {!isRecording && (
                  <>
                    <button className="p-2.5 hover:bg-[#e1e5ea] rounded-full transition-colors text-[#444746]">
                      <ImageIcon size={22} />
                    </button>
                    <button 
                      onClick={startRecording}
                      className="p-2.5 hover:bg-[#e1e5ea] rounded-full transition-colors text-yellow-600"
                    >
                      <Mic size={22} />
                    </button>
                  </>
                )}
                {input.trim() && !isRecording && (
                  <button 
                    onClick={handleSend}
                    className="p-2.5 text-[#1a73e8] hover:bg-[#e1e5ea] rounded-full transition-colors"
                  >
                    <Send size={22} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#444746] text-center mt-3 px-4">
              Power AI may display inaccurate info, including about people, so double-check its responses. <a href="#" className="underline">Your privacy and Power AI Apps</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
