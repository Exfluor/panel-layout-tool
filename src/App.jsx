import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CanvasPage from './pages/CanvasPage'
import SetupPage from './pages/SetupPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetupPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
