/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);

    const updateUser = useCallback((userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const refreshUser = useCallback(async () => {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        if (!tokens.access) return null;
        const res = await api.get('/auth/me/');
        updateUser(res.data);
        return res.data;
    }, [updateUser]);

    // On refresh/page-load, if tokens exist, restore the user profile.
    useEffect(() => {
        refreshUser().catch(() => {
            // If refresh fails, axios interceptor will redirect to /login.
        });
    }, [refreshUser]);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/login/', { email, password });
            const { user: userData, tokens } = res.data;
            localStorage.setItem('tokens', JSON.stringify(tokens));
            updateUser(userData);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const register = async (payload) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/register/', payload);
            const { user: userData, tokens } = res.data;
            localStorage.setItem('tokens', JSON.stringify(tokens));
            updateUser(userData);
            return { success: true, message: res.data?.message };
        } catch (err) {
            const data = err.response?.data;
            let error = 'Registration failed';
            if (typeof data === 'string') {
                error = data;
            } else if (data?.error) {
                error = data.error;
            } else if (data && typeof data === 'object') {
                const firstValue = Object.values(data)[0];
                if (Array.isArray(firstValue)) error = firstValue[0];
                else if (typeof firstValue === 'string') error = firstValue;
            }
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
            if (tokens.refresh) {
                await api.post('/auth/logout/', { refresh: tokens.refresh }).catch(() => {});
            }
        } finally {
            localStorage.removeItem('user');
            localStorage.removeItem('tokens');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
