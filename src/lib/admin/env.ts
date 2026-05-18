function readEnv(name: string): string {
  const value = import.meta.env[name];

  if (!value || typeof value !== "string") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAdminEnv() {
  return {
    adminPassword: readEnv("ADMIN_PASSWORD"),
    sessionSecret: readEnv("ADMIN_SESSION_SECRET"),

    githubToken: readEnv("GITHUB_TOKEN"),
    githubOwner: readEnv("GITHUB_OWNER"),
    githubRepo: readEnv("GITHUB_REPO"),
    githubBranch: readEnv("GITHUB_BRANCH"),

    githubCommitterName:
      import.meta.env.GITHUB_COMMITTER_NAME || "Site Admin Bot",
    githubCommitterEmail:
      import.meta.env.GITHUB_COMMITTER_EMAIL || "site-admin@example.com",
  };
}
