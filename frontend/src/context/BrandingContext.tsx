/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBrandingSettings } from '../services/api';

interface BrandingState {
  schoolName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  themeName: string;
  brandingVersion: number;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingState>({
  schoolName: 'AttendX',
  logoUrl: null,
  faviconUrl: null,
  themeName: 'dark-purple',
  brandingVersion: 1,
  loading: true,
  refreshBranding: async () => {},
});

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({
    schoolName: 'AttendX',
    logoUrl: null as string | null,
    faviconUrl: null as string | null,
    themeName: 'dark-purple',
    brandingVersion: 1,
    loading: true,
  });

  const applyTheme = useCallback((themeName: string) => {
    if (themeName === 'dark-purple') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = themeName;
    }
  }, []);

  const applyFavicon = useCallback((url: string | null) => {
    if (!url) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    // Prepend API base if relative
    link.href = url.startsWith('http') ? url : `http://localhost:8000${url}`;
  }, []);

  const applyTitle = useCallback((name: string) => {
    document.title = `${name} | Attendance System`;
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const { data } = await getBrandingSettings();
      const newState = {
        schoolName: data.school_name || 'AttendX',
        logoUrl: data.logo_url || null,
        faviconUrl: data.favicon_url || null,
        themeName: data.theme_name || 'dark-purple',
        brandingVersion: data.branding_version || 1,
        loading: false,
      };
      setState(newState);
      applyTheme(newState.themeName);
      applyFavicon(newState.faviconUrl);
      applyTitle(newState.schoolName);
      localStorage.setItem('attendx_branding', JSON.stringify(newState));
    } catch {
      // Use cached or defaults
      const cached = localStorage.getItem('attendx_branding');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setState({ ...parsed, loading: false });
          applyTheme(parsed.themeName);
          applyFavicon(parsed.faviconUrl);
          applyTitle(parsed.schoolName);
        } catch {
          setState(s => ({ ...s, loading: false }));
        }
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    }
  }, [applyTheme, applyFavicon, applyTitle]);

  useEffect(() => {
    // Load cached immediately
    const cached = localStorage.getItem('attendx_branding');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setState({ ...parsed, loading: true });
        applyTheme(parsed.themeName);
        applyFavicon(parsed.faviconUrl);
        applyTitle(parsed.schoolName);
      } catch { /* ignore */ }
    }
    // Then refresh from API
    void refreshBranding();
  }, [refreshBranding, applyTheme, applyFavicon, applyTitle]);

  return (
    <BrandingContext.Provider value={{ ...state, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
