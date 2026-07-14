import uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base
from sqlalchemy import Column, Integer, LargeBinary, ForeignKey, DateTime, func , String


class BinanceCredentials(Base):
    __tablename__ = "binance_credentials"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    api_key_nonce = Column(LargeBinary, nullable=False)
    api_key_ciphertext = Column(LargeBinary, nullable=False)

    api_secret_nonce = Column(LargeBinary, nullable=False)
    api_secret_ciphertext = Column(LargeBinary, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())