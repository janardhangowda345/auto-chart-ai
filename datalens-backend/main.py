import os
import uuid
import json
import logging
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional

import pandas as pd
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import aiofiles

# 1. matplotlib must use Agg backend (non-GUI)
matplotlib.use("Agg")

# Initialize Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("datalens-backend")

app = FastAPI(title="DataLens AI Backend")

# CORS enabled for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
CHART_DIR = BASE_DIR / "charts"

UPLOAD_DIR.mkdir(exist_ok=True)
CHART_DIR.mkdir(exist_ok=True)

# Anthropic Client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = None
if ANTHROPIC_API_KEY:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Chart Styling
plt.rcParams["figure.facecolor"] = "#0d1117"
plt.rcParams["axes.facecolor"] = "#161b22"
plt.rcParams["axes.edgecolor"] = "#30363d"
plt.rcParams["text.color"] = "#c9d1d9"
plt.rcParams["xtick.color"] = "#8b949e"
plt.rcParams["ytick.color"] = "#8b949e"
plt.rcParams["grid.color"] = "#21262d"

COLOR_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

# In-memory store for chart metadata
chart_metadata_store = {}

# --- Models ---

class AnalysisRequest(BaseModel):
    file_id: str
    file_path: str
    columns: List[str]
    dtypes: Dict[str, str]
    stats: Dict[str, Any]
    sample: List[Dict[str, Any]]
    row_count: int

# --- Helper Functions ---

def truncate_label(label, max_len=15):
    label = str(label)
    return label[:max_len] + "..." if len(label) > max_len else label

