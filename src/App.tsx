import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import Login from './pages/Login.js';
import Chat from './pages/Chat.js';
import MemoryManagement from './pages/MemoryManagement.js';
import ToolMarketplace from './pages/ToolMarketplace.js';
import Profile from './pages/Profile.js';
import Voice from './pages/Voice.js';
import KnowledgeBase from './pages/KnowledgeBase.js';
import Canvas from './pages/Canvas.js';
import MemoryTree from './pages/MemoryTree.js';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-slate-300">
        启动 LumiOS...
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-slate-300">
        启动 LumiOS...
      </div>
    );
  }
  return user ? <Navigate to="/chat" replace /> : <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
        <Route path="/voice" element={<Voice />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="/memories/tree" element={<MemoryTree />} />
        <Route path="/memories" element={<MemoryManagement />} />
        <Route path="/tools" element={<ToolMarketplace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
