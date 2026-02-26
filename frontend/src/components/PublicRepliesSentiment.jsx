import React from 'react';
import { MessagesSquare, Sparkles } from 'lucide-react';

const PublicRepliesSentiment = ({ repliesSentimentData, loading }) => {
    if (loading) return null; // We can show a skeleton if needed, but null is fine for now
    if (!repliesSentimentData || repliesSentimentData.length === 0) return null;

    // Aggregate Data
    const total = repliesSentimentData.length;
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const emotionCounts = {};

    repliesSentimentData.forEach(item => {
        if (!item) return;

        // Count sentiment
        if (item.sentiment === 'positive') positive++;
        else if (item.sentiment === 'negative') negative++;
        else neutral++;

        // Count emotions
        if (item.emotion) {
            emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
        }
    });

    const posPct = Math.round((positive / total) * 100) || 0;
    const negPct = Math.round((negative / total) * 100) || 0;
    const neuPct = Math.round((neutral / total) * 100) || 0;

    // Sort emotions by count
    const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <MessagesSquare size={18} className="text-blue-400" />
                    <h3 className="text-base font-bold text-white">Aggregated Audience Sentiment</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sentiment Distribution */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Overall Tone</p>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-emerald-400 font-medium">Positive</span>
                                    <span className="text-slate-400">{posPct}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${posPct}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400 font-medium">Neutral</span>
                                    <span className="text-slate-400">{neuPct}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="h-2 rounded-full bg-slate-400" style={{ width: `${neuPct}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-rose-400 font-medium">Negative</span>
                                    <span className="text-slate-400">{negPct}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="h-2 rounded-full bg-rose-400" style={{ width: `${negPct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Emotions */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Emotions</p>
                        <div className="grid grid-cols-2 gap-3">
                            {topEmotions.map(([emotion, count], idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                    <span className="text-lg font-black text-white">{Math.round((count / total) * 100)}%</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">{emotion}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicRepliesSentiment;