def generate_chart(df: pd.DataFrame, chart_config: Dict[str, Any], file_id: str, index: int) -> Optional[Dict[str, Any]]:
    chart_type = chart_config.get("chart_type")
    title = chart_config.get("title")
    x_col = chart_config.get("x_column")
    y_col = chart_config.get("y_column")
    color_col = chart_config.get("color_column")
    agg = chart_config.get("aggregation", "none")

    # Check if columns exist
    for col in [x_col, y_col, color_col]:
        if col and col not in df.columns:
            logger.warning(f"Column {col} not found in dataframe. Skipping chart.")
            return None

    try:
        plt.figure(figsize=(10, 6))
        
        # Clean data for charting
        temp_df = df.copy()
        
        # Fill NaNs
        for col in temp_df.columns:
            if pd.api.types.is_numeric_dtype(temp_df[col]):
                temp_df[col] = temp_df[col].fillna(0)
            else:
                temp_df[col] = temp_df[col].fillna("Unknown")

        if chart_type == "bar":
            if agg in ["sum", "mean", "count"]:
                if agg == "count":
                    plot_data = temp_df.groupby(x_col).size().reset_index(name="Count")
                    y_col = "Count"
                else:
                    plot_data = temp_df.groupby(x_col)[y_col].agg(agg).reset_index()
                
                # Top 15 if categorical
                if len(plot_data) > 15:
                    plot_data = plot_data.sort_values(by=y_col, ascending=False).head(15)
                
                ax = sns.barplot(data=plot_data, x=x_col, y=y_col, color="#3b82f6")
                # Value labels
                for p in ax.patches:
                    ax.annotate(f'{p.get_height():.1f}', (p.get_x() + p.get_width() / 2., p.get_height()),
                                ha='center', va='center', xytext=(0, 9), textcoords='offset points', color='white')
            else:
                # No aggregation, just plot first 15
                plot_data = temp_df.head(15)
                ax = sns.barplot(data=plot_data, x=x_col, y=y_col, color="#3b82f6")

            if len(temp_df[x_col].unique()) > 6:
                plt.xticks(rotation=45)

        elif chart_type == "line":
            if x_col and pd.api.types.is_extension_array_dtype(temp_df[x_col]) or "date" in x_col.lower():
                temp_df[x_col] = pd.to_datetime(temp_df[x_col])
                temp_df = temp_df.sort_values(by=x_col)

            if agg != "none":
                if agg == "count":
                    plot_data = temp_df.groupby(x_col).size().reset_index(name="Count")
                    y_col = "Count"
                else:
                    plot_data = temp_df.groupby(x_col)[y_col].agg(agg).reset_index()
                plt.plot(plot_data[x_col], plot_data[y_col], color="#10b981", linewidth=2, marker="o", markersize=4)
            else:
                plt.plot(temp_df[x_col], temp_df[y_col], color="#10b981", linewidth=2, marker="o", markersize=4)

        elif chart_type == "pie":
            counts = temp_df[x_col].value_counts()
            if len(counts) > 8:
                others = counts[8:].sum()
                counts = counts[:8]
                counts["Others"] = others
            
            plt.pie(counts, labels=[truncate_label(l) for l in counts.index], colors=COLOR_PALETTE, autopct="%1.1f%%", startangle=90)
            plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')

        elif chart_type == "scatter":
            if color_col:
                sns.scatterplot(data=temp_df, x=x_col, y=y_col, hue=color_col, palette=COLOR_PALETTE[:len(temp_df[color_col].unique())], alpha=0.6)
            else:
                plt.scatter(temp_df[x_col], temp_df[y_col], color="#f59e0b", alpha=0.6)
            
            # Trend line
            try:
                z = np.polyfit(pd.to_numeric(temp_df[x_col], errors='coerce').fillna(0), temp_df[y_col], 1)
                p = np.poly1d(z)
                plt.plot(temp_df[x_col], p(pd.to_numeric(temp_df[x_col], errors='coerce').fillna(0)), "r--", alpha=0.8)
            except:
                pass

        elif chart_type == "histogram":
            val_col = y_col if y_col else x_col
            plt.hist(temp_df[val_col], bins=30, color="#8b5cf6", edgecolor="#161b22")
            plt.axvline(temp_df[val_col].mean(), color='red', linestyle='dashed', linewidth=1, label="Mean")
            plt.axvline(temp_df[val_col].median(), color='yellow', linestyle='dashed', linewidth=1, label="Median")
            plt.legend()

        elif chart_type == "heatmap":
            numeric_df = temp_df.select_dtypes(include=[np.number])
            if not numeric_df.empty:
                corr = numeric_df.corr()
                sns.heatmap(corr, cmap="RdYlBu_r", annot=True, fmt=".2f")
            else:
                return None

        elif chart_type == "box":
            if x_col and y_col:
                sns.boxplot(data=temp_df, x=x_col, y=y_col, palette=COLOR_PALETTE)
            else:
                val_col = y_col if y_col else x_col
                sns.boxplot(y=temp_df[val_col], color="#8b5cf6")

        elif chart_type == "area":
            if agg != "none":
                if agg == "count":
                    plot_data = temp_df.groupby(x_col).size().reset_index(name="Count")
                    y_col = "Count"
                else:
                    plot_data = temp_df.groupby(x_col)[y_col].agg(agg).reset_index()
                plt.fill_between(plot_data[x_col], plot_data[y_col], color="#10b981", alpha=0.3)
                plt.plot(plot_data[x_col], plot_data[y_col], color="#10b981", linewidth=2)
            else:
                plt.fill_between(temp_df[x_col], temp_df[y_col], color="#10b981", alpha=0.3)
                plt.plot(temp_df[x_col], temp_df[y_col], color="#10b981", linewidth=2)

        # Labels & Final Touch
        plt.title(title, fontsize=14, fontweight="bold", color="white", pad=15)
        if x_col:
            plt.xlabel(x_col.replace("_", " ").title())
        if y_col:
            plt.ylabel(y_col.replace("_", " ").title())
            
        plt.grid(True, alpha=0.2)
        plt.tight_layout()
        
        filename = f"{file_id}_{index}_{chart_type}.png"
        save_path = CHART_DIR / filename
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close()
        
        return {
            "index": index,
            "chart_type": chart_type,
            "title": title,
            "x_column": x_col,
            "y_column": y_col,
            "aggregation": agg,
            "reason": chart_config.get("reason", ""),
            "image_url": f"/charts/{filename}",
            "download_url": f"/download/{filename}"
        }

    except Exception as e:
        logger.error(f"Error generating chart {title}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

# --- Endpoints ---

@app.get("/")
async def status():
    return {"status": "ok", "message": "DataLens AI is running"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        ext = Path(file.filename).suffix.lower()
        if ext not in [".csv", ".xlsx", ".xls", ".json"]:
             raise HTTPException(status_code=400, detail="Unsupported file format")

        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOAD_DIR / filename

        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        # Parse with Pandas
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)

        # Column types and Stats
        dtypes = {}
        stats = {}
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                dtypes[col] = "numeric"
                stats[col] = {
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "mean": float(df[col].mean()),
                    "nunique": int(df[col].nunique()),
                    "nulls": int(df[col].isnull().sum())
                }
            elif pd.api.types.is_datetime64_any_dtype(df[col]) or "date" in col.lower():
                dtypes[col] = "datetime"
                stats[col] = {
                    "nunique": int(df[col].nunique()),
                    "nulls": int(df[col].isnull().sum())
                }
            else:
                dtypes[col] = "categorical"
                top_v = df[col].value_counts().head(5).to_dict()
                stats[col] = {
                    "nunique": int(df[col].nunique()),
                    "nulls": int(df[col].isnull().sum()),
                    "top_values": {str(k): int(v) for k, v in top_v.items()}
                }

        row_count = len(df)
        col_count = len(df.columns)
        sample = df.head(5).where(pd.notnull(df), None).to_dict(orient="records")

        return {
            "file_id": file_id,
            "file_path": str(file_path),
            "file_name": file.filename,
            "row_count": row_count,
            "col_count": col_count,
            "columns": df.columns.tolist(),
            "dtypes": dtypes,
            "stats": stats,
            "sample": sample
        }

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Upload failed", "detail": str(e)})

@app.post("/analyze")
async def analyze_data(request: AnalysisRequest = Body(...)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    system_prompt = """You are a senior data analyst and visualization expert. 
Given a dataset schema, recommend 4 to 8 charts that best reveal insights in this data.
Return ONLY a raw JSON array. No markdown, no explanation, no code blocks.
Each item in the array must have exactly these keys:
  chart_type: one of [bar, line, pie, scatter, histogram, heatmap, box, area]
  title: descriptive human-readable title
  x_column: column name string or null
  y_column: column name string or null
  color_column: column name string or null
  aggregation: one of [sum, mean, count, none]
  reason: one sentence explaining why this chart is best for this data"""

    user_prompt = f"""Dataset: {request.row_count} rows, {len(request.columns)} columns.
Column types: {request.dtypes}
Column stats: {request.stats}
Sample rows: {request.sample[:3]}
Recommend the best charts for this data."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514", # Using user requested string
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        raw_json = response.content[0].text
        # Cleanup potential markdown logic just in case
        if "```" in raw_json:
            raw_json = raw_json.split("```")[1]
            if raw_json.startswith("json"):
                raw_json = raw_json[4:]
            raw_json = raw_json.split("```")[0].strip()

        chart_configs = json.loads(raw_json)
        
        # Load DF for generation
        file_path = Path(request.file_path)
        ext = file_path.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)

        generated_charts = []
        for i, config in enumerate(chart_configs):
            res = generate_chart(df, config, request.file_id, i)
            if res:
                generated_charts.append(res)

        # Store in memory
        chart_metadata_store[request.file_id] = generated_charts

        return {
            "file_id": request.file_id,
            "total_charts": len(generated_charts),
            "charts": generated_charts
        }

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        # Retry once if it was a JSON parse error
        return JSONResponse(status_code=500, content={"error": "Analysis failed", "detail": str(e)})

@app.get("/download/{filename}")
async def download_chart(filename: str):
    file_path = CHART_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path, 
        media_type="image/png", 
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/charts/{file_id}")
async def list_charts(file_id: str):
    # Try to get from store first
    if file_id in chart_metadata_store:
        return chart_metadata_store[file_id]
    
    # Fallback scan directory
    charts = []
    for f in CHART_DIR.glob(f"{file_id}_*"):
        charts.append({
            "filename": f.name,
            "image_url": f"/charts/{f.name}",
            "download_url": f"/download/{f.name}",
            # We lose title/type metadata here since it's only in memory
            "chart_type": f.name.split("_")[-1].replace(".png", ""),
            "title": "Generated Chart"
        })
    return charts

@app.get("/charts/{filename}")
async def serve_image(filename: str):
    file_path = CHART_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@app.delete("/cleanup/{file_id}")
async def cleanup(file_id: str):
    try:
        # Delete uploads
        for f in UPLOAD_DIR.glob(f"{file_id}_*"):
            f.unlink()
        # Delete charts
        for f in CHART_DIR.glob(f"{file_id}_*"):
            f.unlink()
        # Remove from store
        if file_id in chart_metadata_store:
            del chart_metadata_store[file_id]
        return {"status": "success", "message": f"Cleaned up files for {file_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("DataLens AI Backend running on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
