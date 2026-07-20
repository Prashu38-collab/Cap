from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer,primary_key=True,index=True)
    name = Column(String,nullable=False)
    email = Column(String,unique=True,index=True,nullable=False)
    phone_number = Column(String)
    password = Column(String,nullable=False)
    status = Column(String,default="Inactive")