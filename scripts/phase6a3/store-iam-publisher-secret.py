"""Interactive QA credential custody; never prints or accepts a secret in argv."""
import getpass
import os
from pathlib import Path

target = Path.home() / ".secrets/tcdx-grc-qa/iam-publisher-client-secret"
target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
secret = getpass.getpass("Keycloak grc-qa-iam-publisher client secret (hidden): ")
if not secret or any(c.isspace() for c in secret):
    raise SystemExit("INVALID_CREDENTIAL")
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as stream:
    stream.write(secret)
print("CREDENTIAL_STORED=" + str(target))
