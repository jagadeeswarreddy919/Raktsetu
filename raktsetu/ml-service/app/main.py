import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.prediction import router as prediction_router

app = FastAPI(
    title="RAKTSETU AI Engine Microservice",
    description="Python FastAPI machine learning engine predicting regional blood shortages and ranking eligible donors using Scikit-Learn.",
    version="1.0.0"
)

# CORS configurations for cross-service analytics
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/api/ai", tags=["AI Engine"])

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "RAKTSETU ML/AI Engine",
        "version": "1.0.0",
        "framework": "FastAPI"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
