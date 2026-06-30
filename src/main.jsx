import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Constructor from './Constructor.jsx';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Page = path === '/constructor' ? Constructor : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Page/></React.StrictMode>
);
