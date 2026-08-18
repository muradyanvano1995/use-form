# Security

## Reporting vulnerabilities

No private vulnerability-reporting address is configured. The project owner must publish a contact process before a public release. Do not assume GitHub private reporting is enabled.

Until then, treat this file as a placeholder policy, not a mailbox.

## Client-side validation is not a security boundary

Browser validation, file-type checks, and DevTools redaction exist for user experience. Attackers can submit anything. Repeat every check on the server, including file size, type, and contents.

## Files and DevTools

The form store keeps `File` / `Blob` identity and does not read file contents. DevTools may still display filenames, which can themselves be sensitive. Use `redactFiles`, `hideFileNames`, or a custom `redact` predicate. Do not paste production user data into the inspector.
