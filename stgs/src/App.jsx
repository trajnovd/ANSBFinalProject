import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import AppShell from './components/AppShell.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import Login from './routes/Login.jsx'
import Dashboard from './routes/Dashboard.jsx'
import Applications from './routes/Applications.jsx'
import ApplicationDetail from './routes/ApplicationDetail.jsx'
import NewApplication from './routes/NewApplication.jsx'
import CancelApplication from './routes/CancelApplication.jsx'
import Approvals from './routes/Approvals.jsx'
import ExpenseReports from './routes/ExpenseReports.jsx'
import NewExpenseReport from './routes/NewExpenseReport.jsx'
import Reconciliation from './routes/Reconciliation.jsx'
import Budget from './routes/Budget.jsx'
import AuditTrail from './routes/AuditTrail.jsx'

export default function App() {
  const { user, ready } = useAuth()
  if (!ready) return null

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/new" element={
          <RoleGuard roles={['Applicant']}><NewApplication /></RoleGuard>
        } />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/cancel" element={
          <RoleGuard roles={['Applicant']}><CancelApplication /></RoleGuard>
        } />
        <Route path="/approvals" element={
          <RoleGuard roles={['ScientificCouncil', 'DeanOffice']}><Approvals /></RoleGuard>
        } />
        <Route path="/reports" element={
          <RoleGuard roles={['Applicant', 'Accounting']}><ExpenseReports /></RoleGuard>
        } />
        <Route path="/reports/new/:applicationId" element={
          <RoleGuard roles={['Applicant']}><NewExpenseReport /></RoleGuard>
        } />
        <Route path="/reconciliation" element={
          <RoleGuard roles={['Accounting']}><Reconciliation /></RoleGuard>
        } />
        <Route path="/budget" element={
          <RoleGuard roles={['DeanOffice', 'Accounting', 'SystemAdmin']}><Budget /></RoleGuard>
        } />
        <Route path="/audit" element={
          <RoleGuard roles={['SystemAdmin']}><AuditTrail /></RoleGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
