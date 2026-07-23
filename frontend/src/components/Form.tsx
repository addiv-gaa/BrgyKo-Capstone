import React, { useState, useContext, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import usericon from "../images/usericon.png";
import { AuthContext } from "./AuthContext";

interface FormProps {
    route: string;
    method: "login" | "register";
}

function Form({ route, method }: FormProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // OTP State for Registration Flow
    const [step, setStep] = useState<'form' | 'verify'>('form');
    const [userId, setUserId] = useState<number | null>(null);
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    
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

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        setLoading(e.target === e.currentTarget);
        e.preventDefault();

        try {
            if (method === "login") {
                const res = await api.post(route, { username, password });
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                if (auth) auth.login(res.data.access);
                navigate("/");
            } else {
                const res = await api.post('/api/register/', { username, email, password });
                
                // NEW: Save the userId to sessionStorage
                const newUserId = res.data.user_id;
                setUserId(newUserId);
                sessionStorage.setItem("registrationUserId", newUserId.toString());
                
                setStep('verify');
                setOtpMessage("Verification code sent! Check your email or terminal console.");
                setCountdown(60); 
                setCanResend(false);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/api/verify-otp/', { user_id: userId, otp });
            if (res.status === 200) {
                // NEW: Clear the sessionStorage upon successful verification
                sessionStorage.removeItem("registrationUserId");
                
                alert("Account verified successfully! Please log in.");
                navigate("/login");
            }
        } catch (error: any) {
            alert(error.response?.data?.error || "Invalid OTP code.");
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
                    alt="IT Helpdesk User Icon"
                    src={usericon}
                    className="mx-auto h-16 w-auto"
                />
                <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
                    {step === 'verify' ? "Verify Your Email" : `${name} your account`}
                </h2>
                {otpMessage && <p className={`text-xs text-center mt-2 ${otpMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>{otpMessage}</p>}
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                {step === 'form' ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* USERNAME FIELD */}
                        <div>
                            <label htmlFor="username" className="block text-sm/6 font-medium text-black">Username</label>
                            <div className="mt-2">
                                <input id="username" name="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6" />
                            </div>
                        </div>

                        {/* EMAIL FIELD */}
                        {method === "register" && (
                            <div>
                                <label htmlFor="email" className="block text-sm/6 font-medium text-black">Email Address</label>
                                <div className="mt-2">
                                    <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6" />
                                </div>
                            </div>
                        )}

                        {/* PASSWORD FIELD */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm/6 font-medium text-black">Password</label>
                                {method === "login" && (
                                    <div className="text-sm">
                                        <a href="#" className="font-semibold text-blue-400 hover:text-blue-300">Forgot password?</a>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6" />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div>
                            <button type="submit" disabled={loading} className="flex w-full justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Please wait..." : name}
                            </button>
                        </div>
                        
                        {/* TOGGLE LINKS */}
                        {method === "login" ? (
                            <p className="text-center text-sm text-gray-500 mt-4">Not a member? <span onClick={() => navigate("/register")} className="font-semibold text-blue-500 hover:text-blue-400 cursor-pointer">Register now</span></p>
                        ) : (
                            <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <span onClick={() => navigate("/login")} className="font-semibold text-blue-500 hover:text-blue-400 cursor-pointer">Sign in</span></p>
                        )}
                    </form>
                ) : (
                    /* OTP VERIFICATION STEP */
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm/6 font-medium text-black mb-1">Enter 6-Digit OTP Code</label>
                            <input type="text" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="block w-full rounded-md bg-white px-3 py-2 text-center tracking-widest text-lg font-bold text-black outline-1 outline-gray-300 focus:outline-2 focus:outline-blue-600" />
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
                                    <span onClick={handleResendOtp} className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
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
        </div>
    );
}

export default Form;