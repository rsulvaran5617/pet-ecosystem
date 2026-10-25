"""Inspect ZIP/Apple binary plist and Android signatures, never print config values."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import zipfile

platform = sys.argv[1]
if platform not in ('android', 'ios'):
    raise ValueError('Expected android or ios')
folder = Path(__file__).parent
root = folder.parents[2]
build = json.loads((folder / f'beta-{platform}.json').read_text())
artifact = root / build['artifact']
report = dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              commit=build['gitCommitHash'], buildId=build['id'], artifact=build['artifact'],
              sha256=hashlib.file_digest(artifact.open('rb'), 'sha256').hexdigest(),
              bytes=artifact.stat().st_size, nativeRuntimeTested=False)
with zipfile.ZipFile(artifact) as archive:
    report['zipCrcValid'] = archive.testzip() is None
    if platform == 'android':
        bundle = archive.read('assets/index.android.bundle')
    else:
        names = [n for n in archive.namelist() if n.startswith('Payload/') and n.endswith('.app/Info.plist') and n.count('/') == 2]
        assert len(names) == 1
        prefix = names[0].removesuffix('Info.plist')
        info = plistlib.loads(archive.read(names[0]))
        report.update(bundleIdentifier=info.get('CFBundleIdentifier'), version=info.get('CFBundleShortVersionString'),
                      buildNumber=info.get('CFBundleVersion'), sdk=info.get('DTSDKName'))
        report['identityMatches'] = (report['bundleIdentifier'], report['version'], report['buildNumber']) == ('com.petecosyst.mobile', build['appVersion'], build['appBuildVersion'])
        report['signaturePresent'] = all(prefix+n in archive.namelist() for n in ['embedded.mobileprovision', '_CodeSignature/CodeResources'])
        report['cryptographicSignatureVerifiedLocally'] = False
        bundle = archive.read(prefix+'main.jsbundle')
    values = {}
    for line in (root/'apps/mobile/.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    report['publicConfigurationMatches'] = all(values.get(key) and values[key].encode() in bundle for key in ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'])
    report['mobileMapPresent'] = b'tiles.openfreemap.org/styles/liberty' in bundle and b'pet-alert-public-points' in bundle
    report['clinicalRequestNoticePresent'] = b'Solicitud de acceso profesional' in bundle and b'Revisar solicitud' in bundle and b'Actualizar solicitudes' in bundle
    report['authorizationAccordionPresent'] = b'Historial de autorizaciones - ' in bundle and b'Mostrar' in bundle and b'Ocultar' in bundle
    report['sosSlicePresent'] = b'set_pet_sos_owner_photo_choice' in bundle and b'publish_pet_alert_lost_pet_safe' in bundle
if platform == 'android':
    sdk = Path(os.environ['LOCALAPPDATA'])/'Android/Sdk/build-tools/35.0.0'
    out = subprocess.run([str(sdk/'aapt.exe'),'dump','badging',str(artifact)],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True).stdout
    match = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",out)
    assert match
    report.update(package=match[1],versionCode=match[2],versionName=match[3])
    report['identityMatches'] = match[1]=='com.petecosystem.mobile' and match[2]==build['appBuildVersion'] and match[3]==build['appVersion']
    report['signaturePresent'] = subprocess.run([str(sdk/'apksigner.bat'),'verify',str(artifact)],capture_output=True).returncode==0
    report['cryptographicSignatureVerifiedLocally'] = report['signaturePresent']
    previous = root/'dist/pilot/android/pet-ecosystem-map-7182daa.apk'
    def certificate_digest(file):
        result = subprocess.run([str(sdk/'apksigner.bat'), 'verify', '--print-certs', str(file)], capture_output=True, text=True, check=True)
        return re.search(r'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]+)', result.stdout).group(1)
    report['signerMatchesPreviousBeta'] = certificate_digest(artifact) == certificate_digest(previous)
report['passed'] = all(report[k] for k in ['zipCrcValid','identityMatches','signaturePresent','publicConfigurationMatches','sosSlicePresent','mobileMapPresent','clinicalRequestNoticePresent','authorizationAccordionPresent'])
if platform == 'android':
    report['passed'] = report['passed'] and report['signerMatchesPreviousBeta']
(folder/f'beta-{platform}-artifact.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(0 if report['passed'] else 1)
