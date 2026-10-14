import React, { useState, useRef, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthContext";
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL;

// Define the shape of a chat message
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

export default function AiAssistant() {
    const authContext = useContext(AuthContext);
    const settings = authContext?.settings;

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-msg',
            text: "Hello! I'm your BarangayKo AI Assistant. I can help with certificate requirements, permit procedures, office hours, and welfare programs. How can I help you today?",
            sender: 'bot'
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const faqCategories = [
        {
            title: "Permits & Clearances",
            prompts: ["How do I get a barangay clearance?", "Requirements for business permit?", "How much are the permit fees?"]
        },
        {
            title: "Social Services",
            prompts: ["Certificate of Indigency requirements", "What welfare programs are available?", "How to apply for a Senior Citizen ID?"]
        },
        {
            title: "General Info & Safety",
            prompts: ["What are your office hours?", "List of emergency hotlines", "How to report an incident?"]
        }
    ];
    const [expandedCategory, setExpandedCategory] = useState<string | null>("Permits & Clearances");
    
    // Auto-scroll reference
    const messagesEndRef = useRef<HTMLDivElement>(null);



    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        // 1. Add user message to UI immediately
        const newUserMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/ai-assistant/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: text })
            });

            if (response.ok) {
                const data = await response.json();
                // 2. Add AI response to UI
                const newBotMsg: Message = { id: (Date.now() + 1).toString(), text: data.reply, sender: 'bot' };
                setMessages(prev => [...prev, newBotMsg]);
            } else if (response.status === 429) {
                alert("You are sending messages too quickly. Please wait a moment.");
            } else {
                console.error("API Error:", response.status);
                alert("Something went wrong connecting to the assistant.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(inputValue);
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            
            

            <div className="flex flex-1 overflow-hidden">
                
                
                
                <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f4f7fa]">
                    
                    <div className="max-w-6xl mx-auto h-full flex flex-col">
                        
                        {/* Header (Shared across both columns) */}
                        <div className="mb-6 shrink-0">
                            <h1 className="text-2xl font-bold text-gray-900">AI Barangay Assistant</h1>
                            <p className="text-gray-500 text-sm mt-1">Get answers to common barangay service questions</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-[500px] pb-8">
                        
                            {/* LEFT COLUMN: CHAT */}
                            <div className="flex-1 flex flex-col h-full">

                        {/* GLOBAL SETTING CHECK: If Chatbot is disabled in Admin Hub */}
                        {settings && !settings.ai_chatbot_enabled ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3 my-auto">
                                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">!</div>
                                <h3 className="text-lg font-bold text-amber-900">AI Assistant Temporarily Unavailable</h3>
                                <p className="text-sm text-amber-700 max-w-md mx-auto">
                                    The AI Chatbot assistant has been temporarily disabled by the barangay administration for scheduled maintenance or system updates. Please check back later.
                                </p>
                            </div>
                        ) : (
                            /* Chat Container Layout */
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col flex-1 min-h-[500px] mb-8">
                                
                                {/* Message History Area */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            
                                            {/* Bot Icon */}
                                            {msg.sender === 'bot' && (
                                                <div className="w-8 h-8 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Text Bubble */}
                                            <div className={`max-w-[85%] px-4 py-3 rounded-lg text-sm shadow-sm break-words overflow-hidden ${
                                                msg.sender === 'user' 
                                                ? 'bg-[#16a34a] text-white rounded-br-none' 
                                                : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                                            }`}>
                                                {msg.sender === 'bot' ? (
                                                    <ReactMarkdown 
                                                        components={{
                                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                                            li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                                                            strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-gray-900 mt-3" {...props} />,
                                                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-gray-900 mt-3" {...props} />,
                                                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 text-gray-900 mt-2" {...props} />,
                                                        }}
                                                    >
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Loading Indicator */}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="w-8 h-8 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg rounded-bl-none shadow-sm flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Invisible div to scroll to */}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Form & Suggestions Area */}
                                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0">
                                    
                                    <form onSubmit={onSubmit} className="flex gap-3">
                                        <input 
                                            type="text" 
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            disabled={isLoading}
                                            placeholder="Ask about barangay services..." 
                                            className="flex-1 border border-gray-300 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-green-600 transition-shadow disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={isLoading || !inputValue.trim()}
                                            className="bg-[#16a34a] hover:bg-green-800 text-white px-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                        </div>

                        {/* RIGHT COLUMN: FAQ Panel */}
                        {(!settings || settings.ai_chatbot_enabled) && (
                            <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                    <h3 className="font-bold text-gray-900 mb-1">Frequently Asked Questions</h3>
                                    <p className="text-xs text-gray-500 mb-4">Click a category to see quick prompts.</p>
                                    
                                    <div className="space-y-3">
                                        {faqCategories.map((cat, idx) => (
                                            <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                                                <button 
                                                    onClick={() => setExpandedCategory(expandedCategory === cat.title ? null : cat.title)}
                                                    className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                                                >
                                                    <span className="font-semibold text-sm text-gray-800">{cat.title}</span>
                                                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedCategory === cat.title ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                                
                                                {expandedCategory === cat.title && (
                                                    <div className="p-3 border-t border-gray-100 flex flex-col gap-2">
                                                        {cat.prompts.map((prompt, pIdx) => (
                                                            <button
                                                                key={pIdx}
                                                                onClick={() => handleSendMessage(prompt)}
                                                                disabled={isLoading}
                                                                className="text-left px-3 py-2 bg-white border border-green-200 text-green-700 text-xs font-semibold rounded-lg shadow-sm hover:bg-green-50 hover:border-green-300 transition-all disabled:opacity-50"
                                                            >
                                                                "{prompt}"
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}