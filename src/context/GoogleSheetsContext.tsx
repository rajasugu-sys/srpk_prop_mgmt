import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken, 
  getCurrentUser 
} from '../services/auth';
import { 
  listDriveSpreadsheets, 
  createPropertySpreadsheet, 
  getSpreadsheetInfo, 
  syncAllDataToGoogleSheet, 
  pullDataFromGoogleSheet,
  DriveSpreadsheetItem 
} from '../services/googleSheetsApi';
import { House, Tenant, MonthlyInvoice } from '../types';

export interface ConnectedSheet {
  id: string;
  name: string;
  url: string;
  lastSyncedAt: string | null;
}

interface GoogleSheetsContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  accessToken: string | null;
  connectedSheet: ConnectedSheet | null;
  driveSheets: DriveSpreadsheetItem[];
  isLoadingDriveSheets: boolean;
  isSyncing: boolean;
  syncStatus: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  inviteSheetId: string | null;
  // Auth actions
  loginWithGoogle: () => Promise<boolean>;
  logoutFromGoogle: () => Promise<void>;
  
  // Sheet actions
  connectSheet: (sheetId: string, sheetName?: string) => Promise<boolean>;
  disconnectSheet: () => void;
  createNewGoogleSheet: (title?: string) => Promise<ConnectedSheet | null>;
  refreshDriveSpreadsheets: () => Promise<void>;
  
  // Data sync
  syncToGoogleSheet: (
    houses: House[], 
    tenants: Tenant[], 
    invoices: MonthlyInvoice[],
    maintenanceBills?: any[],
    waterReadings?: any[],
    ebReadings?: any[]
  ) => Promise<{ success: boolean; message: string }>;
  
  syncFromGoogleSheet: () => Promise<{
    success: boolean;
    data?: {
      houses?: House[];
      tenants?: Tenant[];
      invoices?: MonthlyInvoice[];
      maintenanceBills?: any[];
      waterReadings?: any[];
      ebReadings?: any[];
    };
    message: string;
  }>;
}

const GoogleSheetsContext = createContext<GoogleSheetsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CONNECTED_SHEET: 'srkp_connected_google_sheet_v1',
};

