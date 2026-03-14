import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'gapt_db'),
        port=int(os.getenv('DB_PORT', 3306))
    )
    print("CONNECTION_SUCCESS")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM registry_academicbatch")
    print(f"BATCH_COUNT:{cursor.fetchone()[0]}")
    conn.close()
except Exception as e:
    print(f"CONNECTION_ERROR: {e}")
