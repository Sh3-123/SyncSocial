import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../utils/api';
import { Mail, Lock } from 'lucide-react';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetchWithAuth('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            const contentType = res.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');

            if (!isJson) {
                throw new Error('Server is unavailable. Please make sure the backend is running.');
            }

            const data = await res.json();

            if (!res.ok) {
                const errorMessage = data.error ? `${data.message}: ${data.error}` : (data.message || 'Login failed');
                throw new Error(errorMessage);
            }

            login(data.token, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="h-12 w-12 bg-white text-black font-bold rounded-xl flex items-center justify-center text-2xl tracking-tighter mx-auto mb-4">
                    S
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-blue-500">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Sign in to access your dashboard
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-[#121212] py-8 px-4 shadow-xl shadow-black/50 sm:rounded-2xl sm:px-10 border border-white/10">
                    {error && (
                        <div className="mb-4 bg-red-900/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/30">
                            {error}
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Email address</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 block w-full bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-500 outline-none hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-3 rounded-lg text-sm transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300">Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 block w-full bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-500 outline-none hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-3 rounded-lg text-sm transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-black bg-white hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121212] focus:ring-white transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
