
import React from 'react';
import { User, UserRole } from './types';

export interface AuthContextType {
  user: User | null;
  currentView: UserRole;
  setCurrentView: (role: UserRole) => void;
  login: (email: string) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType>({ 
  user: null, 
  currentView: UserRole.STUDENT, 
  setCurrentView: () => {}, 
  login: () => {}, 
  logout: () => {} 
});
