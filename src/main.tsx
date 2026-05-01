import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import AuditPage from './pages/AuditPage'
import AboutPage from './pages/AboutPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuditPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/report/:runId" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
