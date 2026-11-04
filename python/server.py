from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat_routes import router
app = FastAPI(title="Wazuh AI Assistant", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")
@app.get("/health")
async def health(): return {"ok": True, "service": "python-ai"}
