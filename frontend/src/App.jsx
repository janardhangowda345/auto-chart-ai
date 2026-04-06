import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadScreen from './components/UploadScreen';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './components/Dashboard';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [screen, setScreen] = useState('upload'); // 'upload' | 'analyzing' | 'dashboard'
  const [fileInfo, setFileInfo] = useState(null);
  const [chartConfigs, setChartConfigs] = useState([]);
  const [chartData, setChartData] = useState({});
  const [error, setError] = useState(null);

  // Handle file upload completion
  const onUploadSuccess = (data) => {
    setFileInfo(data);
    setScreen('analyzing');
    analyzeDataset(data);
  };

  // Step 2: Analyze the dataset with AI
  const analyzeDataset = async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, {
        columns: data.columns,
        dtypes: data.dtypes,
        sample: data.sample,
        row_count: data.row_count
      });
      
      setChartConfigs(response.data);
      // After analysis, fetch chart data for each config
      setScreen('dashboard');
      fetchChartData(response.data, data.file_path);
    } catch (err) {
      console.error('Analysis failed', err);
      setError(err.response?.data?.detail || 'AI analysis failed. Please check your Anthropic API Key.');
      setScreen('upload');
    }
  };

  // Step 3: Fetch processed data for each recommended chart
  const fetchChartData = async (configs, filePath) => {
    const dataMap = {};
    for (let i = 0; i < configs.length; i++) {
        try {
            const res = await axios.post(`${API_BASE_URL}/chart-data`, {
                chart_config: configs[i],
                file_path: filePath
            });
            dataMap[i] = res.data;
        } catch (err) {
            console.error(`Failed to fetch data for chart ${i}`, err);
            dataMap[i] = [];
        }
    }
    setChartData(dataMap);
  };

  const handleReset = () => {
    setScreen('upload');
    setFileInfo(null);
    setChartConfigs([]);
    setChartData({});
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
          <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-lg px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
            <div className="bg-red-500 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <p className="font-bold text-red-500">Error</p>
              <p className="text-sm text-red-100/80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 hover:text-white text-muted">✕</button>
          </div>
        </div>
      )}

      {screen === 'upload' && (
        <UploadScreen onUploadSuccess={onUploadSuccess} />
      )}

      {screen === 'analyzing' && (
        <LoadingScreen fileInfo={fileInfo} />
      )}

      {screen === 'dashboard' && (
        <Dashboard 
          fileInfo={fileInfo} 
          chartConfigs={chartConfigs} 
          chartData={chartData}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

export default App;
