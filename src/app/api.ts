import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Default local Laravel port
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true, // Required for Sanctum CSRF cookies
});

// Request interceptor to attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
