
import React from 'react';
import { User, UserRole } from './types';

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  currentView: UserRole;
  setCurrentView: (role: UserRole) => void;
  login: (email: string, password?: string) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  setUser: () => { },
  currentView: UserRole.STUDENT,
  setCurrentView: () => { },
  login: () => { },
  logout: () => { }
});
