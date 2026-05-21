import React from 'react';
import Sidebar from '../components/sidebar';
import TopBar from '../components/TopBar';
import Login from './Login';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
