#!/usr/bin/env python3
"""Observe public PostgreSQL TLS certificate. Verification stays enabled and fatal.
No authentication, CA installation, trust-on-first-use, DDL or configuration change.
"""
import subprocess,re,json,time,datetime,hashlib
from pathlib import Path
BASE=Path(__file__).resolve().parent;SSL='/opt/homebrew/opt/openssl@3/bin/openssl'
def main():
 assert not (BASE/'TLS_PUBLIC_INSPECTION.json').exists()
 args=[SSL,'s_client','-starttls','postgres','-connect','192.168.2.40:5432','-showcerts','-verify_return_error','-verify_ip','192.168.2.40']
 start=time.monotonic();p=subprocess.run(args,input='',capture_output=True,text=True,timeout=12)
 certs=re.findall(r'-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----',p.stdout)
 assert certs,'No public certificate obtained; preserve verification failure and stop'
 cert=BASE/'TLS_PUBLIC_CERT_OBSERVED_UNTRUSTED.pem';cert.write_text(certs[0]+'\n')
 def x509(options):
  r=subprocess.run([SSL,'x509','-in',str(cert),'-noout',*options],capture_output=True,text=True);return {'exit_code':r.returncode,'stdout':r.stdout.strip(),'stderr':r.stderr.strip()}
 metadata=x509(['-subject','-issuer','-dates','-serial','-fingerprint','-sha256','-ext','subjectAltName'])
 ip=x509(['-checkip','192.168.2.40'])
 diagnostics=[line for line in (p.stdout+'\n'+p.stderr).splitlines() if any(k in line.lower() for k in ['verify error','verification error','certificate verify failed','self-signed','verify return code'])]
 result={'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':'192.168.2.40:5432 PostgreSQL STARTTLS','openssl_version':subprocess.check_output([SSL,'version']).decode().strip(),'command':args,'duration_seconds':round(time.monotonic()-start,4),'network_exit_code':p.returncode,'verification_fatal':True,'verification_disabled':False,'database_authentication_attempted':False,'public_chain_certificates_presented':len(certs),'certificate_artifact':str(cert),'certificate_pem_sha256':hashlib.sha256(cert.read_bytes()).hexdigest(),'metadata':metadata,'authorized_IP_identity_check':ip,'verification_diagnostics':diagnostics,'trusted_administrative_binding':'NOT_AVAILABLE','trust_installed':'NONE','decision':'BLOCKED_NO_DDL_NO_WINDOW'}
 (BASE/'TLS_PUBLIC_INSPECTION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
