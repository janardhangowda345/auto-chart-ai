import os
import uuid
import time
import shutil
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DataLens AI API")

# Configuration
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "tmp", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
FILE_EXPIRY_SECONDS = 3600  # 1 hour

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic Client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Models
class AnalysisRequest(BaseModel):
    columns: List[str]
    dtypes: Dict[str, str]
    sample: List[Dict[str, Any]]
    row_count: int

class ChartConfig(BaseModel):
    chart_type: str
    title: str
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    aggregation: str = "none"
    reason: str

class ChartDataRequest(BaseModel):
    chart_config: ChartConfig
    file_path: str

# Background Task: Cleanup Files
async def cleanup_old_files():
    while True:
        try:
            now = time.time()
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    if now - os.path.getmtime(file_path) > FILE_EXPIRY_SECONDS:
                        os.remove(file_path)
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(600)  # Run every 10 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_old_files())

# Helper: Detect Data Types
def detect_dtypes(df: pd.DataFrame) -> Dict[str, str]:
    dtypes = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            dtypes[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            dtypes[col] = "datetime"
        else:
            dtypes[col] = "categorical"
    return dtypes

# Endpoints
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".xls", ".json"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    file_id = str(uuid.uuid4())
    temp_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Parse file
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)

        # Handle empty/corrupt
        if df.empty:
             os.remove(file_path)
             raise HTTPException(status_code=400, detail="Uploaded file is empty")

        columns = df.columns.tolist()
        dtypes = detect_dtypes(df)
        row_count = len(df)
        sample = df.head(5).where(pd.notnull(df), None).to_dict(orient="records")

        return {
            "file_path": file_path,
            "filename": file.filename,
            "columns": columns,
            "dtypes": dtypes,
            "row_count": row_count,
            "sample": sample
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"File parsing error: {str(e)}")

@app.post("/analyze")
async def analyze_data(request: AnalysisRequest):
    if not ANTHROPIC_API_KEY:
         # Fallback mock logic for demo
         recommendations = [
             {
                 "chart_type": "line",
                 "title": f"Trends Over Time",
                 "x_column": next((col for col, dt in request.dtypes.items() if dt == "datetime"), request.columns[0]),
                 "y_column": next((col for col, dt in request.dtypes.items() if dt == "numeric"), request.columns[1] if len(request.columns) > 1 else request.columns[0]),
                 "color_column": None,
                 "aggregation": "mean",
                 "reason": "Tracking temporal trends is essential for identifying patterns and seasonality. (DEMO MODE: No API Key Provided)"
             },
             {
                 "chart_type": "bar",
                 "title": f"Distribution by Category",
                 "x_column": next((col for col, dt in request.dtypes.items() if dt == "categorical"), request.columns[0]),
                 "y_column": next((col for col, dt in request.dtypes.items() if dt == "numeric"), request.columns[1] if len(request.columns) > 1 else request.columns[0]),
                 "color_column": None,
                 "aggregation": "sum",
                 "reason": "Summarizing numeric values by category provides a clear comparative view. (DEMO MODE: No API Key Provided)"
             },
             {
                 "chart_type": "pie",
                 "title": f"Composition Breakdown",
                 "x_column": next((col for col, dt in request.dtypes.items() if dt == "categorical"), request.columns[0]),
                 "y_column": request.columns[0],
                 "color_column": None,
                 "aggregation": "count",
                 "reason": "Visualizing distribution proportions helps understand the data landscape. (DEMO MODE: No API Key Provided)"
             }
         ]
         return recommendations

    prompt = f"""You are a data visualization expert. Given a dataset schema, recommend the best charts to reveal insights. Return ONLY a valid JSON array with no explanation. 
Each chart object must have: chart_type, title, x_column, y_column, color_column, aggregation, reason. Be specific to the actual column names provided.

Dataset Schema:
- Columns: {request.columns}
- Data Types: {request.dtypes}
- Sample Rows: {request.sample}
- Total Rows: {request.row_count}

Chart Types available: bar, line, pie, scatter, histogram, heatmap, box.
Aggregation options: sum, mean, count, none.

Return 3 to 6 chart recommendations.
"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            system="You are a data visualization expert. Return ONLY a valid JSON array.",
            messages=[{"role": "user", "content": prompt}]
        )
        # Extract JSON from response
        content = response.content[0].text
        # Clean up code blocks if assistant included them
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        import json
        recommendations = json.loads(content)
        return recommendations

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis error: {str(e)}")

@app.post("/chart-data")
async def get_chart_data(request: ChartDataRequest):
    file_path = request.file_path
    config = request.chart_config

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or expired")

    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)

        # Apply aggregation
        if config.aggregation != "none" and config.x_column:
            if config.aggregation == "sum":
                chart_df = df.groupby(config.x_column)[config.y_column].sum().reset_index()
            elif config.aggregation == "mean":
                chart_df = df.groupby(config.x_column)[config.y_column].mean().reset_index()
            elif config.aggregation == "count":
                chart_df = df.groupby(config.x_column).size().reset_index(name="count")
                # Override y_column for count
                config.y_column = "count"
        else:
            # No aggregation, just select columns and limit if too many
            cols = []
            if config.x_column: cols.append(config.x_column)
            if config.y_column: cols.append(config.y_column)
            if config.color_column: cols.append(config.color_column)
            
            # Remove duplicates for select
            cols = list(dict.fromkeys(cols))
            
            if config.chart_type == "histogram":
                # Special handling for histogram: return values for Recharts to bin, 
                # or bin them here if Recharts doesn't handle natively.
                # Recharts doesn't have a built-in Histogram, usually done with BarChart and binned data.
                bins = 20
                counts, bin_edges = pd.cut(df[config.x_column], bins=bins, retbins=True)
                binned_data = df.groupby(counts).size().reset_index(name='count')
                binned_data[config.x_column] = binned_data[config.x_column].apply(lambda x: f"{x.left:.2f}-{x.right:.2f}")
                chart_df = binned_data
            elif config.chart_type == "heatmap":
                # Correlation heatmap
                numeric_df = df.select_dtypes(include=['number'])
                corr = numeric_df.corr().round(2)
                # Transform to format suitable for heatmap grid
                data = []
                for i, row in enumerate(corr.index):
                    for j, col in enumerate(corr.columns):
                        data.append({"x": row, "y": col, "value": corr.iloc[i, j]})
                return data
            else:
                # Limit rows for non-aggregated charts to keep performance
                chart_df = df[cols].head(1000)

        # Format for Recharts
        data = chart_df.where(pd.notnull(chart_df), None).to_dict(orient="records")
        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart processing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
