"""Static APK checks; never print environment values or claim runtime QA."""
import datetime
import hashlib
import json
import os
import pathlib
import re
import subprocess
import zipfile

root = pathlib.Path(__file__).resolve().parents[3]
apk = root / 'dist/pilot/android/pet-ecosystem-audit-a7b89d3-20260918.apk'
sdk_tools = pathlib.Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/build-tools/35.0.0'
report = {
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'buildId': '795bad45-4d7d-48c1-8d4f-2b889b5071df',
    'commit': 'a7b89d393dccc34d067066ce1521d6bffdb44593',
    'artifact': apk.relative_to(root).as_posix(),
    'bytes': apk.stat().st_size,
    'sha256': hashlib.file_digest(apk.open('rb'), 'sha256').hexdigest(),
    'nativeRuntimeTested': False,
}
with zipfile.ZipFile(apk) as archive:
    report['zipCrcValid'] = archive.testzip() is None
    bundle = archive.read('assets/index.android.bundle')
    values = {}
    for line in (root / 'apps/mobile/.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    for key in ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']:
        report[key + '_matchesConfiguredBuild'] = bool(values.get(key)) and values[key].encode() in bundle
    report['revocationActionPresent'] = b'Revocar permisos pendientes' in bundle

badging = subprocess.run([str(sdk_tools / 'aapt.exe'), 'dump', 'badging', str(apk)], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True).stdout
package = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
if not package:
    raise RuntimeError('Cannot read APK identity')
report.update(package=package[1], versionCode=package[2], versionName=package[3])
report['signatureValid'] = subprocess.run([str(sdk_tools / 'apksigner.bat'), 'verify', str(apk)], capture_output=True).returncode == 0
report['passed'] = all(report[k] for k in ['zipCrcValid', 'signatureValid', 'revocationActionPresent', 'EXPO_PUBLIC_SUPABASE_URL_matchesConfiguredBuild', 'EXPO_PUBLIC_SUPABASE_ANON_KEY_matchesConfiguredBuild']) and report['package'] == 'com.petecosystem.mobile'
destination = pathlib.Path(__file__).parent / 'evidence/android-artifact.json'
destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['passed'] else 1)
