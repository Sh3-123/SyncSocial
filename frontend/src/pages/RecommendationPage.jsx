import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, Link as LinkIcon, TrendingUp, Presentation, Hash, MessageSquareText, ChevronDown, ChevronUp, Image as ImageIcon, ClipboardList, Youtube, AtSign, Copy, Check, Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import ProgressBar from '../components/ProgressBar';
import html2pdf from 'html2pdf.js';

const RecommendationPage = () => {
    const [topic, setTopic] = useState('');
    const [useSerpApi, setUseSerpApi] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [expandedHook, setExpandedHook] = useState(null);
    const [loadingScripts, setLoadingScripts] = useState({});
    const [copiedText, setCopiedText] = useState(null);
    const [isDownloading, setIsDownloading] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }

        if (topic.length > 50) {
            setError('Topic must be 50 characters or less.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        setExpandedHook(null);
        setCopiedText(null);
        setLoadingScripts({});

        try {
            const res = await fetchWithAuth('/recommendation/trend-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, useSerpApi })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.details || 'Failed to fetch trend recommendations');
            }

            setResult(data);
        } catch (err) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchScript = async (idx, hookTitle) => {
        setLoadingScripts(prev => ({ ...prev, [idx]: true }));
        try {
            const res = await fetchWithAuth('/recommendation/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, hookTitle })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error('Failed to generate script');
            }

            setResult(prev => {
                const updatedHooks = [...prev.hooks];
                updatedHooks[idx] = { ...updatedHooks[idx], ...data };
                return { ...prev, hooks: updatedHooks };
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoadingScripts(prev => ({ ...prev, [idx]: false }));
        }
    };

    const toggleHook = (idx) => {
        if (expandedHook === idx) {
            setExpandedHook(null);
        } else {
            setExpandedHook(idx);

            // Fetch script if it hasn't been fetched yet
            if (result && result.hooks[idx] && !result.hooks[idx].youtube_script) {
                handleFetchScript(idx, result.hooks[idx].title);
            }
        }
    };

    const copyHookContent = (hook, idx) => {
        const content = `TITLE: ${hook.title}\n\nYOUTUBE SCRIPT:\n${hook.youtube_script || hook.script}\n\nTHREADS POST:\n${hook.threads_post || hook.script}\n\n${hook.steps && hook.steps.length > 0 ? `CREATION STEPS:\n${hook.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` : ''}${hook.image_recommendations ? `VISUAL GUIDANCE:\n${hook.image_recommendations}\n\n` : ''}${hook.hashtags && hook.hashtags.length > 0 ? `HASHTAGS:\n${hook.hashtags.join(' ')}` : ''}`.trim();
        navigator.clipboard.writeText(content);
        setCopiedText(`hook-${idx}`);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const downloadHookPDF = async (idx, hookTitle) => {
        const element = document.getElementById(`hook-content-${idx}`);
        if (!element) return;
        setIsDownloading(idx);

        const opt = {
            margin: 15,
            filename: `Hook_${idx + 1}_${hookTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.pdf`,
            image: { type: 'png' },
            html2canvas: { scale: 3, useCORS: true, backgroundColor: '#121212', windowWidth: 800 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('Failed to generate PDF', err);
        } finally {
            setIsDownloading(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    AI Trend Intelligence
                </h1>
                <p className="mt-2 text-slate-400">
                    Enter a core topic below to generate real-time content ideas based on live search trends.
                </p>
            </div>

            {/* Input Section */}
            <div className="bg-[#121212] border border-white/10 rounded-xl p-6 mb-8 shadow-sm">
                <form onSubmit={handleGenerate}>
                    <div className="mb-4">
                        <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">
                            What is your core topic?
                        </label>
                        <input
                            type="text"
                            id="topic"
                            maxLength="50"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="e.g., fitness, AI, remote work"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={loading}
                        />
                        <div className="flex items-center justify-between mt-3">
                            <button
                                type="button"
                                onClick={() => setUseSerpApi(!useSerpApi)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {useSerpApi ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-slate-500" />}
                                Use Real-Time Trends (SerpAPI)
                            </button>
                            <p className="text-xs text-slate-500">{topic.length}/50 characters</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !topic.trim()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/20 hover:shadow-blue-900/40"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Analyzing Trends...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" />
                                    Generate Ideas
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {loading && (
                    <div className="mt-6 flex flex-col items-center justify-center py-4 border-t border-white/10">
                        <ProgressBar className="min-h-0 py-2 w-full max-w-md" />
                        <p className="text-sm text-slate-400 mt-4 animate-pulse">Researching real-time search trends...</p>
                    </div>
                )}
            </div>

            {/* Results Section */}
            {result && !loading && (
                <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="border-b border-white/10 bg-[#1a1a1a] p-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Trend Intelligence for "{result.topic}"
                        </h2>
                    </div>

                    <div className="p-6 space-y-8">

                        {/* Trending Topics & Explanation */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                    Top Search Trends
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.trending_topics?.map((t, idx) => (
                                        <span key={idx} className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full text-sm font-medium">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Presentation className="h-4 w-4 text-purple-400" />
                                    Why This is Trending
                                </h3>
                                <p className="text-slate-300 leading-relaxed text-sm">{result.trend_explanation}</p>
                            </div>
                        </div>

                        {/* Story Idea */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                <MessageSquareText className="h-4 w-4 text-blue-400" />
                                Suggested Story Idea
                            </h3>
                            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 relative group">
                                <p className="text-white whitespace-pre-wrap leading-relaxed text-lg font-medium">
                                    {result.story_idea}
                                </p>
                            </div>
                        </div>

                        {/* Detailed Hooks Accordion */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                <Presentation className="h-4 w-4 text-orange-400" />
                                Engaging Hooks & Generated Scripts
                            </h3>

                            <div className="space-y-4">
                                {result.hooks?.map((hook, idx) => (
                                    <div key={idx} className="bg-[#0a0a0a] border border-white/5 rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:border-white/20">
                                        <button
                                            onClick={() => toggleHook(idx)}
                                            className="w-full text-left p-4 flex items-center justify-between focus:outline-none"
                                        >
                                            <div className="flex items-center gap-3 pr-4">
                                                <span className="text-orange-500 font-bold bg-orange-500/10 h-7 w-7 rounded-full flex items-center justify-center text-sm">{idx + 1}</span>
                                                <span className="text-white font-medium">{hook.title}</span>
                                            </div>
                                            {expandedHook === idx ? (
                                                <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                            )}
                                        </button>

                                        {expandedHook === idx && (
                                            <div id={`hook-content-${idx}`} className="p-5 pt-0 border-t border-white/5 bg-[#121212]/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {loadingScripts[idx] ? (
                                                    <div className="flex flex-col items-center justify-center py-10">
                                                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                                                        <p className="text-slate-400 text-sm animate-pulse">Generating your custom, unique script package...</p>
                                                    </div>
                                                ) : hook.youtube_script ? (
                                                    <div className="space-y-6 mt-4 relative">

                                                        {/* Action Bar (Not visible in PDF export) */}
                                                        <div className="flex items-center justify-end gap-3 pb-4 border-b border-white/10" data-html2canvas-ignore>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); copyHookContent(hook, idx); }}
                                                                className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded border border-white/10"
                                                            >
                                                                {copiedText === `hook-${idx}` ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                                                {copiedText === `hook-${idx}` ? 'Copied' : 'Copy All'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); downloadHookPDF(idx, hook.title); }}
                                                                disabled={isDownloading === idx}
                                                                className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded text-sm font-medium transition-colors focus:ring-0 disabled:opacity-50"
                                                            >
                                                                {isDownloading === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                                {isDownloading === idx ? 'Downloading...' : 'Download PDF'}
                                                            </button>
                                                        </div>

                                                        {/* YouTube Script */}
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                                <Youtube className="h-4 w-4 text-red-500" /> YouTube Script
                                                            </h4>
                                                            <div className="bg-black/30 p-4 rounded-lg text-slate-300 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-red-500/50">
                                                                {hook.youtube_script || hook.script}
                                                            </div>
                                                        </div>

                                                        {/* Threads Post */}
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                                <AtSign className="h-4 w-4 text-blue-400" /> Threads Post
                                                            </h4>
                                                            <div className="bg-black/30 p-4 rounded-lg text-slate-300 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-blue-400/50">
                                                                {hook.threads_post || hook.script}
                                                            </div>
                                                        </div>

                                                        {/* Creation Steps */}
                                                        {hook.steps && hook.steps.length > 0 && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                                    <ClipboardList className="h-3 w-3" /> Creation Steps
                                                                </h4>
                                                                <ol className="list-decimal list-outside ml-4 text-slate-300 text-sm space-y-1.5 marker:text-blue-500">
                                                                    {hook.steps.map((step, sIdx) => (
                                                                        <li key={sIdx} className="pl-1">{step}</li>
                                                                    ))}
                                                                </ol>
                                                            </div>
                                                        )}

                                                        {/* Image Recommendations */}
                                                        {hook.image_recommendations && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                                    <ImageIcon className="h-3 w-3" /> Visual Guidance
                                                                </h4>
                                                                <p className="text-slate-400 text-sm">{hook.image_recommendations}</p>
                                                            </div>
                                                        )}

                                                        {/* Hashtags */}
                                                        {hook.hashtags && hook.hashtags.length > 0 && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                                                    <Hash className="h-3 w-3" /> Custom Hashtags
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {hook.hashtags.map((tag, tIdx) => (
                                                                        <span key={tIdx} className="bg-white/5 text-slate-400 text-xs px-2.5 py-1 rounded-full border border-white/10">
                                                                            {tag.startsWith('#') ? tag : '#' + tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
                                                        <p>Something went wrong. Script could not be generated.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Proof Links */}
                        {result.proof_links && result.proof_links.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-yellow-500" />
                                    Live Search Proof
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {result.proof_links.map((link, idx) => (
                                        <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#0a0a0a] border border-white/10 hover:border-yellow-500/30 p-4 rounded-lg flex flex-col gap-2 transition-all group"
                                        >
                                            <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-yellow-400 transition-colors">
                                                {link.title}
                                            </p>
                                            <p className="text-slate-500 text-xs truncate">
                                                {link.url}
                                            </p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-right">
                            <p className="text-xs text-slate-600">Generated at: {new Date(result.generated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendationPage;
