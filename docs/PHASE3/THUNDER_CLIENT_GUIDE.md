# Thunder Client Guide — Phase 3

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

Use Thunder Client to run manual tests for jobs and assignments. Import the `Thunder-Client-Collection-Phase3.json` file and configure environment variables:

Environment variables to set in Thunder Client:

- `base_url` — e.g., `http://localhost:5020/api`
- `token` — JWT for authenticated requests

Suggested workflow:

1. Import collection
2. Create an employer user and capture token
3. Create a job (POST /api/jobs)
4. Create an assignment (POST /api/assignments)
5. Accept as professional, then start, then complete
