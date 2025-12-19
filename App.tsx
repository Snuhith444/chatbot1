
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Role, Message, ChatThread, MessagePart } from './types';
import { generateChatResponse } from './services/geminiService';
import { 
  PlusIcon, 
  TrashIcon, 
  SendIcon, 
  MessageSquareIcon, 
  ImageIcon, 
  BotIcon, 
  UserIcon,
  XIcon
} from './components/Icons';
import Markdown from './components/Markdown';

const App: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{data: string, type: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gemini_threads');
    if (saved) {
      const parsed = JSON.parse(saved);
      setThreads(parsed);
      if (parsed.length > 0) {
        setActiveThreadId(parsed[0].id);
      }
    } else {
      createNewThread();
    }
  }, []);

  // Save threads to localStorage on change
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem('gemini_threads', JSON.stringify(threads));
    }
  }, [threads]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [threads, isTyping, scrollToBottom]);

  const createNewThread = () => {
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeThreadId === id) {
        setActiveThreadId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage({
          data: (reader.result as string).split(',')[1],
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isTyping || !activeThreadId) return;

    const userParts: MessagePart[] = [];
    if (inputText.trim()) userParts.push({ text: inputText });
    if (attachedImage) {
      userParts.push({ 
        inlineData: { 
          mimeType: attachedImage.type, 
          data: attachedImage.data 
        } 
      });
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: inputText,
      parts: userParts,
      timestamp: Date.now()
    };

    const threadToUpdate = threads.find(t => t.id === activeThreadId);
    if (!threadToUpdate) return;

    const updatedMessages = [...threadToUpdate.messages, newUserMessage];
    
    setThreads(prev => prev.map(t => 
      t.id === activeThreadId 
        ? { 
            ...t, 
            messages: updatedMessages, 
            updatedAt: Date.now(),
            title: t.messages.length === 0 ? inputText.slice(0, 30) || 'Image Query' : t.title
          } 
        : t
    ));

    setInputText('');
    setAttachedImage(null);
    setIsTyping(true);

    try {
      const placeholderId = (Date.now() + 1).toString();
      const modelMessage: Message = {
        id: placeholderId,
        role: Role.MODEL,
        content: '',
        timestamp: Date.now()
      };

      setThreads(prev => prev.map(t => 
        t.id === activeThreadId 
          ? { ...t, messages: [...updatedMessages, modelMessage] } 
          : t
      ));

      await generateChatResponse(updatedMessages, (chunk) => {
        setThreads(prev => prev.map(t => 
          t.id === activeThreadId 
            ? { 
                ...t, 
                messages: t.messages.map(m => 
                  m.id === placeholderId ? { ...m, content: chunk } : m
                ) 
              } 
            : t
        ));
      });
    } catch (error) {
      console.error(error);
      // Handle error visually if needed
    } finally {
      setIsTyping(false);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800">
        <div className="p-4">
          <button 
            onClick={createNewThread}
            className="flex items-center justify-center w-full gap-2 p-3 bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg font-medium shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {threads.map(thread => (
            <div
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                activeThreadId === thread.id 
                  ? 'bg-slate-800 text-blue-400' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquareIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium">{thread.title}</span>
              </div>
              <button 
                onClick={(e) => deleteThread(thread.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-300">Free Tier</span>
              <span className="text-[10px] text-slate-500">Gemini 3 Flash</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 z-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <button onClick={() => {/* Toggle mobile sidebar */}} className="p-2 text-slate-400">
                <MessageSquareIcon className="w-6 h-6" />
              </button>
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {activeThread?.title || 'Gemini Pro'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Live
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {activeThread?.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-4">
                <BotIcon className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-200">How can I help you today?</h2>
              <p className="text-slate-400 max-w-md">
                I'm powered by Gemini 3 Flash. I can help with coding, writing, visual analysis, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                {['Write a story about space', 'Help me debug my React code', 'What are the benefits of TS?', 'Explain quantum physics simply'].map((suggestion) => (
                  <button 
                    key={suggestion}
                    onClick={() => setInputText(suggestion)}
                    className="p-4 text-left text-sm text-slate-400 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeThread?.messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-4 ${message.role === Role.USER ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                message.role === Role.USER ? 'bg-indigo-600' : 'bg-slate-800'
              }`}>
                {message.role === Role.USER ? <UserIcon className="w-5 h-5" /> : <BotIcon className="w-5 h-5 text-blue-400" />}
              </div>
              
              <div className={`flex flex-col max-w-[85%] ${message.role === Role.USER ? 'items-end' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === Role.USER 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}>
                  {message.parts?.map((part, idx) => (
                    <div key={idx} className="mb-2">
                      {part.inlineData && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                          <img 
                            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                            alt="Uploaded content" 
                            className="max-h-64 object-contain"
                          />
                        </div>
                      )}
                      {part.text && <Markdown content={part.text} />}
                    </div>
                  ))}
                  {!message.parts && <Markdown content={message.content} />}
                </div>
                <span className="mt-1 text-[10px] text-slate-500 font-medium px-2">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950">
          <div className="max-w-4xl mx-auto">
            {attachedImage && (
              <div className="mb-2 relative inline-block group">
                <img 
                  src={`data:${attachedImage.type};base64,${attachedImage.data}`} 
                  className="w-20 h-20 object-cover rounded-lg border-2 border-blue-500 shadow-xl"
                  alt="Preview"
                />
                <button 
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 border border-slate-700 hover:bg-slate-800"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="relative group">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Message Gemini..."
                rows={1}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl py-4 pl-4 pr-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all shadow-xl max-h-48"
                style={{ height: 'auto', minHeight: '56px' }}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <label className="p-2 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors rounded-xl hover:bg-slate-800">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                  />
                  <ImageIcon className="w-5 h-5" />
                </label>
                <button 
                  type="submit"
                  disabled={isTyping || (!inputText.trim() && !attachedImage)}
                  className={`p-2 rounded-xl transition-all ${
                    isTyping || (!inputText.trim() && !attachedImage)
                      ? 'text-slate-600 bg-slate-800/50 cursor-not-allowed'
                      : 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg'
                  }`}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] text-slate-500">
              Gemini may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
