#!/usr/bin/env python3
"""
scripts/make-ci-keystore.py
─────────────────────────────────────────────────────────────
Creates the *throwaway* signing key that CI falls back to when
no RELEASE_KEYSTORE_BASE64 secret is configured, so that test
installs from the same repository can update each other.

The result (android/ci-debug.p12) is intentionally public:

    alias:    androiddebugkey
    store:    android
    key:      android

Never upload anything signed with it to a store. Configure the
secrets documented in README.md › Releasing for real releases.

    pip install cryptography
    python3 scripts/make-ci-keystore.py [--force]
"""
import argparse
import datetime
import os
import sys

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import pkcs12
    from cryptography import x509
    from cryptography.x509.oid import NameOID
except ImportError:  # pragma: no cover - developer guidance
    print('cryptography is required: pip install cryptography', file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'android', 'ci-debug.p12')

PASSWORD = b'android'
ALIAS = 'androiddebugkey'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true', help='overwrite an existing keystore')
    args = parser.parse_args()

    if os.path.exists(OUT) and not args.force:
        print('· android/ci-debug.p12 already exists (use --force to regenerate)')
        return

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name(
        [
            x509.NameAttribute(NameOID.COMMON_NAME, 'Android Debug'),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Android'),
            x509.NameAttribute(NameOID.COUNTRY_NAME, 'US'),
        ]
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365 * 30))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )

    data = pkcs12.serialize_key_and_certificates(
        ALIAS.encode(),
        key,
        certificate,
        None,
        serialization.BestAvailableEncryption(PASSWORD),
    )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as handle:
        handle.write(data)
    print(f'✔ wrote {os.path.relpath(OUT, ROOT)} ({len(data)} bytes)')


if __name__ == '__main__':
    main()
