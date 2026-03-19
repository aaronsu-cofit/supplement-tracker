'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api.js';

const ModuleContext = createContext({ modules: [], isLoading: true, error: null, getModule: () => null });

export function useModules() {
  return useContext(ModuleContext);
}

export function ModuleProvider({ children }) {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchModules() {
      try {
        const res = await apiFetch('/api/modules');
        if (!res.ok) throw new Error('Failed to fetch modules');
        const data = await res.json();
        if (isMounted) setModules(data.modules || []);
      } catch (err) {
        console.error('Error fetching modules:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchModules();
    return () => { isMounted = false; };
  }, []);

  return (
    <ModuleContext.Provider value={{ modules, isLoading, error, getModule: (id) => modules.find(m => m.id === id) || null }}>
      {children}
    </ModuleContext.Provider>
  );
}
