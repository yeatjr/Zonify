'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Map as MapIcon, MapPin, TrendingUp, LogIn, LogOut, Image as ImageIcon, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc } from '@/lib/utils';

interface DashboardProps {
    isAnalysisMode?: boolean;
    onStartAnalysis?: (active: boolean) => void;
    onSelectPin?: (pin: any) => void;
    className?: string;
    analysisState?: 'idle' | 'running' | 'done';
    onShowDetails?: () => void;
    onShowHistory?: () => void;
    hasHistory?: boolean;
}

export default function Dashboard({ isAnalysisMode = false, onStartAnalysis, onSelectPin, className, analysisState = 'idle', onShowDetails, onShowHistory, hasHistory }: DashboardProps) {
    const [recentPins, setRecentPins] = useState<any[]>([]);
    const { user, loginWithGoogle, logout } = useAuth();

    useEffect(() => {
        // Listen to latest pins
        const q = query(collection(db, 'pins'), orderBy('createdAt', 'desc'), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecentPins(pins);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className={`absolute top-4 left-4 z-50 w-80 md:w-96 max-h-[calc(100vh-2rem)] flex flex-col gap-4 pointer-events-none overflow-y-auto custom-scrollbar pr-2 ${className || ''}`}>

            {/* Header Widget */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex justify-between items-start shrink-0"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <MapIcon className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-outfit tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Zonify</h1>
                        </div>
                    </div>
                    <p className="text-white/70 text-sm mt-3 leading-relaxed">
                        Right-click anywhere on the map to suggest a new business or renovation.
                    </p>
                </div>

                {/* Auth Controls */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <button onClick={logout} className="relative group rounded-full overflow-hidden border border-white/20 hover:border-red-400 transition-colors tooltip-trigger">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User Profile" className="w-9 h-9 object-cover" />
                                ) : (
                                    <div className="w-9 h-9 bg-purple-600 flex items-center justify-center text-xs font-bold">{user.displayName ? user.displayName.charAt(0) : 'U'}</div>
                                )}
                                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <LogOut className="w-4 h-4 text-white" />
                                </div>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={loginWithGoogle}
                            className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-2 transition-colors group"
                        >
                            <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors mb-1">
                                <LogIn className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[10px] font-bold tracking-wider text-white/70 group-hover:text-white">LOG IN</span>
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Recent Activity Widget - Moved to 2nd position */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-3 min-h-0 overflow-hidden"
            >
                <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                    <h2 className="text-xs font-black text-white/90 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        Recent Suggestions
                    </h2>
                </div>

                <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[30vh]">
                    {recentPins.length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic text-center py-6">No suggestions found. Be the first!</p>
                    ) : (
                        (() => {
                            const grouped: any[] = [];
                            recentPins.forEach(pin => {
                                const key = `${pin.lat?.toFixed(5)},${pin.lng?.toFixed(5)}_${pin.businessType}`;
                                const existing = grouped.find(g => g._groupKey === key);
                                if (existing) {
                                    existing._count = (existing._count || 1) + 1;
                                } else {
                                    grouped.push({ ...pin, _groupKey: key, _count: 1 });
                                }
                            });

                            return grouped.map((pin) => (
                                <button
                                    key={pin.id}
                                    onClick={() => {
                                        console.log("[CivicSense] Navigating to:", pin.businessType);
                                        onSelectPin?.(pin);
                                    }}
                                    className="w-full text-left bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all group/card cursor-pointer border-l-2 border-l-transparent hover:border-l-purple-500 relative z-20"
                                >
                                    <div className="flex gap-3">
                                        {pin.visionImage && (
                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-lg relative">
                                                <img
                                                    src={getImageSrc(pin.visionImage)}
                                                    alt="AI Vision"
                                                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                                                />
                                                {pin._count > 1 && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <span className="text-[9px] font-black text-white">x{pin._count}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[11px] font-black text-blue-300 truncate uppercase tracking-tight">{pin.businessType}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight italic">"{pin.review}"</p>
                                        </div>
                                    </div>
                                </button>
                            ));
                        })()
                    )}
                </div>
            </motion.div>

            {/* Analysis Widget - Moved to 3rd position */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-3 shrink-0 ${isAnalysisMode ? 'ring-1 ring-yellow-500/30 border-yellow-500/20' : ''}`}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black text-white/90 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <Activity className={`w-3.5 h-3.5 ${isAnalysisMode ? 'text-yellow-400 animate-pulse' : 'text-purple-400'}`} />
                        Strategic Opportunity Insights
                    </h2>
                    <div className="flex items-center gap-2">
                        {hasHistory && (
                            <button onClick={onShowHistory} className="text-[10px] font-bold text-white/50 hover:text-white uppercase tracking-widest bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
                                History
                            </button>
                        )}
                        {isAnalysisMode && (
                            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                                <div className="w-1 h-1 rounded-full bg-yellow-500 animate-ping" />
                                <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter">Live Scan</span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed">
                    {isAnalysisMode
                        ? "AI is currently identifying high-potential zones and analyzing Public Demand Analysis gaps."
                        : "Enable Strategic Opportunity Insights to discover optimal locations for new urban development and business ventures."}
                </p>

                <button
                    onClick={() => {
                        if (analysisState === 'done' && onShowDetails) {
                            onShowDetails();
                        } else if (analysisState === 'idle') {
                            onStartAnalysis?.(!isAnalysisMode);
                        }
                    }}
                    disabled={analysisState === 'running'}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg ${analysisState === 'running'
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 animate-pulse cursor-wait'
                        : analysisState === 'done'
                            ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                            : isAnalysisMode
                                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        }`}
                >
                    {analysisState === 'running'
                        ? 'Running Analysis...'
                        : analysisState === 'done'
                            ? 'Show details'
                            : isAnalysisMode
                                ? 'Deactivate Analysis'
                                : 'Start to analysis'}
                </button>
            </motion.div>

        </div>
    );
}
