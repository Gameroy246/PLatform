import subprocess
import sys
import os
import shutil

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    backend_dir = os.path.join(base_dir, "backend")
    
    print("="*50)
    print("Building Local Data Architect Executable...")
    print("="*50)
    
    # 1. Build React Frontend
    print("\n[1/3] Building React Frontend (Vite)...")
    try:
        subprocess.run("npm run build", shell=True, cwd=frontend_dir, check=True)
        print("Frontend built successfully!")
    except subprocess.CalledProcessError:
        print("Error building frontend! Make sure you have Node.js installed.")
        sys.exit(1)
        
    # 2. Install PyInstaller if missing
    print("\n[2/3] Checking PyInstaller...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # 3. Package Backend with PyInstaller
    print("\n[3/3] Packaging Python Backend + Frontend into EXE...")
    pyinstaller_cmd = [
        "pyinstaller",
        "--name", "LocalDataArchitect",
        "--onefile",
        "--add-data", f"../frontend/dist;dist",
        "--hidden-import", "pandas",
        "--hidden-import", "duckdb",
        "--hidden-import", "openpyxl",
        "--hidden-import", "uvicorn",
        "--hidden-import", "fastapi",
        "--hidden-import", "pydantic",
        "--hidden-import", "starlette",
        "--hidden-import", "google.genai",
        "main.py"
    ]
    
    try:
        subprocess.run(pyinstaller_cmd, cwd=backend_dir, check=True, shell=True)
        
        # Move executable to root directory
        exe_path = os.path.join(backend_dir, "dist", "LocalDataArchitect.exe")
        dest_path = os.path.join(base_dir, "LocalDataArchitect.exe")
        
        if os.path.exists(exe_path):
            shutil.move(exe_path, dest_path)
            print(f"\nSUCCESS! Executable created at: {dest_path}")
        else:
            print("\nError: Executable was not found in the dist folder.")
            
    except subprocess.CalledProcessError as e:
        print(f"\nError packaging application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
