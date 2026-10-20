import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api';
import { KeyRound, ShieldAlert, Eye, EyeOff, CheckCircle2, LogOut } from 'lucide-react';

export default function MustChangePasswordModal() {
    const auth = useContext(AuthContext);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!auth?.user?.must_change_password) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match. Please re-enter.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/api/auth/change-temporary-password/', {
                new_password: newPassword,
                confirm_password: confirmPassword,
            });

            if (res.status === 200) {
                setIsSuccess(true);
                setTimeout(() => {
                    auth.setMustChangePassword(false);
                }, 1200);
            } else {
                setErrorMsg(res.data?.error || 'Failed to change password.');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Unable to update password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        if (auth) {
            await auth.logout();
        }
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-white text-center relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <KeyRound className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Security Action Required</h2>
                    <p className="text-xs text-blue-100 mt-1 max-w-xs mx-auto">
                        Your account was provisioned with a temporary password. Please set your permanent password to continue.
                    </p>
                </div>

                {/* Form Container */}
                <div className="p-6 md:p-8">
                    {isSuccess ? (
                        <div className="py-6 text-center space-y-3">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Password Changed Successfully!</h3>
                            <p className="text-xs text-gray-500">Redirecting to your dashboard...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                        className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? "Updating Password..." : "Save Password & Proceed"}
                                </button>
                            </div>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Log out and update later</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
