import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,  // Send HttpOnly cookies with every request
})

// No request interceptor needed — the browser sends cookies automatically.

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // If the refresh endpoint itself failed, redirect to login
            if (originalRequest.url?.includes('/api/token/refresh/')) {
                const currentPath = window.location.pathname;
                if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            // If another refresh is already in progress, queue this request
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // The refresh token is in an HttpOnly cookie — the browser sends it automatically
                await axios.post(
                    import.meta.env.VITE_API_URL + '/api/token/refresh/',
                    {},
                    { withCredentials: true }
                );

                processQueue(null);

                // Retry the original request (the new access cookie is already set)
                return api(originalRequest);
            } catch (err) {
                processQueue(err);
                
                // ONLY redirect if we are not already on the login page or register page
                const currentPath = window.location.pathname;
                if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
)

export default api
