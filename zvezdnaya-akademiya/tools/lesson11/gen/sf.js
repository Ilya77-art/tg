// Stockfish 17.1 (npm stockfish, WASM) as a UCI child process.
const { spawn } = require('child_process');
const path = require('path');
// npm install stockfish@17.1.0 (in tools/lesson10/eng) or point STOCKFISH_JS at the engine's .js file
const SF = process.env.STOCKFISH_JS || path.join(__dirname, '..', 'eng', 'node_modules', 'stockfish', 'src', 'stockfish-17.1-8e4d048.js');

class Engine {
  constructor(opts = {}) {
    this.p = spawn(process.execPath, [SF], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.buf = ''; this.waiters = [];
    this.p.stdout.on('data', d => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1);
        this.waiters.slice().forEach(w => w(line));
      }
    });
    this.threads = opts.threads || 4; this.hash = opts.hash || 256;
  }
  send(c) { this.p.stdin.write(c + '\n'); }
  until(pred) { return new Promise(res => { const w = line => { if (pred(line)) { this.waiters = this.waiters.filter(x => x !== w); res(line); } }; this.waiters.push(w); }); }
  async init() {
    this.send('uci'); await this.until(l => l === 'uciok');
    this.send(`setoption name Threads value ${this.threads}`);
    this.send(`setoption name Hash value ${this.hash}`);
    this.send('isready'); await this.until(l => l === 'readyok');
  }
  // returns [{uci, cp, mate, pv:[...], depth}] sorted best first, scores from side-to-move's view
  async analyse(fen, { depth = 18, multipv = 1, movetime = 0, moves = null } = {}) {
    this.send('ucinewgame'); this.send('isready'); await this.until(l => l === 'readyok');
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`position fen ${fen}`);
    const lines = {};
    const w = line => {
      if (!line.startsWith('info ') || line.indexOf(' pv ') < 0) return;
      const t = line.split(' ');
      const g = k => { const i = t.indexOf(k); return i >= 0 ? t[i + 1] : null; };
      const mp = +(g('multipv') || 1), d = +g('depth');
      const si = t.indexOf('score');
      const kind = t[si + 1], val = +t[si + 2];
      if (t[si + 3] === 'lowerbound' || t[si + 3] === 'upperbound') return;
      const pv = t.slice(t.indexOf('pv') + 1);
      lines[mp] = { uci: pv[0], cp: kind === 'cp' ? val : null, mate: kind === 'mate' ? val : null, pv, depth: d };
    };
    this.waiters.push(w);
    const go = movetime ? `go movetime ${movetime}` : `go depth ${depth}`;
    this.send(moves ? `${go} searchmoves ${moves.join(' ')}` : go);
    await this.until(l => l.startsWith('bestmove'));
    this.waiters = this.waiters.filter(x => x !== w);
    return Object.keys(lines).sort((a, b) => a - b).map(k => lines[k]);
  }
  quit() { this.send('quit'); }
}
// a comparable number from the side-to-move's view: mates are huge
function val(x) { if (!x) return -1e9; if (x.mate !== null) return x.mate > 0 ? 100000 - x.mate * 10 : -100000 - x.mate * 10; return x.cp; }
function fmt(x) { if (!x) return '?'; return x.mate !== null ? `#${x.mate}` : (x.cp / 100).toFixed(2); }
module.exports = { Engine, val, fmt };
