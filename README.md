# 🤖 Auto Chart AI

> Upload any data file — AI automatically analyzes it and generates the best visualizations. No Power BI. No Tableau. No manual chart configuration.

---

## 🚀 What It Does

1. **Upload** a CSV, Excel, or JSON file
2. **AI analyzes** the data schema and patterns using Claude (Anthropic)
3. **Charts are auto-generated** as downloadable PNG images
4. **Download** any chart you need

Zero manual configuration. The AI decides the best chart types, axes, and aggregations for your data.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python)
- **AI:** Claude claude-sonnet-4-20250514 via Anthropic API
- **Data Processing:** Pandas, NumPy
- **Chart Generation:** Matplotlib, Seaborn
- **File Support:** CSV, Excel (.xlsx/.xls), JSON

---

## 📁 Project Structure

```
auto-chart-ai/
├── main.py           # FastAPI app - all endpoints
├── requirements.txt  # Python dependencies
├── .env.example      # Environment variable template
├── uploads/          # Temp uploaded files (auto-cleaned)
└── charts/           # Generated chart PNG images
```

---

## ⚙️ Setup & Installation

### 1. Clone the repo
```bash
git clone https://github.com/janardhangowda345/auto-chart-ai.git
cd auto-chart-ai
```

### 2. Create virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set your API key
Create a `.env` file in the root folder:
```
ANTHROPIC_API_KEY=your_api_key_here
```
Get your API key at [console.anthropic.com](https://console.anthropic.com)

### 5. Run the server
```bash
uvicorn main:app --reload --port 8000
```

Server runs at: `http://localhost:8000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/upload` | Upload a data file |
| POST | `/analyze` | AI analyzes data & generates charts |
| GET | `/charts/{file_id}` | List all charts for a file |
| GET | `/download/{filename}` | Download a chart as PNG |
| DELETE | `/cleanup/{file_id}` | Delete file and its charts |

---

## 📊 Supported Chart Types

| Chart | When AI picks it |
|-------|-----------------|
| Bar Chart | Categorical vs Numeric comparison |
| Line Chart | Time series or trends |
| Pie Chart | Distribution / proportions |
| Scatter Plot | Two numeric columns correlation |
| Histogram | Single numeric column distribution |
| Heatmap | Correlation between all numeric columns |
| Box Plot | Outliers and spread of numeric data |
| Area Chart | Trend with volume emphasis |

---

## 🔄 How It Works

```
User uploads file
      ↓
Backend parses file with Pandas
      ↓
Schema sent to Claude AI (column types, stats, sample)
      ↓
Claude recommends 4–8 best chart types with axis mappings
      ↓
Backend generates each chart as PNG using Matplotlib
      ↓
User downloads any chart they need
```

---

## 📸 Example Response from /analyze

```json
{
  "total_charts": 5,
  "charts": [
    {
      "index": 0,
      "chart_type": "bar",
      "title": "Total Sales by Region",
      "x_column": "Region",
      "y_column": "Sales",
      "aggregation": "sum",
      "reason": "Best way to compare sales performance across regions",
      "image_url": "/charts/uuid_0_bar.png",
      "download_url": "/download/uuid_0_bar.png"
    }
  ]
}
```

---

## 🌐 Frontend

> Frontend coming soon — React + Recharts dashboard that connects to this backend.

---

## 👨‍💻 Author

**Janardhan Gowda**
- GitHub: [@janardhangowda345](https://github.com/janardhangowda345)
- Portfolio: [janardhangowda345.github.io](https://janardhangowda345.github.io)

---

## 📄 License

MIT License — free to use and modify.
