# kareemelnaggar.com
hello . i am working on my website . Progress is slow but steady

## Engineering portfolio encryption

The plaintext portfolio source is `private/engineering.html`. It is excluded
from Git; do not force-add it or publish it. To create the encrypted page:

1. Run `npm ci` to install the pinned StatiCrypt version.
2. Run `npm run encrypt:engineering`. StatiCrypt will prompt for the password;
   use a long, unique passphrase for better resistance to offline guessing.
3. Publish the generated `engineering.html` and commit the updated
   `.staticrypt.json` salt so future encrypted builds continue to work.

The password is not stored in the repository. For non-interactive builds, pass
it through the `STATICRYPT_PASSWORD` environment variable. The
`STATICRYPT_ALLOW_SHORT_PASSWORD=true` option suppresses StatiCrypt's warning
for short passwords and should only be used when intentionally accepting that
risk.

The password prompt styling is in `staticrypt-overrides.css`. Rebuild the
encrypted page after changing it to update the published prompt.

StatiCrypt encrypts the HTML, not linked images, videos, or PDFs. Those assets
remain publicly accessible at their file URLs; use hosting-level access control
if they also need protection.