import axios from 'axios';

const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Check if the current domain is a local IP or local domain (e.g. 192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x)
const isLocalIp = 
    isLocalhost ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local');

const isOnline = !isLocalIp;

let apiBaseUrl = '';
if (isOnline) {
    // Online production backend on Hostinger
    apiBaseUrl = 'https://cahayapos.id/api';
} else if (isLocalhost) {
    apiBaseUrl = 'https://cahayapos.id/api'; // Temporarily changed for testing
} else {
    // Local LAN (e.g. 192.168.1.X) for other devices in the store
    apiBaseUrl = `http://${hostname}:8000/api`;
}

export const API_BASE_URL = apiBaseUrl;
export const API_ASSET_URL = apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl;

const api = axios.create({
    baseURL: API_BASE_URL, 
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request interceptor to attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Check for inactivity timeout (12 hours)
            const lastActivity = localStorage.getItem('last_activity');
            const now = Date.now();
            const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours
            
            if (lastActivity && (now - parseInt(lastActivity) > INACTIVITY_LIMIT_MS)) {
                // Session expired
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('last_activity');
                window.location.href = '/login?expired=true';
                return Promise.reject(new Error('Session expired due to inactivity'));
            }
            
            // Update last activity
            localStorage.setItem('last_activity', now.toString());
            
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 Unauthenticated dynamically
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/login');
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('last_activity');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
