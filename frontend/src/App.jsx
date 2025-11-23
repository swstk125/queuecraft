import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DLQViewer from './pages/DLQViewer'
import JobDetails from './pages/JobDetails'
import Login from './pages/Login'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dlq" element={<DLQViewer />} />
            <Route path="job/:jobId" element={<JobDetails />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