export const GoogleSheetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [connectedSheet, setConnectedSheet] = useState<ConnectedSheet | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONNECTED_SHEET);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved sheet info', e);
    }
    return null;
  });

  const [driveSheets, setDriveSheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingDriveSheets, setIsLoadingDriveSheets] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Save connected sheet to localStorage
  const [inviteSheetId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sheetId') || urlParams.get('sheet') || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      if (connectedSheet) {
        localStorage.setItem(STORAGE_KEYS.CONNECTED_SHEET, JSON.stringify(connectedSheet));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CONNECTED_SHEET);
      }
    } catch (e) {
      console.error('Failed to persist connected sheet', e);
    }
  }, [connectedSheet]);

  // If invited to a sheet via URL parameter (?sheetId=...), auto-connect once authenticated
  useEffect(() => {
    if (accessToken && inviteSheetId) {
      if (!connectedSheet || connectedSheet.id !== inviteSheetId) {
        connectSheet(inviteSheetId);
      }
    }
  }, [accessToken, inviteSheetId, connectedSheet]);

  // Fetch spreadsheets from Drive when token is available
  const refreshDriveSpreadsheets = useCallback(async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    setIsLoadingDriveSheets(true);
    try {
      const files = await listDriveSpreadsheets(token);
      setDriveSheets(files);

      // Auto-connect if none connected yet and a file matches Bangalore_house_rent or SRKP
      if (!connectedSheet && files.length > 0) {
        const matching = files.find(
          (f) =>
            f.name.toLowerCase().includes('bangalore_house_rent') ||
            f.name.toLowerCase().includes('bangalore house rent') ||
            f.name.toLowerCase().includes('srkp')
        );
        if (matching) {
          const autoSheet: ConnectedSheet = {
            id: matching.id,
            name: matching.name,
            url: matching.webViewLink || `https://docs.google.com/spreadsheets/d/${matching.id}/edit`,
            lastSyncedAt: null,
          };
          setConnectedSheet(autoSheet);
        }
      }
    } catch (err: any) {
      console.warn('Could not auto-list Drive spreadsheets:', err.message);
    } finally {
      setIsLoadingDriveSheets(false);
    }
  }, [accessToken, connectedSheet]);

  // Setup Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        const current = getCurrentUser();
        setUser(current);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // When token becomes active, fetch drive sheets
  useEffect(() => {
    if (accessToken) {
      refreshDriveSpreadsheets();
    }
  }, [accessToken, refreshDriveSpreadsheets]);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsAuthLoading(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setSyncStatus({ message: `Signed in as ${res.user.email}. Connected to Google Workspace.`, type: 'info' });
        return true;
      }
      return false;
    } catch (err: any) {
      setSyncStatus({ message: err?.message || 'Google Sign-In failed.', type: 'error' });
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logoutFromGoogle = async (): Promise<void> => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setDriveSheets([]);
    setSyncStatus({ message: 'Signed out from Google.', type: 'info' });
  };

  const connectSheet = async (sheetId: string, sheetName?: string): Promise<boolean> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setSyncStatus({ message: 'Please sign in with Google first.', type: 'error' });
      return false;
    }

    try {
      setIsSyncing(true);
      // Clean ID if full URL pasted
      let cleanId = sheetId.trim();
      const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }

      const info = await getSpreadsheetInfo(token, cleanId);
      const newConnected: ConnectedSheet = {
        id: cleanId,
        name: sheetName || info.title,
        url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setConnectedSheet(newConnected);
      setSyncStatus({
        message: `Connected to Google Sheet: "${newConnected.name}"`,
        type: 'success',
      });
      return true;
    } catch (err: any) {
      setSyncStatus({
        message: err?.message || 'Failed to connect to Google Sheet. Check ID and sharing permissions.',
        type: 'error',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectSheet = () => {
    setConnectedSheet(null);
    setSyncStatus({ message: 'Google Sheet disconnected from app.', type: 'info' });
  };

  const createNewGoogleSheet = async (title: string = 'SRKP Property Management - Bangalore'): Promise<ConnectedSheet | null> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setSyncStatus({ message: 'Please sign in with Google first.', type: 'error' });
      return null;
    }

    try {
      setIsSyncing(true);
      const newSheet = await createPropertySpreadsheet(token, title);
      const connected: ConnectedSheet = {
        id: newSheet.id,
        name: newSheet.name,
        url: newSheet.url,
        lastSyncedAt: null,
      };
      setConnectedSheet(connected);
      await refreshDriveSpreadsheets();
      setSyncStatus({
        message: `Created new spreadsheet "${title}" in your Google Drive!`,
        type: 'success',
      });
      return connected;
    } catch (err: any) {
      setSyncStatus({
        message: err?.message || 'Failed to create spreadsheet in Google Drive.',
        type: 'error',
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToGoogleSheet = async (
    houses: House[],
    tenants: Tenant[],
    invoices: MonthlyInvoice[],
    maintenanceBills: any[] = [],
    waterReadings: any[] = [],
    ebReadings: any[] = []
  ): Promise<{ success: boolean; message: string }> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      return { success: false, message: 'Not signed in with Google. Please sign in to sync.' };
    }

    if (!connectedSheet) {
      return { success: false, message: 'No Google Sheet connected. Please connect or create a sheet first.' };
    }

    try {
      setIsSyncing(true);
      const result = await syncAllDataToGoogleSheet(
        token,
        connectedSheet.id,
        houses,
        tenants,
        invoices,
        maintenanceBills,
        waterReadings,
        ebReadings
      );

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setConnectedSheet((prev) => (prev ? { ...prev, lastSyncedAt: timestamp } : null));

      const successMsg = `Auto-synced to Google Sheet "${connectedSheet.name}" (${result.housesCount} houses, ${result.tenantsCount} tenants, ${result.invoicesCount} invoices, ${result.maintenanceBillsCount} maint bills, ${result.waterReadingsCount} water readings, ${result.ebReadingsCount} EB readings)`;
      setSyncStatus({ message: successMsg, type: 'success' });
      return { success: true, message: successMsg };
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to sync data to Google Sheet.';
      setSyncStatus({ message: errorMsg, type: 'error' });
      return { success: false, message: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromGoogleSheet = async (): Promise<{
    success: boolean;
    data?: { houses?: House[]; tenants?: Tenant[]; invoices?: MonthlyInvoice[] };
    message: string;
  }> => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      return { success: false, message: 'Not signed in with Google.' };
    }

    if (!connectedSheet) {
      return { success: false, message: 'No Google Sheet connected.' };
    }

    try {
      setIsSyncing(true);
      const pulled = await pullDataFromGoogleSheet(token, connectedSheet.id);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setConnectedSheet((prev) => (prev ? { ...prev, lastSyncedAt: timestamp } : null));

      const count =
        (pulled.houses?.length || 0) +
        (pulled.tenants?.length || 0) +
        (pulled.invoices?.length || 0);

      const successMsg = `Imported ${count} total records from Google Sheet "${connectedSheet.name}".`;
      setSyncStatus({ message: successMsg, type: 'success' });
      return { success: true, data: pulled, message: successMsg };
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to pull data from Google Sheet.';
      setSyncStatus({ message: errorMsg, type: 'error' });
      return { success: false, message: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <GoogleSheetsContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!accessToken,
        isAuthLoading,
        accessToken,
        connectedSheet,
        driveSheets,
        isLoadingDriveSheets,
        isSyncing,
        syncStatus,
        inviteSheetId,
        loginWithGoogle,
        logoutFromGoogle,
        connectSheet,
        disconnectSheet,
        createNewGoogleSheet,
        refreshDriveSpreadsheets,
        syncToGoogleSheet,
        syncFromGoogleSheet,
      }}
    >
      {children}
    </GoogleSheetsContext.Provider>
  );
};

export const useGoogleSheets = () => {
  const context = useContext(GoogleSheetsContext);
  if (!context) {
    throw new Error('useGoogleSheets must be used within a GoogleSheetsProvider');
  }
  return context;
};
