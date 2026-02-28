'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Map from '@/components/Map';
import Dashboard from '@/components/Dashboard';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import jsPDF from 'jspdf';

const renderFormattedText = (text: string | null | undefined) => {
  if (!text) return <p>N/A</p>;

  return text.split('\n').map((line, lineIndex) => {
    if (!line.trim()) return null;

    // Split by ** to find bold parts
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <div key={lineIndex} className="mb-2 last:mb-0">
        {parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIndex} className="text-white font-bold">{part.slice(2, -2)}</strong>;
          }
          return <span key={partIndex}>{part}</span>;
        })}
      </div>
    );
  });
};

const renderSubMetrics = (subMetrics: any[] | undefined | null) => {
  if (!subMetrics || !Array.isArray(subMetrics) || subMetrics.length === 0) return null;
  return (
    <div className="mb-5 bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
      {subMetrics.map((item: any, idx: number) => (
        <div key={idx} className="flex flex-col gap-1">
          <div className="flex justify-between items-end">
            <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase">{item.name}</span>
            <span className="text-[9px] font-black text-white/90">{item.score}/100</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
              transition={{ duration: 1.2, delay: idx * 0.1, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${item.score > 75 ? 'from-green-500 to-green-300' : item.score > 50 ? 'from-yellow-500 to-yellow-300' : 'from-red-500 to-red-300'}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);

  const [analysisState, setAnalysisState] = useState<'idle' | 'running' | 'done'>('idle');
  const [analysisLocation, setAnalysisLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisPlaceName, setAnalysisPlaceName] = useState<string>('Location Deep Analysis: 10km Radius');
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleDownloadPDF = async () => {
    if (!analysisData) return;
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.setFillColor(15, 15, 15);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          yPos = 20;
        }
      };

      const sanitizeText = (str: string) => {
        return str
          .replace(/[\u2018\u2019]/g, "'") // smart single quotes
          .replace(/[\u201C\u201D]/g, '"') // smart double quotes
          .replace(/[\u2013\u2014]/g, "-") // em/en dashes
          .replace(/[^\x20-\x7E\n]/g, ""); // strip any remaining non-standard ASCII
      };

      // Set initial background
      pdf.setFillColor(15, 15, 15);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Title
      const safeTitle = sanitizeText(analysisPlaceName);
      pdf.setTextColor(250, 204, 21); // yellow-400
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("ADAPTIVE RESILIENCE PROFILE", margin, yPos);
      yPos += 8;

      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(safeTitle.toUpperCase(), margin, yPos);
      yPos += 15;

      // Innovation Capability Score & Pie Chart Section
      checkPageBreak(80);

      // Box for scores
      pdf.setFillColor(25, 25, 25);
      pdf.roundedRect(margin, yPos, contentWidth, 75, 5, 5, 'F');

      // Overall Metric
      pdf.setTextColor(250, 204, 21);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("ADAPTIVE RESILIENCE SCORE", margin + 10, yPos + 15);

      pdf.setFontSize(40);
      pdf.text(`${analysisData.overallScore || 0}`, margin + 10, yPos + 35);
      pdf.setFontSize(12);
      pdf.text("/100", margin + 40, yPos + 35);

      // Pie Chart Approximation
      const chartCenterX = pageWidth - margin - 40;
      const chartCenterY = yPos + 35;
      const radius = 25;

      const metrics = [
        { label: 'Planning', score: analysisData.planningFeasibility?.adaptiveResilienceScore || 0, color: [192, 132, 252] },
        { label: 'Site Audit', score: analysisData.aiSiteAudit?.adaptiveResilienceScore || 0, color: [96, 165, 250] },
        { label: 'Facilities', score: analysisData.suitableFacilities?.adaptiveResilienceScore || 0, color: [251, 146, 60] }
      ];

      const totalScore = metrics.reduce((acc, m) => acc + m.score, 0);
      let currentAngle = 0;

      metrics.forEach((m, idx) => {
        const sliceAngle = (m.score / (totalScore || 1)) * 2 * Math.PI;
        pdf.setFillColor(m.color[0], m.color[1], m.color[2]);

        // Simpler segment drawing using triangles for compatibility
        const segments = 20;
        for (let i = 0; i < segments; i++) {
          const ang1 = currentAngle + (i / segments) * sliceAngle;
          const ang2 = currentAngle + ((i + 1) / segments) * sliceAngle;

          pdf.triangle(
            chartCenterX, chartCenterY,
            chartCenterX + Math.cos(ang1) * radius, chartCenterY + Math.sin(ang1) * radius,
            chartCenterX + Math.cos(ang2) * radius, chartCenterY + Math.sin(ang2) * radius,
            'F'
          );
        }

        // Legend
        const legendX = margin + 10;
        const legendY = yPos + 45 + (idx * 6);
        pdf.setFillColor(m.color[0], m.color[1], m.color[2]);
        pdf.rect(legendX, legendY - 3, 3, 3, 'F');
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(8);
        pdf.text(`${m.label}: ${m.score}%`, legendX + 5, legendY);

        currentAngle += sliceAngle;
      });

      yPos += 85;

      // Executive Summaries
      checkPageBreak(50);

      // Moving Priority Intervention summary to top if exists (under header)
      if (analysisData.userSuggestion) {
        pdf.setFillColor(40, 40, 20); // Dark yellow-ish
        pdf.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');
        pdf.setTextColor(250, 204, 21); // yellow-400
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("PRIORITY INTERVENTION: COMMUNITY VISION", margin + 5, yPos + 8);
        pdf.setFontSize(8);
        pdf.setTextColor(200, 200, 200);
        const lines = pdf.splitTextToSize(sanitizeText(analysisData.userSuggestion.summary || ""), contentWidth - 10);
        pdf.text(lines, margin + 5, yPos + 14);
        yPos += 35;
      }

      pdf.setTextColor(250, 204, 21);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("EXECUTIVE SUMMARIES", margin, yPos);
      yPos += 10;

      [
        { title: "Planning Feasibility", text: analysisData.planningFeasibility?.summary, color: [192, 132, 252] },
        { title: "AI Site Audit", text: analysisData.aiSiteAudit?.summary, color: [96, 165, 250] },
        { title: "Suitable Facilities", text: analysisData.suitableFacilities?.summary, color: [251, 146, 60] }
      ].forEach(sum => {
        if (!sum.text) return;
        pdf.setTextColor(sum.color[0], sum.color[1], sum.color[2]);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(sum.title.toUpperCase(), margin, yPos);
        yPos += 5;

        pdf.setTextColor(220, 220, 220);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(sanitizeText(sum.text), contentWidth);
        pdf.text(lines, margin, yPos);
        yPos += (lines.length * 5) + 5;
      });

      yPos += 5;

      const drawProgressBar = (label: string, score: number) => {
        checkPageBreak(12);
        pdf.setTextColor(156, 163, 175); // gray-400
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(label.toUpperCase(), margin, yPos);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${score}/100`, pageWidth - margin, yPos, { align: 'right' });

        yPos += 3;
        // Background track
        pdf.setFillColor(40, 40, 40);
        pdf.roundedRect(margin, yPos, contentWidth, 2, 0.5, 0.5, 'F');

        // Fill
        if (score > 75) pdf.setFillColor(34, 197, 94); // Green
        else if (score > 50) pdf.setFillColor(234, 179, 8); // Yellow
        else pdf.setFillColor(239, 68, 68); // Red

        const fillWidth = (contentWidth * Math.max(0, Math.min(100, score))) / 100;
        if (fillWidth > 0) {
          pdf.roundedRect(margin, yPos, fillWidth, 2, 0.5, 0.5, 'F');
        }
        yPos += 8;
      };

      // Global Scores list removed as requested, we now use the summaries and detailed sections below.

      const drawSection = (title: string, sectionData: any, titleColor: number[]) => {
        if (!sectionData) return;

        checkPageBreak(25);
        yPos += 5;
        pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(title.toUpperCase(), margin, yPos);
        yPos += 8;

        if (sectionData.subMetrics && Array.isArray(sectionData.subMetrics)) {
          sectionData.subMetrics.forEach((item: any) => {
            drawProgressBar(item.name, item.score);
          });
          yPos += 4;
        }

        const narrative = sectionData.narrative || sectionData;
        if (typeof narrative === 'string') {
          pdf.setTextColor(220, 220, 220);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");

          let cleanText = narrative.replace(/\*\*/g, '');
          cleanText = sanitizeText(cleanText);

          const lines = cleanText.split('\n');

          lines.forEach((line: string) => {
            if (!line.trim()) {
              yPos += 3;
              return;
            }
            const wrappedLines = pdf.splitTextToSize(line.trim(), contentWidth);
            for (let i = 0; i < wrappedLines.length; i++) {
              checkPageBreak(6);
              pdf.text(wrappedLines[i], margin, yPos);
              yPos += 5;
            }
          });
        }
      };

      drawSection("Planning Feasibility", analysisData.planningFeasibility, [192, 132, 252]);
      drawSection("AI Site Audit", analysisData.aiSiteAudit, [96, 165, 250]);
      drawSection("Suitable Facilities", analysisData.suitableFacilities, [251, 146, 60]);
      if (analysisData.userSuggestion) {
        drawSection("User Suggestion", analysisData.userSuggestion, [74, 222, 128]);
      }

      // Force direct download
      pdf.save(`${analysisPlaceName.replace(/\s+/g, '_')}_Analysis_Report.pdf`);

      // SAVE TO SYSTEM
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const saveRes = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, filename: analysisPlaceName })
      });
      const saveData = await saveRes.json();
      if (saveData.success && currentHistoryId) {
        await updateDoc(doc(db, 'analysisHistory', currentHistoryId), {
          reportUrl: saveData.url
        });
        console.log("Report saved to system:", saveData.url);
      }
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  const handleRunAnalysis = async (location: { lat: number, lng: number }, nearbyPins: any[] = [], placeName: string = "New Opportunity") => {
    setAnalysisState('running');
    setAnalysisLocation(location);
    setAnalysisData(null);
    setAnalysisPlaceName(placeName);
    setShowAnalysisModal(false);

    try {
      const res = await fetch('/api/location-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...location, nearbyPins })
      });
      const data = await res.json();
      setAnalysisData(data);

      const historyRecord = {
        data: data,
        placeName,
        date: new Date().toLocaleString(),
        lat: location.lat,
        lng: location.lng
      };
      setAnalysisHistory(prev => [historyRecord, ...prev]);

      try {
        const docRef = await addDoc(collection(db, 'analysisHistory'), {
          ...historyRecord,
          userId: user?.uid || 'anonymous',
          createdAt: new Date()
        });
        setCurrentHistoryId(docRef.id);
      } catch (dbErr) { console.error("Could not save to history:", dbErr) }

      setAnalysisState('done');
      setAnalysisLocation(null);
    } catch (e) {
      console.error(e);
      setAnalysisState('idle');
      setAnalysisLocation(null);
    }
  };

  const loadHistoryItem = (historyItem: any) => {
    setAnalysisData(historyItem.data);
    setAnalysisPlaceName(historyItem.placeName);
    setShowHistoryModal(false);
    setShowAnalysisModal(true);
    setAnalysisState('done');
  };

  return (
    <main className="w-full h-screen bg-black overflow-hidden relative font-sans text-white">
      <Map
        isAnalysisMode={isAnalysisMode && analysisState !== 'done'}
        isAnalyzing={analysisState === 'running'}
        analysisLocation={analysisLocation}
        onSelectPin={selectedPin}
        onRunAnalysis={handleRunAnalysis}
        onGalleryClose={() => setSelectedPin(null)}
      />

      <Dashboard
        isAnalysisMode={isAnalysisMode}
        onStartAnalysis={setIsAnalysisMode}
        onSelectPin={setSelectedPin}
        analysisState={analysisState}
        onShowDetails={() => {
          setShowAnalysisModal(true);
          setAnalysisState('idle');
        }}
        hasHistory={analysisHistory.length > 0}
        onShowHistory={() => setShowHistoryModal(true)}
      />

      {/* Analysis Results Modal */}
      {showAnalysisModal && analysisData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-zinc-900/90 border border-yellow-500/30 shadow-[0_0_80px_rgba(234,179,8,0.15)] w-full max-w-2xl rounded-[2.5rem] p-8 relative flex flex-col max-h-[90vh] overflow-hidden backdrop-blur-2xl"
          >
            <button
              onClick={() => setShowAnalysisModal(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-black text-yellow-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                {analysisPlaceName} Deep Analysis
              </h2>
              <button
                onClick={handleDownloadPDF}
                className="text-[10px] font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 mr-10"
              >
                Download PDF
              </button>
            </div>

            <div id="analysis-report-content" className="overflow-y-auto custom-scrollbar pr-2 space-y-6 flex-1 text-sm bg-black/80 p-2">

              {/* Innovation Capability Header */}
              <div className="bg-gradient-to-br from-yellow-500/15 to-yellow-600/5 border border-yellow-500/30 rounded-3xl p-7 mb-6 flex items-center justify-between shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.3em] mb-2">Project Feasibility Index</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-tighter">{analysisData.overallScore || 0}</span>
                    <span className="text-lg font-bold text-yellow-500/40">/100</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Adaptive Resilience Score</span>
                  <div className="text-[11px] font-bold text-white/20 italic">Zonify Analysis v2.5</div>
                </div>
              </div>

              {/* Simplified Priority Intervention Box Card - NOW YELLOW and Reordered */}
              {analysisData.userSuggestion && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        Priority Intervention Identified
                      </span>
                      <h3 className="text-lg font-black text-yellow-500 uppercase tracking-tight">Community Sentiment Profile</h3>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Public Demand Analysis</span>
                      <div className="text-xs font-bold text-white/20">Verified Community Consensus</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[12px] text-white/90 leading-relaxed italic border-l-2 border-yellow-500/30 pl-4 py-1 bg-yellow-500/5 rounded-r-lg">
                      "{analysisData.userSuggestion.summary}"
                    </p>

                    <div className="text-[11px] text-gray-300 leading-relaxed opacity-80">
                      {renderFormattedText(analysisData.userSuggestion.narrative || "")}
                    </div>
                  </div>
                </div>
              )}

              {/* Executive Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { title: "Planning", text: analysisData.planningFeasibility?.summary, color: "text-purple-400", bg: "bg-purple-500/10" },
                  { title: "Audit", text: analysisData.aiSiteAudit?.summary, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { title: "Facilities", text: analysisData.suitableFacilities?.summary, color: "text-orange-400", bg: "bg-orange-500/10" }
                ].map((s, idx) => (
                  <div key={idx} className={`${s.bg} border border-white/5 rounded-xl p-3 flex flex-col gap-1.5`}>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${s.color}`}>{s.title}</span>
                    <p className="text-[11px] text-white/60 leading-tight italic line-clamp-3">"{s.text || 'No summary available.'}"</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 border-l-4 border-l-purple-500">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-purple-400 font-bold uppercase tracking-wider text-xs">Planning Feasibility</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{analysisData.planningFeasibility?.adaptiveResilienceScore || 0}/100</span>
                </div>
                {renderSubMetrics(analysisData.planningFeasibility?.subMetrics)}
                <div className="text-gray-300 leading-relaxed">
                  {typeof analysisData.planningFeasibility === 'object' && analysisData.planningFeasibility !== null ? (
                    <>{renderFormattedText(analysisData.planningFeasibility.narrative || analysisData.planningFeasibility)}</>
                  ) : (
                    <>{renderFormattedText(analysisData.planningFeasibility)}</>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 border-l-4 border-l-blue-500">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs">AI Site Audit</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{analysisData.aiSiteAudit?.adaptiveResilienceScore || 0}/100</span>
                </div>
                {renderSubMetrics(analysisData.aiSiteAudit?.subMetrics)}
                <div className="text-gray-300 leading-relaxed">
                  {typeof analysisData.aiSiteAudit === 'object' && analysisData.aiSiteAudit !== null ? (
                    <>{renderFormattedText(analysisData.aiSiteAudit.narrative || analysisData.aiSiteAudit)}</>
                  ) : (
                    <>{renderFormattedText(analysisData.aiSiteAudit)}</>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 border-l-4 border-l-orange-500">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-orange-400 font-bold uppercase tracking-wider text-xs">Suitable Facilities</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">{analysisData.suitableFacilities?.adaptiveResilienceScore || 0}/100</span>
                </div>
                {renderSubMetrics(analysisData.suitableFacilities?.subMetrics)}
                <div className="text-gray-300 leading-relaxed">
                  {typeof analysisData.suitableFacilities === 'object' && analysisData.suitableFacilities !== null ? (
                    <>{renderFormattedText(analysisData.suitableFacilities.narrative || analysisData.suitableFacilities)}</>
                  ) : (
                    <>{renderFormattedText(analysisData.suitableFacilities)}</>
                  )}
                </div>
              </div>


            </div>
          </motion.div>
        </motion.div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black/80 border border-white/20 shadow-2xl w-full max-w-lg rounded-3xl p-6 relative flex flex-col max-h-[80vh]">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
              Analysis History
            </h2>
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {analysisHistory.length === 0 ? (
                <p className="text-white/50 text-sm">No history available yet.</p>
              ) : (
                analysisHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all group"
                  >
                    <div className="font-bold text-white mb-1 truncate group-hover:text-yellow-400 transition-colors uppercase tracking-wider">{item.placeName}</div>
                    <div className="text-[10px] text-white/50">{item.date}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 pointer-events-none text-xs text-white/30 font-medium">
        Zonify Concept &copy; 2026
      </div>
    </main>
  );
}
