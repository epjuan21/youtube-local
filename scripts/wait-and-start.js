const { spawn } = require('child_process');
const http = require('http');

function checkVite(retries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get('http://127.0.0.1:5173', (res) => {  // ← Usar 127.0.0.1 en lugar de localhost
        console.log('✓ Vite está listo');
        resolve();
      });
      
      req.on('error', () => {
        if (retries > 0) {
          console.log(`Esperando a Vite... (${retries} intentos restantes)`);
          retries--;
          setTimeout(attempt, 1000);
        } else {
          reject(new Error('Vite no respondió'));
        }
      });
      
      req.end();
    };
    attempt();
  });
}

async function start() {
  try {
    await checkVite();
    console.log('✓ Iniciando Electron...');
    
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    electron.on('close', (code) => {
      console.log(`Electron cerrado con código ${code}`);
      process.exit(code);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

start();