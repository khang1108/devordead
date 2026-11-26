from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import init_db
from .routers import admin, assessment, auth, coding, interview, knowledge, profile


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="DevOrDead API",
    version="1.0.0",
    description="Backend FastAPI cho nền tảng luyện tập và mô phỏng phỏng vấn IT DevOrDead (UC01–UC18, BR1–BR4, NFR01–NFR10).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "devordead-backend"}


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(knowledge.router, prefix=API_PREFIX)
app.include_router(coding.router, prefix=API_PREFIX)
app.include_router(interview.router, prefix=API_PREFIX)
app.include_router(assessment.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(interview.ws_router)
