import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

function VerifyEmailPage() {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const res = await fetchWithAuth(`/auth/verify/${token}`, { method: 'POST' });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Verification failed');
                }

                setStatus('success');
                setMessage(data.message);
            } catch (err) {
                setStatus('error');
                setMessage(err.message);
            }
        };

        if (token) {
            verifyToken();
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
            <div className="sm:mx-auto sm:w-full sm:max-w-md bg-[#121212] py-10 px-6 shadow-xl sm:rounded-2xl border border-white/10 text-center">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <ProgressBar className="min-h-0 py-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Verifying your email</h2>
                        <p className="text-slate-400">Please wait while we confirm your email address...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center transform transition-all animate-fade-in-up">
                        <CheckCircle2 className="h-20 w-20 text-green-400 mb-4" />
                        <h2 className="text-2xl font-bold text-blue-500 mb-2">Email Verified!</h2>
                        <p className="text-slate-400 mb-8">{message}</p>
                        <Link to="/login" className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors w-full">
                            Proceed to Login
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="h-20 w-20 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-red-400 mb-2">Verification Failed</h2>
                        <p className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg mb-8 border border-red-500/30">{message}</p>
                        <Link to="/login" className="text-blue-500 font-medium hover:text-blue-400 transition-colors">
                            Return to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerifyEmailPage;
