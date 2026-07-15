import subprocess
import sys
import time
import os
import webbrowser

def main():
    print("="*50)
    print("Starting Local Data Architect...")
    print("="*50)
    
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

    print("[1/2] Starting Python FastAPI Backend...")
    # Launch uvicorn
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=backend_dir,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    
    print("[2/2] Starting React Vite Frontend...")
    # Launch Vite dev server
    frontend_process = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    
    print("\nBoth servers are successfully starting!")
    print("Press Ctrl+C at any time in this window to stop both servers.\n")
    
    # Wait a few seconds for servers to boot, then open the browser automatically
    time.sleep(3)
    webbrowser.open("http://localhost:5173")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    main()
