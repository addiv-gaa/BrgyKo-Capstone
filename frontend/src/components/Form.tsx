import {useState} from "react"
import api from "../api"
import { useNavigate } from "react-router-dom"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import usericon from "../images/usericon.png"

interface FormProps{
    route: string;
    method: "login" | "register";
}

function Form({route, method}: FormProps){
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const name = method === "login" ? "Login" : "Register"

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        setLoading(true);
        e.preventDefault();

        try {
            const res = await api.post(route, {username, password})
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                navigate("/")
            } else {
                navigate("/login")
            }
        
        
        } catch(error){
            alert(error)
        } finally{
            setLoading(false)
        }
    };

    return (
        <>
            <div className="flex bg-gray-100 min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    {/* Replaced generic logo with your custom usericon */}
                    <img
                        alt="IT Helpdesk User Icon"
                        src={usericon}
                        className="mx-auto h-16 w-auto" 
                    />
                    {/* Made the header dynamic using the {name} variable */}
                    <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
                        {name} your account
                    </h2>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    {/* Attached your handleSubmit function here */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* USERNAME FIELD */}
                        <div>
                            {/* Changed from Email to Username */}
                            <label htmlFor="username" className="block text-sm/6 font-medium text-black">
                                Username
                            </label>
                            <div className="mt-2">
                                <input
                                    id="username"
                                    name="username"
                                    type="text" 
                                    required
                                    value={username} // Connected to state
                                    onChange={(e) => setUsername(e.target.value)} // Connected to state
                                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* PASSWORD FIELD */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm/6 font-medium text-black">
                                    Password
                                </label>
                                {/* Only show "Forgot Password" on the Login page, not the Register page */}
                                {method === "login" && (
                                    <div className="text-sm">
                                        <a href="#" className="font-semibold text-blue-400 hover:text-blue-300">
                                            Forgot password?
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={password} // Connected to state
                                    onChange={(e) => setPassword(e.target.value)} // Connected to state
                                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading} // Prevents double-clicking
                                className="flex w-full justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Dynamic text: Shows loading state or Login/Register */}
                                {loading ? "Please wait..." : name}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default Form