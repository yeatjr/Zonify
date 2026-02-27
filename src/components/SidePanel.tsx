'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Loader2, Send, Bot, User, CheckCircle, XCircle, Image as ImageIcon, MapPin, LogIn, Activity } from 'lucide-react';
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
    const [breakdown, setBreakdown] = useState<any>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [siteAnalysis, setSiteAnalysis] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user, loginWithGoogle } = useAuth();

    const activeLocationRef = useRef<string>("");

    // Initial greeting when panel opens
    useEffect(() => {
        if (isOpen && location) {
            const newLocationStr = `${location.lat.toFixed(5)},${location.lng.toFixed(5)}`;
            const isDifferentLocation = activeLocationRef.current !== "" && activeLocationRef.current !== newLocationStr;
            activeLocationRef.current = newLocationStr;

            const isInitial = messages.length === 0;
            const isScanning = messages.length === 1 && messages[0].text.includes("scanning");

            if (isInitial || isScanning || status === 'VALIDATED' || isDifferentLocation || status === 'REJECTED') {
                const isRealName = placeName && placeName !== "Detecting location...";
                let greeting = isRealName
                    ? `Hi! I see you're interested in **${placeName}**. What's your vision for this location?`
                    : "Hi! I'm scanning this location for you... What kind of renovation or new business would you like any to propose here?";

                if (refiningIdea) {
                    greeting = `Hi! You are adding details to the existing proposal **${refiningIdea.businessType}**. What new changes or details would you like to add?`;
                }

                // Only update if the greeting actually changes or location changed
                if (isInitial || (isRealName && isScanning) || isDifferentLocation) {
                    if (isDifferentLocation) {
                        setMessages([]);
                        setStatus('DRAFT');
                        setFeasibility(null);
                        setGeneratedVision(null);
                        setBreakdown(null);
                        setShowBreakdown(false);
                        setSiteAnalysis(null);
                        setInput('');
                    }
                    setMessages(prev => [...(isDifferentLocation ? [] : prev), { role: 'model', text: greeting }]);
                }
            }
        }

        if (!isOpen) {
            setLoading(false);
            setShowBreakdown(false);
        }
    }, [isOpen, placeName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent, forceSubmit?: boolean) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !forceSubmit) || !location) return;

        const userText = forceSubmit ? "I have provided enough details. Please finalize and VALIDATE this proposal now." : input.trim();
        const newMessages = [...messages, { role: 'user' as const, text: userText }];
        setMessages(newMessages);
        if (!forceSubmit) setInput('');
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, location, placeName, refiningIdea, forceValidate: forceSubmit })
            });

            if (!res.ok) throw new Error('Failed to get response');

            const data = await res.json();

            setMessages((prev) => [...prev, { role: 'model', text: data.text }]);

            const action = data.action;
            if (action) {
                if (onAiAction) onAiAction(action);

                setStatus(action.status);
                if (action.feasibility_score > 0) setFeasibility(action.feasibility_score);
                if (action.scoring_breakdown) setBreakdown(action.scoring_breakdown);

                if (action.status === 'VALIDATED') {
                    console.log("[SidePanel] Entered VALIDATED block");
                    setVisionLoading(true);
                    setStatusText('Capturing map perspective...');

                    // Capture Context Images
                    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${location.lat},${location.lng}&fov=90&pitch=0&key=${googleApiKey}`;
                    const satUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=19&size=640x640&maptype=satellite&format=jpg&key=${googleApiKey}`;

                    const fetchBase64 = async (url: string) => {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 3000);
                            const r = await fetch(url, { signal: controller.signal });
                            clearTimeout(timeoutId);
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
                    let tempBase64 = null;
                    try {
                        setStatusText('AI: Analyzing urban environment...');
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 15000);

                        const visionRes = await fetch('/api/vision/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            signal: controller.signal,
                            body: JSON.stringify({
                                text: action.idea_description || userText,
                                location,
                                streetView: svBase64,
                                satellite: satBase64,
                                placeName: action.idea_title,
                                placeTypes: []
                            })
                        });
                        clearTimeout(timeoutId);

                        const visionData = await visionRes.json();
                        console.log("[SidePanel] Vision API returned data:", !!visionData);
                        if (visionData.success) {
                            finalVisionImage = visionData.visionUrl;
                            tempBase64 = visionData.base64;
                            analysisData = visionData.analysis;
                            setSiteAnalysis(visionData.analysis);
                            if (visionData.visionUrl) setGeneratedVision(visionData.visionUrl);
                        }
                    } catch (vErr) {
                        console.error("[SidePanel] Vision Generation failed:", vErr);
                    } finally {
                        console.log("[SidePanel] Leaving Vision Block");
                        setVisionLoading(false);
                        setStatusText('');
                    }

                    const visionUrl = finalVisionImage;

                    const linkedPlaceId = `civic_${location.lat.toFixed(5)}_${location.lng.toFixed(5)}`;

                    const pinPayload = {
                        lat: location.lat || null,
                        lng: location.lng || null,
                        review: action.idea_description || "Agent Chat History Logged",
                        businessType: action.idea_title || "New Proposal",
                        author: user?.displayName || user?.email || "Anonymous",
                        agreementCount: 0,
                        saturationIndex: action.feasibility_score || 5, // Feasibility replaces Saturation temporarily for demo
                        visionImage: finalVisionImage || null,
                        streetViewUrl: svUrl,
                        satelliteUrl: satUrl,
                        analysis: analysisData || null,
                        flags: action.flags || [],
                        createdAt: new Date(),
                        userId: user?.uid || null,
                        parentIdeaId: refiningIdea ? refiningIdea.id : null
                    };

                    const commentPayload = {
                        placeId: linkedPlaceId,
                        placeName: action.idea_title || placeName || "CivicSense Proposal",
                        text: action.idea_description || userText || null,
                        author: user?.displayName || "Civic User",
                        likes: 0,
                        imageStatus: finalVisionImage ? 'done' : 'failed',
                        imageBase64: finalVisionImage || null,
                        timestamp: new Date(),
                        source: 'CivicSense'
                    };

                    const placePayload = {
                        name: action.idea_title || placeName || "CivicSense Proposal",
                        address: placeName || "Civic Location",
                        latitude: location.lat || null,
                        longitude: location.lng || null,
                        lastUpdated: new Date(),
                        isCivicSense: true
                    };

                    console.log("[SidePanel] Payload generated, starting Firestore inserts...");

                    try {
                        const saveToDb = async () => {
                            await Promise.all([
                                addDoc(collection(db, 'pins'), pinPayload),
                                addDoc(collection(db, 'comments'), commentPayload),
                            ]);
                            await setDoc(doc(db, 'places', linkedPlaceId), placePayload, { merge: true });
                        };

                        // Brutally enforce a 5-second timeout so the UI never hangs if offline or blocked
                        await Promise.race([
                            saveToDb(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase save timeout exceeded')), 5000))
                        ]);
                        console.log("[SidePanel] Pins & Comments successfully saved to database.");
                    } catch (dbErr: any) {
                        console.error("[SidePanel] FIREBASE ERROR OR TIMEOUT:", dbErr);
                        setError(`Database Error: ${dbErr.message || 'Failed to save.'} Please check your Firebase Database Security Rules. They might be set to 'false' or expired.`);
                        setStatus('DRAFT');
                        return; // Halt here so the user sees the error and the panel does not close
                    }


                    // Add vision to chat history before closing or staying
                    if (tempBase64 || finalVisionImage) {
                        setMessages(prev => [...prev, {
                            role: 'model',
                            text: 'I have generated a 3D architecture vision for your proposal:',
                            imageBase64: tempBase64 || finalVisionImage
                        }]);
                    }
                    else {
                        setMessages(prev => [...prev, {
                            role: 'model',
                            text: 'Your proposal has been successfully saved to the map! (Note: 3D Vision generation is currently offline due to free-tier quotas).'
                        }]);
                    }

                    // Auto-close the panel after 3 seconds to let them see the message and refresh pins
                    setTimeout(() => {
                        onSuccess();
                    }, 3500);
                }

                if (action.map_action === 'SHOW_3D_SIMULATION') {
                    console.log("[SidePanel] 3D Simulation Triggered at", action.coordinates);
                    setSimulation(true);
                }

                console.log("[SidePanel] Finished processing action successfully.");
            }

        } catch (err: any) {
            console.error("[SidePanel] MAIN CATCH BLOCK HIT:", err);
            setError(err.message || 'An error occurred.');
        } finally {
            console.log("[SidePanel] Finally block executing, unlocking load state");
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
                                {placeName || "Civic Auditor"}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                                    {placeName === "Detecting location..." ? "Searching..." : (placeName ? "Contextual Planning" : `Status: ${status}`)}
                                </div>
                                {feasibility !== null && (
                                    <button
                                        onClick={() => setShowBreakdown(!showBreakdown)}
                                        className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-all ${showBreakdown ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40'}`}
                                    >
                                        Score: {feasibility}/100
                                    </button>
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

                    {/* Scoring Breakdown Overlay */}
                    <AnimatePresence>
                        {showBreakdown && breakdown && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-purple-900/40 border-b border-purple-500/30 overflow-hidden"
                            >
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-purple-200 uppercase tracking-widest mb-1">
                                        <span>Planning Analysis</span>
                                        <span>{feasibility}/100</span>
                                    </div>
                                    {[
                                        { label: 'Urban Fit', val: breakdown.urban_fit },
                                        { label: 'Sustainability', val: breakdown.sustainability },
                                        { label: 'Safety', val: breakdown.safety },
                                        { label: 'Accessibility', val: breakdown.accessibility },
                                        { label: 'Practicality', val: breakdown.practicality },
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-300">
                                                <span>{item.label}</span>
                                                <span className="font-mono">{item.val}/10</span>
                                            </div>
                                            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(item.val / 10) * 100}%` }}
                                                    transition={{ delay: i * 0.1, duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                        {/* AI Environment Audit - Added back */}
                        {siteAnalysis && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6"
                            >
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Activity className="w-12 h-12 text-yellow-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">AI Site Audit</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                <span className="text-yellow-500/60 font-black uppercase text-[9px] block mb-0.5">Street Vision:</span>
                                                {siteAnalysis.envAnalysis}
                                            </div>
                                            <div className="text-[11px] text-gray-300 leading-relaxed font-medium border-t border-yellow-500/10 pt-2">
                                                <span className="text-orange-400/60 font-black uppercase text-[9px] block mb-0.5">Satellite Context:</span>
                                                {siteAnalysis.satelliteAnalysis}
                                            </div>
                                        </div>
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
                    <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col gap-2">
                        {status === 'DRAFT' && messages.length > 1 && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onCancel()}
                                    disabled={loading}
                                    className="flex-1 py-2 bg-red-600/30 hover:bg-red-600/50 rounded-full text-white text-[10px] font-bold tracking-widest uppercase shadow-lg transition-all"
                                >
                                    Restart
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSend(undefined, true)}
                                    disabled={loading}
                                    className="flex-[2] py-2 bg-gradient-to-r from-purple-600/60 to-blue-600/60 hover:from-purple-500 hover:to-blue-500 rounded-full text-white text-[10px] font-bold tracking-widest uppercase shadow-lg transition-all"
                                >
                                    Submit Idea Now
                                </button>
                            </div>
                        )}
                        <form onSubmit={(e) => handleSend(e)} className="relative">
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
