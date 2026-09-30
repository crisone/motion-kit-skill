import {spawnSync} from 'node:child_process';
const p=spawnSync(process.env.PAPER_PYTHON||'python3',['-m','unittest','discover','-s','tests','-p','test_*.py'],{stdio:'inherit'});process.exit(p.status??1);
