import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  )
}

export default App
