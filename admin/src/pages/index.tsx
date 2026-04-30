import React from 'react';
import { Navigate } from 'umi';

export default function Index() {
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return <Navigate to="/dashboard" />;
}
