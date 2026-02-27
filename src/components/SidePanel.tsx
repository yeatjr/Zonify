'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Loader2, Send, Bot, User, CheckCircle, XCircle, Image as ImageIcon, MapPin, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc } from '@/lib/utils';

interface SidePanelProps {
    isOpen: boolean;
    location: { lat: number, lng: number } | null;
    onCancel: () => void;
    onSuccess: () => void;
    onAiAction?: (action: any) => void;
    placeName?: string | null;
    refiningIdea?: any;
}

type Message = {
    role: 'user' | 'model';
    text: string;
    imageBase64?: string | null;
};

export default function SidePanel({ isOpen, location, onCancel, onSuccess, onAiAction, placeName, refiningIdea }: SidePanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'DRAFT' | 'VALIDATED' | 'REJECTED'>('DRAFT');
    const [feasibility, setFeasibility] = useState<number | null>(null);
    const [simulation, setSimulation] = useState(false);
    const [visionLoading, setVisionLoading] = useState(false);
    const [generatedVision, setGeneratedVision] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user, loginWithGoogle } = useAuth();

    // Initial greeting when panel opens
    useEffect(() => {
        if (isOpen) {
            const isInitial = messages.length === 0;
            const isScanning = messages.length === 1 && messages[0].text.includes("scanning");

            if (isInitial || isScanning) {
                const isRealName = placeName && placeName !== "Detecting location...";
                let greeting = isRealName
                    ? `Hi! I see you're interested in **${placeName}**. What's your vision for this location?`
                    : "Hi! I'm scanning this location for you... What kind of renovation or new business would you like to propose here?";

                if (refiningIdea) {
                    greeting = `Hi! You are adding details to the existing proposal **${refiningIdea.businessType}**. What new changes or details would you like to add?`;
                }

                // Only update if the greeting actually changes
                if (isInitial || (isRealName && isScanning)) {
                    setMessages([{ role: 'model', text: greeting }]);
                }
            }
            setStatus('DRAFT');
            setFeasibility(null);
            setSimulation(false);
            setGeneratedVision(null);
        }
        if (!isOpen) {
            setMessages([]);
            setInput('');
            setError('');
        }
    }, [isOpen, placeName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !location) return;

        const userText = input.trim();
        const newMessages = [...messages, { role: 'user' as const, text: userText }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, location, placeName, refiningIdea })
            });

            if (!res.ok) throw new Error('Failed to get response');

            const data = await res.json();

            setMessages((prev) => [...prev, { role: 'model', text: data.text }]);

            const action = data.action;
            if (action) {
                if (onAiAction) onAiAction(action);

                setStatus(action.status);
                if (action.feasibility_score > 0) setFeasibility(action.feasibility_score);

                if (action.status === 'VALIDATED') {
                    setVisionLoading(true);
                    setStatusText('Capturing map perspective...');

                    // Capture Context Images
                    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${location.lat},${location.lng}&fov=90&pitch=0&key=${googleApiKey}`;
                    const satUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=19&size=640x640&maptype=satellite&format=jpg&key=${googleApiKey}`;

                    const fetchBase64 = async (url: string) => {
                        try {
                            const r = await fetch(url);
                            if (!r.ok) return null;
                            const blob = await r.blob();
                            return new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.readAsDataURL(blob);
                                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                            });
                        } catch { return null; }
                    };

                    const [svBase64, satBase64] = await Promise.all([fetchBase64(svUrl), fetchBase64(satUrl)]);

                    // Trigger Backend Vision Generation
                    let finalVisionImage = null;
                    let analysisData = null;
                    try {
                        setStatusText('AI: Analyzing urban environment...');
                        const visionRes = await fetch('/api/vision/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                text: action.idea_description || userText,
                                location,
                                streetView: svBase64,
                                satellite: satBase64,
                                placeName: action.idea_title,
                                placeTypes: []
                            })
                        });
                        const visionData = await visionRes.json();
                        if (visionData.success && visionData.visionUrl) {
                            finalVisionImage = visionData.visionUrl;
                            analysisData = visionData.analysis;
                            setGeneratedVision(visionData.visionUrl);
                        }
                    } catch (vErr) {
                        console.error("Vision Generation failed:", vErr);
                    } finally {
                        setVisionLoading(false);
                        setStatusText('');
                    }

                    const visionUrl = finalVisionImage;

                    const linkedPlaceId = `civic_${location.lat.toFixed(5)}_${location.lng.toFixed(5)}`;

                    const pinPayload = {
                        lat: location.lat,
                        lng: location.lng,
                        review: action.idea_description || "Agent Chat History Logged",
                        businessType: action.idea_title || "New Proposal",
                        author: user?.displayName || user?.email || "Anonymous",
                        agreementCount: 0,
                        saturationIndex: action.feasibility_score || 5, // Feasibility replaces Saturation temporarily for demo
                        visionImage: visionUrl,
                        streetViewUrl: svUrl,
                        satelliteUrl: satUrl,
                        analysis: analysisData,
                        createdAt: new Date(),
                        userId: user?.uid || null,
                        parentIdeaId: refiningIdea ? refiningIdea.id : null
                    };

                    const commentPayload = {
                        placeId: linkedPlaceId,
                        placeName: action.idea_title || placeName || "CivicSense Proposal",
                        text: action.idea_description || userText,
                        author: user?.displayName || "Civic User",
                        likes: 0,
                        imageStatus: visionUrl ? 'done' : 'failed',
                        imageBase64: visionUrl,
                        environmentAnalysis: analysisData?.envAnalysis || null,
                        satelliteAnalysis: analysisData?.satelliteAnalysis || null,
                        timestamp: new Date(),
                        source: 'CivicSense'
                    };

                    const placePayload = {
                        name: action.idea_title || placeName || "CivicSense Proposal",
                        address: placeName || "Civic Location",
                        latitude: location.lat,
                        longitude: location.lng,
                        lastUpdated: new Date(),
                        isCivicSense: true
                    };

                    await Promise.all([
                        addDoc(collection(db, 'pins'), pinPayload),
                        addDoc(collection(db, 'comments'), commentPayload),
                        // use setDoc if we want a specific ID, but firestore v9 web uses different syntax
                        // Let's use the standard doc/setDoc pattern for places to use our custom placeId
                    ]);

                    await setDoc(doc(db, 'places', linkedPlaceId), placePayload, { merge: true });


                    // Add vision to chat history before closing or staying
                    if (visionUrl) {
                        setMessages(prev => [...prev, {
                            role: 'model',
                            text: 'I have generated a 3D architecture vision for your proposal:',
                            imageBase64: visionUrl
                        }]);
                    }

                    // Delay closing or let user see it
                    // onSuccess();
                }

                if (action.map_action === 'SHOW_3D_SIMULATION') {
                    console.log("3D Simulation Triggered at", action.coordinates);
                    setSimulation(true);
                }
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="side-panel"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute top-0 right-0 w-80 md:w-96 h-full z-20 flex flex-col shadow-2xl backdrop-blur-xl bg-white/10 dark:bg-black/40 border-l border-white/20 dark:border-white/10"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <div className="flex-1 min-w-0 mr-4">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500 font-outfit truncate">
                                {placeName || "AI Planning Agent"}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                                    {placeName === "Detecting location..." ? "Searching..." : (placeName ? "Contextual Planning" : `Status: ${status}`)}
                                </div>
                                {feasibility !== null && (
                                    <div className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded flex items-center gap-1">
                                        Score: {feasibility}/10
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-200" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {/* Selected Place Context Display */}
                        {placeName && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6"
                            >
                                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <MapPin className="w-12 h-12" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Active Planning Context</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white leading-tight">
                                            {placeName}
                                        </h3>
                                        <p className="text-[10px] text-white/50 mt-1 font-medium">
                                            Coordinates: {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600/50' : 'bg-purple-600/50'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-blue-200" /> : <Bot className="w-4 h-4 text-purple-200" />}
                                </div>
                                <div className={`text-sm py-2 px-3 rounded-2xl max-w-[80%] leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white/10 text-gray-200 border border-white/10 rounded-tl-sm'
                                    }`}>
                                    {msg.text}
                                    {msg.imageBase64 && (
                                        <div className="mt-3 rounded-lg overflow-hidden border border-white/20 shadow-lg">
                                            <img
                                                src={getImageSrc(msg.imageBase64)}
                                                alt="AI Vision"
                                                className="w-full h-auto object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {loading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-600/50 flex items-center justify-center shrink-0">
                                    <Loader2 className="w-4 h-4 text-purple-200 animate-spin" />
                                </div>
                                <div className="bg-white/5 py-2 px-4 rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Status Banners */}
                    {status === 'VALIDATED' && (
                        <div className="mx-5 mb-2 bg-green-500/20 border border-green-500/30 p-3 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                            <p className="text-xs text-green-200">Proposal Approved! Saving to map...</p>
                        </div>
                    )}
                    {status === 'REJECTED' && (
                        <div className="mx-5 mb-2 bg-red-500/20 border border-red-500/30 p-3 rounded-xl flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-xs text-red-200">Proposal Rejected. Close panel or try a different idea.</p>
                        </div>
                    )}

                    {simulation && (
                        <div className="mx-5 mb-2 bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                                <p className="text-xs text-blue-200 font-bold">Generating 3D Simulation (Nano Banana model)...</p>
                            </div>
                        </div>
                    )}

                    {visionLoading && (
                        <div className="mx-5 mb-2 bg-purple-500/20 border border-purple-500/30 p-3 rounded-xl flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <ImageIcon className="w-5 h-5 text-purple-400 animate-pulse shrink-0" />
                                <div className="flex flex-col">
                                    <p className="text-xs text-purple-200 font-bold">Generating Architecture Vision...</p>
                                    {statusText && <p className="text-[10px] text-purple-300/80 animate-pulse">{statusText}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mx-5 mb-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}



                    {/* Input Area */}
                    <div className="p-5 border-t border-white/10 bg-black/20">
                        <form onSubmit={handleSend} className="relative">
                            <input
                                type="text"
                                placeholder={status === 'VALIDATED' ? "Approved..." : (user ? "Type your answer..." : "Chat as Guest...")}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading || status === 'VALIDATED'}
                                className="w-full bg-black/50 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim() || status === 'VALIDATED'}
                                className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center bg-purple-600 rounded-full text-white hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </form>
                        {!user && (
                            <div className="mt-2 text-center">
                                <button
                                    onClick={() => loginWithGoogle()}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto"
                                >
                                    <LogIn className="w-3 h-3" />
                                    Sign in to save visions to the map
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
