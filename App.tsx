import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, ArrowRight, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { Chat } from '@google/genai';
import { createChatSession, analyzeImage, sendMessage } from './services/geminiService';
import { ChatInterface } from './components/ChatInterface';
import { Message, MessageRole, AnalysisState } from './types';
import { v4 as uuidv4 } from 'uuid';

// Helper for UUID if library not available in environment, but assuming popular libs allowed. 
// If uuid fails, simple random string fallback.
const generateId = () => Math.random().toString(36).substring(2, 15);

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' });
  const [messages, setMessages] = useState<Message[]>([]);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAnalysisState({ status: 'idle' });
      setMessages([]);
      chatSessionRef.current = null;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalysisState({ status: 'analyzing' });
    
    try {
      // Initialize chat session
      const chat = createChatSession();
      chatSessionRef.current = chat;

      const initialPrompt = "Analyze this image of a room. Identify the main clutter points and provide 3 concrete, actionable steps to organize it effectively. Be concise but helpful.";

      // Add user message to UI immediately for feedback
      /* 
         Note: We don't strictly need to show the 'initial prompt' as a bubble since it's implied by the 'Analyze' action,
         but showing the image in the chat flow or just a welcome message is good.
         Let's just show the AI's response to start.
      */
      
      const responseText = await analyzeImage(chat, selectedFile, initialPrompt);

      const initialResponse: Message = {
        id: generateId(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };

      setMessages([initialResponse]);
      setAnalysisState({ status: 'complete' });

    } catch (error: any) {
      console.error("Analysis failed:", error);
      setAnalysisState({ 
        status: 'error', 
        error: error.message || "Failed to analyze the image. Please try again." 
      });
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSessionRef.current) return;

    const newUserMessage: Message = {
      id: generateId(),
      role: MessageRole.USER,
      text: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setAnalysisState({ status: 'analyzing' }); // Re-use analyzing state for "thinking" indicator if desired, or pass separate prop

    try {
      const responseText = await sendMessage(chatSessionRef.current, text);
      
      const newBotMessage: Message = {
        id: generateId(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newBotMessage]);
    } catch (error) {
      console.error("Message failed:", error);
      // Optionally add an error message bubble
    } finally {
      setAnalysisState({ status: 'complete' });
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMessages([]);
    setAnalysisState({ status: 'idle' });
    chatSessionRef.current = null;
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <RefreshCw size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">RoomResQ</h1>
          </div>
          <div className="flex items-center gap-4">
             {analysisState.status !== 'idle' && (
               <button 
                 onClick={resetApp}
                 className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                 <RefreshCw size={14} />
                 Start Over
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {analysisState.status === 'idle' && !previewUrl && (
           <div className="max-w-2xl mx-auto text-center space-y-8 mt-12">
             <div className="space-y-4">
               <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                 Transform Your Chaos into <span className="text-indigo-600">Calm</span>
               </h2>
               <p className="text-lg text-slate-600 max-w-xl mx-auto">
                 Upload a photo of your messy room, desk, or closet. Our AI will analyze the space and give you a personalized step-by-step plan to declutter it.
               </p>
             </div>

             <div className="group relative block w-full aspect-video max-w-md mx-auto border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <div className="p-4 rounded-full bg-slate-100 group-hover:bg-indigo-100 mb-3 transition-colors">
                    <Upload size={32} />
                  </div>
                  <p className="font-medium">Drop a photo here or click to upload</p>
                  <p className="text-xs mt-1 text-slate-400">Supports JPG, PNG</p>
                </div>
             </div>
           </div>
        )}

        {/* Preview & Analyze Stage */}
        {previewUrl && analysisState.status === 'idle' && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
              <img src={previewUrl} alt="Room Preview" className="w-full h-auto object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white text-sm font-medium flex items-center gap-2">
                  <ImageIcon size={16} />
                  {selectedFile?.name}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Ready to organize?</h3>
                <p className="text-slate-600">
                  Our AI model (Gemini 2.0) will scan this image to identify item categories, storage opportunities, and quick wins.
                </p>
              </div>
              
              <button 
                onClick={handleAnalyze}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-indigo-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                Analyze My Room <ArrowRight size={20} />
              </button>
              
              <button 
                onClick={resetApp}
                className="w-full md:w-auto block text-center text-slate-500 hover:text-slate-800 text-sm font-medium"
              >
                Choose a different photo
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {analysisState.status === 'analyzing' && messages.length === 0 && (
          <div className="max-w-md mx-auto text-center mt-20 space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-indigo-600 animate-pulse" size={32} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Analyzing your space...</h3>
              <p className="text-slate-500 mt-2">identifying clutter, surfaces, and storage potential.</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {analysisState.status === 'error' && (
           <div className="max-w-md mx-auto mt-12 bg-red-50 border border-red-100 rounded-xl p-6 text-center">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertCircle size={24} />
             </div>
             <h3 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h3>
             <p className="text-red-600 mb-6">{analysisState.error}</p>
             <button 
               onClick={() => setAnalysisState({ status: 'idle' })}
               className="px-6 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
             >
               Try Again
             </button>
           </div>
        )}

        {/* Results & Chat View */}
        {(analysisState.status === 'complete' || (analysisState.status === 'analyzing' && messages.length > 0)) && (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* Left Panel: Image Reference */}
            <div className="lg:w-1/3 flex flex-col gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Reference Image</h3>
                <div className="relative rounded-lg overflow-hidden bg-slate-100">
                   <img src={previewUrl!} alt="Room" className="w-full h-auto max-h-[40vh] object-contain mx-auto" />
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 hidden lg:block">
                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <Sparkles size={16} /> Pro Tip
                </h4>
                <p className="text-sm text-indigo-800">
                  Ask specific questions like "Where should I put the shoes?" or "What type of bins would work best on that shelf?"
                </p>
              </div>
            </div>

            {/* Right Panel: Chat */}
            <div className="lg:w-2/3 h-full">
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleSendMessage}
                isTyping={analysisState.status === 'analyzing'}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}