'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, MapPin, TrendingUp, AlertTriangle, ChevronRight, Loader2, LogIn, LogOut, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getImageSrc } from '@/lib/utils';

interface DashboardProps {
    onSelectPin?: (pin: any) => void;
    className?: string;
}

export default function Dashboard({ onSelectPin, className }: DashboardProps) {
    const [recentPins, setRecentPins] = useState<any[]>([]);
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);
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

    const generateReport = async () => {
        setLoadingReport(true);
        try {
            // For demo, we just use default lat/lng, in a real app this would follow map center
            const res = await fetch('/api/report?lat=40.7128&lng=-74.0060');
            const data = await res.json();
            setReportData(data.report);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingReport(false);
        }
    };

    return (
        <div className={`absolute top-4 left-4 z-[110] w-72 md:w-80 flex flex-col gap-3 pointer-events-auto ${className || ''}`}>

            {/* Header Widget - RESTORED TO ORIGINAL STYLE */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex justify-between items-start"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Activity className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-outfit tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">CivicSense</h1>
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Entrepreneur Dashboard</p>
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

            {/* Recent Activity Widget - NOW IN MIDDLE */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden max-h-[45vh]"
            >
                <div className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <h2 className="text-xs font-black text-white/90 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        Recent Suggestions
                    </h2>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>

                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
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
                                                <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 ml-2 ${pin.saturationIndex > 5 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {pin.saturationIndex?.toFixed(1) || 'N/A'}
                                                </div>
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

            {/* Needs Report Widget */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        Needs Analysis
                    </h2>
                    <button
                        onClick={generateReport}
                        disabled={loadingReport}
                        className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {loadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate'}
                        {!loadingReport && <ChevronRight className="w-3 h-3" />}
                    </button>
                </div>

                {reportData ? (
                    <div className="space-y-3">
                        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold block mb-1">Top Recommendation</span>
                            <p className="text-sm text-white/90 font-medium leading-snug">{reportData.topRecommendation}</p>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold block mb-1">Community Sentiment</span>
                            <p className="text-xs text-gray-300">{reportData.communitySentiment}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {reportData.marketGaps?.map((gap: string, i: number) => (
                                <span key={i} className="text-[10px] bg-black/50 border border-white/10 text-gray-300 px-2 py-1 rounded-md">
                                    {gap}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
                        <MapPin className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-400">Click generate to analyze local pins with Gemini API</p>
                    </div>
                )}
            </motion.div>

        </div>
    );
}
