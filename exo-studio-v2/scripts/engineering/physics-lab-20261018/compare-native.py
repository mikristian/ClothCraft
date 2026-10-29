#!/usr/bin/env python3
"""Isolated same-executable CPU / Metal smoke benchmark on a native macOS host."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import time


def fingerprint(path):
    h = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def run(binary, avatar, backend, steps):
    proc = subprocess.Popen([binary, avatar] + (['--gpu'] if backend == 'gpu' else []),
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, bufsize=1)
    results = []
    try:
        revision = None
        for i in range(steps + 1):
            command = {'op': 'open', 'preset': 'tshirt'} if i == 0 else {'op': 'step', 'steps': 1, 'revision': revision}
            started = time.perf_counter_ns()
            proc.stdin.write(json.dumps(command) + '\n')
            proc.stdin.flush()
            line = proc.stdout.readline()
            elapsed_ms = (time.perf_counter_ns() - started) / 1e6
            if not line:
                raise RuntimeError('session stdout ended: ' + proc.stderr.read()[:2000])
            response = json.loads(line)
            if not response.get('ok'):
                raise RuntimeError(str(response.get('error')))
            data = response['data']
            revision = data['revision']
            seams = [s['gap_m'] for s in data.get('seams', [])]
            metric = data.get('metrics') or {}
            results.append({'step': i, 'simulation_time_s': data.get('time'),
                            'request_wall_ms': elapsed_ms,
                            'backend_claim': data.get('backend'),
                            'vertices': len(data.get('positions', [])),
                            'triangles': len(data.get('triangles', [])),
                            'seams': len(seams), 'seam_gap_max_m': max(seams) if seams else None,
                            'solver_step_ms': metric.get('step_ms'),
                            'gpu_compute_ms': metric.get('gpu_compute_ms'),
                            'extension_p95_percent': metric.get('extension_p95_percent'),
                            'extension_max_percent': metric.get('extension_max_percent'),
                            'contacts': metric.get('contacts'),
                            'minimum_distance_m': metric.get('minimum_distance_m')})
        return {'status': 'measured', 'trajectory': results}
    except Exception as exc:
        return {'status': 'inconclusive', 'error': str(exc), 'trajectory': results}
    finally:
        proc.stdin.close()
        proc.terminate()
        try:
            proc.wait(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('binary')
    parser.add_argument('avatar')
    parser.add_argument('output')
    parser.add_argument('--steps', type=int, default=2)
    args = parser.parse_args()
    if args.steps not in (1, 2, 3):
        parser.error('steps must be 1 to 3')
    capabilities = subprocess.run([args.binary, '--exo-capabilities'], capture_output=True, text=True, timeout=10)
    try:
        features = json.loads(capabilities.stdout)
    except json.JSONDecodeError:
        features = {'error': capabilities.stderr, 'exit_code': capabilities.returncode}
    output = {'schema': 'exo.physics-lab.same-executable.v1',
              'scope': 'transient assembly only; neither equilibrium nor production speed certified',
              'binary_sha256': fingerprint(args.binary), 'avatar_sha256': fingerprint(args.avatar),
              'capabilities': features, 'steps': args.steps,
              'modes': {backend: run(args.binary, args.avatar, backend, args.steps) for backend in ('cpu', 'gpu')},
              'comparison': 'same-executable wall-clock samples; no steady-state performance claims'}
    output['status'] = 'measured_transient_only' if all(m['status'] == 'measured' for m in output['modes'].values()) else 'inconclusive'
    pathlib.Path(args.output).write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({'status': output['status'], 'binary_sha256': output['binary_sha256'],
                      'cpu': output['modes']['cpu']['status'], 'gpu': output['modes']['gpu']['status']}))


if __name__ == '__main__':
    main()
