from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth_router import router as auth_router
from app.controllers.chat_router import router as chat_router
from app.controllers.doctor_router import router as medico_router
from app.controllers.admin_router import router as admin_router
from app.data.db_init import init_db

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="STIGA API",
    description="Sistema de Triaje Inteligente Guiado por IA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(medico_router)
app.include_router(admin_router)
