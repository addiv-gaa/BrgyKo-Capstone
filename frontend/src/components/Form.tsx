import React, { useState, useContext, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import usericon from "../images/usericon.png";
import { AuthContext } from "./AuthContext";
import { XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

interface FormProps {
    route: string;
    method: "login" | "register";
}

interface DialogModalState {
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning';
    confirmText?: string;
    onConfirm?: () => void;
}

function Form({ route, method }: FormProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // OTP State for Registration Flow
    const [step, setStep] = useState<'form' | 'verify' | 'forgot_email' | 'forgot_verify'>('form');
    const [userId, setUserId] = useState<number | null>(null);
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    
    // Modal Overlay State
    const [dialogModal, setDialogModal] = useState<DialogModalState | null>(null);

    // Resend Timer State
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const auth = useContext(AuthContext);

    const name = method === "login" ? "Login" : "Register";

    // NEW: Check Session Storage on mount to prevent state loss on refresh
    useEffect(() => {
        if (method === "register") {
            const savedUserId = sessionStorage.getItem("registrationUserId");
            if (savedUserId) {
                setUserId(Number(savedUserId));
                setStep("verify");
                setOtpMessage("Session restored. Please enter your code.");
            }
        }
    }, [method]);

    // Handle the countdown timer
    useEffect(() => {
        let timer: any;
        if (step === 'verify' && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (countdown === 0) {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [countdown, step]);


    const [newPassword, setNewPassword] = useState("");

    const handleForgotEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/api/auth/forgot-password/', { email });
            setUserId(res.data.user_id);
            setStep("forgot_verify");
            setOtpMessage(res.data.message);
            setCountdown(60);
            setCanResend(false);
        } catch (error: any) {
            setDialogModal({
                title: "Unable to Send OTP",
                message: error.response?.data?.error || "Error sending recovery OTP. Please try again.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/api/auth/reset-password/', { user_id: userId, otp, new_password: newPassword });
            const recoveredUsername = res.data?.username || "";
            setDialogModal({
                title: "Password Changed Successfully",
                message: "Your password has been updated. You can now log in with your new credentials.",
                type: "success",
                confirmText: "Sign In Now",
                onConfirm: () => {
                    setStep("form");
                    setPassword("");
                    setOtp("");
                    setNewPassword("");
                    setOtpMessage("");
                    if (recoveredUsername) {
                        setUsername(recoveredUsername);
                    }
                }
            });
        } catch (error: any) {
            setDialogModal({
                title: "Reset Failed",
                message: error.response?.data?.error || "Invalid OTP code or password reset failed.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        setLoading(e.target === e.currentTarget);
        e.preventDefault();

        try {
            if (method === "login") {
                const res = await api.post(route, { username, password });
                // F-029: Store tokens in sessionStorage for Bearer auth on Safari/iOS
                if (res.data?.access) {
                    sessionStorage.setItem("access_token", res.data.access);
                }
                if (res.data?.refresh) {
                    sessionStorage.setItem("refresh_token", res.data.refresh);
                }
                if (auth) auth.login(res.data.user);
                navigate("/");
            } else {
                const res = await api.post('/api/auth/register/', { username, email, password });
                
                // DEBUG: Print exactly what Django sent back to your browser console (F12)
                console.log("Django Registration Response:", res.data); 
                
                // NEW: Failsafe check for user_id or id
                const newUserId = res.data.user_id || res.data.id; 
                
                if (newUserId === undefined) {
                    throw new Error("Backend did not return a user ID. Please restart your Django server.");
                }

                setUserId(newUserId);
                
                // Use String() instead of .toString() to prevent hard crashes if it's ever null
                sessionStorage.setItem("registrationUserId", String(newUserId)); 
                
                setStep('verify');
                setOtpMessage("Verification code sent! Check your email or terminal console.");
                setCountdown(60); 
                setCanResend(false);
            }
        } catch (error: any) {
            // Explicitly handle 401 as 'Invalid Credentials' and 429 as lockout with custom center modal
            if (error.response?.status === 401) {
                setDialogModal({
                    title: "Invalid Credentials",
                    message: "The username or password you entered is incorrect. Please verify your credentials and try again.",
                    type: "error",
                    confirmText: "Try Again"
                });
            } else if (error.response?.status === 429) {
                setDialogModal({
                    title: "Account Temporarily Locked",
                    message: error.response?.data?.detail || "Account locked: 5 consecutive failed login attempts. Please try again after 15 minutes.",
                    type: "warning",
                    confirmText: "I Understand"
                });
            } else {
                setDialogModal({
                    title: "Authentication Notice",
                    message: error.response?.data?.detail || error.response?.data?.error || error.message || "An unexpected error occurred.",
                    type: "error",
                    confirmText: "OK"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/api/auth/verify-otp/', { user_id: userId, otp });
            if (res.status === 200) {
                // NEW: Clear the sessionStorage upon successful verification
                sessionStorage.removeItem("registrationUserId");
                
                setDialogModal({
                    title: "Account Verified!",
                    message: "Your account has been verified successfully. Please sign in to proceed.",
                    type: "success",
                    confirmText: "Proceed to Login",
                    onConfirm: () => {
                        navigate("/login");
                    }
                });
            }
        } catch (error: any) {
            setDialogModal({
                title: "Verification Failed",
                message: error.response?.data?.error || "Invalid OTP code. Please check and try again.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;
        
        try {
            setOtpMessage("Sending new code...");
            const res = await api.post('/api/resend-otp/', { user_id: userId });
            if (res.status === 200) {
                setOtpMessage("A new verification code has been sent!");
                setCountdown(60); 
                setCanResend(false);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to resend OTP.");
            setOtpMessage("Failed to send new code.");
        }
    };

    return (
        <div className="flex bg-gray-100 min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <img
                    alt="Barangay Logo"
                    src="/b4-logo.jpg"
                    className="mx-auto h-24 w-auto rounded-full shadow-sm"
                />
                <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
                    {step === 'verify' ? "Verify Your Email" : (step === 'forgot_email' || step === 'forgot_verify') ? "Recover Your Account" : `${name} your account`}
                </h2>
                {step !== 'forgot_verify' && otpMessage && <p className={`text-xs text-center mt-2 ${otpMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>{otpMessage}</p>}
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                {step === 'forgot_email' ? (
                    <form onSubmit={handleForgotEmailSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm/6 font-medium text-black">Enter your registered Email Address</label>
                            <div className="mt-2">
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6" />
                            </div>
                        </div>
                        <div>
                            <button type="submit" disabled={loading} className="flex w-full justify-center rounded-md bg-[#16a34a] px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50">
                                {loading ? "Sending..." : "Send OTP"}
                            </button>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4"><span onClick={() => { setStep('form'); setOtpMessage(''); }} className="font-semibold text-green-500 hover:text-green-400 cursor-pointer">Back to Login</span></p>
                    </form>
                ) : step === 'forgot_verify' ? (
                    <form onSubmit={handleForgotVerifySubmit} className="space-y-6">
                        {otpMessage && <div className="p-3 text-sm text-blue-800 bg-blue-50 rounded-lg">{otpMessage}</div>}
                        <div>
                            <label className="block text-sm/6 font-medium text-black">Enter 6-digit OTP</label>
                            <div className="mt-2">
                                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6 text-center tracking-widest font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm/6 font-medium text-black">New Password</label>
                            <div className="mt-2">
                                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6" />
                            </div>
                        </div>
                        <div>
                            <button type="submit" disabled={loading} className="flex w-full justify-center rounded-md bg-[#16a34a] px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50">
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4"><span onClick={() => { setStep('form'); setOtpMessage(''); }} className="font-semibold text-green-500 hover:text-green-400 cursor-pointer">Cancel</span></p>
                    </form>
                ) : step === 'form' ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* USERNAME FIELD */}
                        <div>
                            <label htmlFor="username" className="block text-sm/6 font-medium text-black">Username</label>
                            <div className="mt-2">
                                <input id="username" name="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6" />
                            </div>
                        </div>

                        {/* EMAIL FIELD */}
                        {method === "register" && (
                            <div>
                                <label htmlFor="email" className="block text-sm/6 font-medium text-black">Email Address</label>
                                <div className="mt-2">
                                    <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6" />
                                </div>
                            </div>
                        )}

                        {/* PASSWORD FIELD */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm/6 font-medium text-black">Password</label>
                                {method === "login" && (
                                    <div className="text-sm">
                                        <span onClick={() => { setStep("forgot_email"); setEmail(""); }} className="font-semibold text-green-400 hover:text-green-300 cursor-pointer">Forgot password?</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6" />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div>
                            <button type="submit" disabled={loading} className="flex w-full justify-center rounded-md bg-green-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Please wait..." : name}
                            </button>
                        </div>
                        
                        {/* TOGGLE LINKS */}
                        {method === "login" ? (
                            <p className="text-center text-sm text-gray-500 mt-4"><span onClick={() => navigate("/")} className="font-semibold text-green-500 hover:text-green-400 cursor-pointer">Back to Home Page</span></p>
                        ) : (
                            <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <span onClick={() => navigate("/login")} className="font-semibold text-green-500 hover:text-green-400 cursor-pointer">Sign in</span></p>
                        )}
                    </form>
                ) : (
                    /* OTP VERIFICATION STEP */
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm/6 font-medium text-black mb-1">Enter 6-Digit OTP Code</label>
                            <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="block w-full rounded-md bg-white px-3 py-2 text-center tracking-widest text-lg font-bold text-black outline-1 outline-gray-300 focus:outline-2 focus:outline-green-600" />
                        </div>
                        <div>
                            <button type="submit" disabled={loading} className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-green-500 disabled:opacity-50">
                                {loading ? "Verifying..." : "Verify OTP Code"}
                            </button>
                        </div>
                        
                        {/* RESEND OTP BUTTON */}
                        <div className="text-center mt-4">
                            <p className="text-sm text-gray-600">
                                Didn't receive the code?{" "}
                                {canResend ? (
                                    <span onClick={handleResendOtp} className="font-semibold text-green-600 hover:text-green-500 cursor-pointer">
                                        Resend OTP
                                    </span>
                                ) : (
                                    <span className="text-gray-400 cursor-not-allowed">
                                        Resend in {countdown}s
                                    </span>
                                )}
                            </p>
                        </div>
                    </form>
                )}
            </div>

            {/* Custom Center Modal Dialog Overlay */}
            {dialogModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 p-6 text-center transform transition-all animate-in zoom-in-95 duration-150">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            dialogModal.type === 'error' ? 'bg-red-100 text-red-600' :
                            dialogModal.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                            'bg-green-100 text-green-600'
                        }`}>
                            {dialogModal.type === 'error' && <XCircle className="w-6 h-6" />}
                            {dialogModal.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                            {dialogModal.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{dialogModal.title}</h3>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{dialogModal.message}</p>
                        <button
                            type="button"
                            onClick={() => {
                                const action = dialogModal.onConfirm;
                                setDialogModal(null);
                                if (action) {
                                    action();
                                }
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-sm ${
                                dialogModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                dialogModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                                'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {dialogModal.confirmText || 'OK'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Form;