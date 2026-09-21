# Security

CrewSpace treats tenant isolation, server-side authorization, private Agent Knowledge, secure sessions, least privilege, and auditability as core product requirements.

## Reporting

Do not disclose security vulnerabilities in public issues. Report them privately to the repository maintainers with reproduction steps, affected versions, and impact.

## Development boundaries

- Never trust client-side role checks.
- Never expose database entities directly from the API.
- Never grant Agents unrestricted tools or private data.
- Never commit credentials, session secrets, or integration tokens.
- Keep local credentials in environment variables and use `.env.example` as the template.
