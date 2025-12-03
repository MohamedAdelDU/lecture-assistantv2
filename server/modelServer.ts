/**
 * Model Server Manager
 * Starts and manages Python model server process
 */
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let modelServerProcess: ChildProcess | null = null;
const MODEL_SERVER_PORT = 8765;

function getScriptsDir(): string {
  if (__dirname.includes("dist")) {
    return path.resolve(__dirname, "..", "server", "scripts");
  }
  return path.join(__dirname, "scripts");
}

function getPythonCommand(): string {
  if (process.env.PYTHON_CMD) {
    return process.env.PYTHON_CMD;
  }
  
  const venvPython = path.join(__dirname, "..", "venv", "bin", "python3");
  if (existsSync(venvPython)) {
    return venvPython;
  }
  
  const venvPythonWindows = path.join(__dirname, "..", "venv", "Scripts", "python.exe");
  if (existsSync(venvPythonWindows)) {
    return venvPythonWindows;
  }
  
  return process.platform === "win32" ? "python" : "python3";
}

export function startModelServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (modelServerProcess) {
      console.log("[ModelServer] Server already running");
      resolve();
      return;
    }

    const pythonCmd = getPythonCommand();
    const serverScript = path.join(getScriptsDir(), "model_server.py");
    
    console.log(`[ModelServer] Starting model server: ${pythonCmd} ${serverScript} ${MODEL_SERVER_PORT}`);
    
    modelServerProcess = spawn(pythonCmd, [serverScript, MODEL_SERVER_PORT.toString()], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    let startupTimeout: NodeJS.Timeout;
    let hasStarted = false;

    modelServerProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[ModelServer] ${output.trim()}`);
      
      if (output.includes('Starting model server') && !hasStarted) {
        hasStarted = true;
        clearTimeout(startupTimeout);
        console.log(`[ModelServer] Server started successfully on port ${MODEL_SERVER_PORT}`);
        resolve();
      }
    });

    modelServerProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.error(`[ModelServer] ${output.trim()}`);
      
      if (output.includes('Starting model server') && !hasStarted) {
        hasStarted = true;
        clearTimeout(startupTimeout);
        console.log(`[ModelServer] Server started successfully on port ${MODEL_SERVER_PORT}`);
        resolve();
      }
    });

    modelServerProcess.on('error', (error) => {
      console.error(`[ModelServer] Failed to start: ${error.message}`);
      modelServerProcess = null;
      reject(error);
    });

    modelServerProcess.on('exit', (code) => {
      console.log(`[ModelServer] Server exited with code ${code}`);
      modelServerProcess = null;
    });

    // Timeout after 30 seconds
    startupTimeout = setTimeout(() => {
      if (!hasStarted) {
        console.log(`[ModelServer] Server startup timeout, but continuing anyway`);
        resolve(); // Resolve anyway - server might be starting
      }
    }, 30000);
  });
}

export function stopModelServer(): void {
  if (modelServerProcess) {
    console.log("[ModelServer] Stopping model server");
    modelServerProcess.kill();
    modelServerProcess = null;
  }
}

export function getModelServerUrl(): string {
  return `http://localhost:${MODEL_SERVER_PORT}`;
}

export function isModelServerRunning(): boolean {
  return modelServerProcess !== null;
}

