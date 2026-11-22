import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { MobileBottomNav } from './components/MobileBottomNav'
import { StateMessage } from './components/ui/StateMessage'
import { ToastProvider } from './components/ui/ToastProvider'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const InboxPage = lazy(() => import('./pages/InboxPage').then((module) => ({ default: module.InboxPage })))
const ListingDetailsPage = lazy(() => import('./pages/ListingDetailsPage').then((module) => ({ default: module.ListingDetailsPage })))
const ListingEditorPage = lazy(() => import('./pages/ListingEditorPage').then((module) => ({ default: module.ListingEditorPage })))
const MyListingsPage = lazy(() => import('./pages/MyListingsPage').then((module) => ({ default: module.MyListingsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage').then((module) => ({ default: module.PublicProfilePage })))
const ConversationPage = lazy(() => import('./pages/ConversationPage').then((module) => ({ default: module.ConversationPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="route-loading"><StateMessage kind="loading" message="Preparing this ShareHub page." title="Loading ShareHub" /></div>}>
          <Routes>
            <Route element={<HomePage />} path="/" />
            <Route element={<LoginPage />} path="/login" />
            <Route element={<RegisterPage />} path="/register" />
            <Route element={<ForgotPasswordPage />} path="/forgot-password" />
            <Route element={<ResetPasswordPage />} path="/reset-password" />
            <Route element={<AuthCallbackPage />} path="/auth/callback" />
            <Route element={<ListingDetailsPage />} path="/listings/:listingId" />
            <Route element={<PublicProfilePage />} path="/profiles/:profileId" />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardPage />} path="/dashboard" />
              <Route element={<ProfilePage />} path="/profile" />
              <Route element={<InboxPage />} path="/inbox" />
              <Route element={<ConversationPage />} path="/inbox/:conversationId" />
              <Route element={<MyListingsPage />} path="/my-listings" />
              <Route element={<ListingEditorPage />} path="/listings/new" />
              <Route element={<ListingEditorPage />} path="/my-listings/:listingId/edit" />
            </Route>
            <Route element={<NotFoundPage />} path="*" />
          </Routes>
          </Suspense>
          <MobileBottomNav />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
