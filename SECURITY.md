# Security

## Reporting vulnerabilities

No private vulnerability-reporting address is configured yet. Until a dedicated security contact is published, report suspected vulnerabilities via [GitHub Issues](https://github.com/muradyanvano1995/use-form/issues) for the `@muradyanvano/use-form` repository.

## Client-side validation is not a security boundary

Browser validation, file-type checks, and DevTools redaction exist for user experience. Attackers can submit anything. Repeat every check on the server, including file size, type, and contents.

## Files and DevTools

The form store keeps `File` / `Blob` identity and does not read file contents. DevTools may still display filenames, which can themselves be sensitive. Use `redactFiles`, `hideFileNames`, or a custom `redact` predicate. Do not paste production user data into the inspector.
