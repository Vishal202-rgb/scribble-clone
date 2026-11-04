import { spawn } from 'child_process';
import http from 'http';
import net from 'net';

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

function checkHealth(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Healthcheck timed out'));
    });
  });
}

async function runCycle(cycleNumber) {
  console.log(`\n========================================`);
  console.log(`  CYCLE ${cycleNumber}: START / STOP TEST`);
  console.log(`========================================`);

  // Step 1: Verify port is initially free
  const initiallyFree = await checkPortFree(5000);
  if (!initiallyFree) {
    throw new Error(`Cycle ${cycleNumber}: Port 5000 was not free before starting!`);
  }
  console.log(`✓ Port 5000 verified free before start.`);

  // Step 2: Spawn "npm run dev"
  console.log(`Starting backend with "npm run dev"...`);
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: isWindows
  });

  let output = '';
  child.stdout.on('data', (d) => {
    output += d.toString();
  });
  child.stderr.on('data', (d) => {
    output += d.toString();
  });

  // Step 3: Wait for server to start listening (up to 8 seconds)
  let started = false;
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const isPortBusy = !(await checkPortFree(5000));
    if (isPortBusy) {
      started = true;
      break;
    }
  }

  if (!started) {
    child.kill('SIGKILL');
    console.error('Captured output:', output);
    throw new Error(`Cycle ${cycleNumber}: Server failed to bind port 5000 in time.`);
  }
  console.log(`✓ Backend started and listening on port 5000.`);

  // Step 4: Verify /api/health
  const health = await checkHealth(5000);
  if (health.statusCode !== 200 || health.body.status !== 'ok') {
    throw new Error(`Cycle ${cycleNumber}: /api/health returned unexpected payload: ${JSON.stringify(health)}`);
  }
  console.log(`✓ /api/health responded: status=${health.body.status}, port=${health.body.port}`);

  // Step 5: Stop the process gracefully (SIGINT emulation)
  console.log(`Stopping process via SIGINT (Ctrl+C)...`);
  const exitedPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });

  if (isWindows) {
    // On Windows, kill tree using taskkill /T /F or process.kill
    spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);
  } else {
    child.kill('SIGINT');
  }

  const exitResult = await exitedPromise;
  console.log(`✓ Process exited (code=${exitResult.code}, signal=${exitResult.signal}).`);

  // Step 6: Verify port 5000 is released
  let released = false;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 400));
    if (await checkPortFree(5000)) {
      released = true;
      break;
    }
  }

  if (!released) {
    throw new Error(`Cycle ${cycleNumber}: Port 5000 was NOT released after process exit!`);
  }
  console.log(`✓ Port 5000 confirmed completely released.`);
  console.log(`✓ Cycle ${cycleNumber} PASSED!`);
}

async function main() {
  try {
    for (let c = 1; c <= 3; c++) {
      await runCycle(c);
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`\n======================================================`);
    console.log(`  ALL 3 START / STOP CYCLES COMPLETED SUCCESSFULLY!  `);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Lifecycle test failed:', err);
    process.exit(1);
  }
}

main();
